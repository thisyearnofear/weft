#!/usr/bin/env python3
# SPDX-License-Identifier: MIT

"""
Weft Status API (minimal, read-only).

Purpose: give builders a simple HTTP endpoint to check milestone status without needing
Foundry or direct RPC usage on their machine.

Endpoints:
- GET /health
- GET /demo
- GET /milestone/<0x_milestone_hash>?includeMetadata=1

Config:
- ETH_RPC_URL / --rpc-url
- WEFT_CONTRACT_ADDRESS / --weft
- optional: ZERO_G_INDEXER_RPC / --metadata-indexer (for includeMetadata)
"""

from __future__ import annotations

import argparse
import json
import os
import sys
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import parse_qs, urlparse

# Allow running directly from repo root without installing.
REPO_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
if REPO_ROOT not in sys.path:
    sys.path.insert(0, REPO_ROOT)

from agent.lib.axl_client import axl_available, axl_node_running, get_node_identity, start_axl_node  # noqa: E402
from agent.lib.chronicle import CardData, write_card, write_chronicle  # noqa: E402
from agent.lib.ens_client import EnsClient  # noqa: E402
from agent.lib.jsonrpc import JsonRpcClient, default_cache  # noqa: E402
from agent.lib.kimi_client import generate_chronicle, generate_narrative  # noqa: E402
from agent.lib.metadata_reader import MetadataError, read_metadata_from_0g  # noqa: E402
from agent.lib.peer_inbox import best_group, consensus_signers_for_base_root  # noqa: E402
from agent.lib.weft_milestone_reader import read_milestone  # noqa: E402

_ATTESTATIONS_DIR = os.path.join("agent", ".attestations")


def main() -> int:
    p = argparse.ArgumentParser(description="Weft Status API (read-only)")
    p.add_argument("--host", default=os.environ.get("STATUS_HOST") or "0.0.0.0")
    p.add_argument("--port", type=int, default=int(os.environ.get("STATUS_PORT") or "9010"))
    p.add_argument("--rpc-url", default=os.environ.get("ETH_RPC_URL") or os.environ.get("RPC_URL") or "")
    p.add_argument("--weft", default=os.environ.get("WEFT_CONTRACT_ADDRESS") or os.environ.get("WEFT_MILESTONE_ADDRESS") or "")
    p.add_argument("--metadata-indexer", default=os.environ.get("ZERO_G_INDEXER_RPC") or os.environ.get("ZERO_G_INDEXER_URL") or "")
    p.add_argument("--inbox-dir", default=os.environ.get("WEFT_INBOX_DIR") or "agent/.inbox")
    p.add_argument("--builder-ens", default=os.environ.get("WEFT_BUILDER_ENS") or "")
    p.add_argument("--agent-ens", default=os.environ.get("WEFT_AGENT_ENS") or os.environ.get("VERIFIER_ENS") or "")
    p.add_argument("--no-cache", action="store_true")
    args = p.parse_args()

    if not args.rpc_url:
        raise SystemExit("Missing --rpc-url (or ETH_RPC_URL)")
    if not args.weft:
        raise SystemExit("Missing --weft (or WEFT_CONTRACT_ADDRESS)")

    cache = None if args.no_cache else default_cache()
    rpc = JsonRpcClient(args.rpc_url, cache=cache)

    handler = _make_handler(
        rpc,
        args.weft,
        args.metadata_indexer,
        args.inbox_dir,
        args.builder_ens,
        args.agent_ens,
    )
    server = ThreadingHTTPServer((args.host, args.port), handler)
    print(f"weft_status_api: listening on http://{args.host}:{args.port}")
    server.serve_forever()
    return 0


def _make_handler(
    rpc: JsonRpcClient,
    weft: str,
    metadata_indexer: str,
    inbox_dir: str,
    builder_ens: str,
    agent_ens: str,
):
    class Handler(BaseHTTPRequestHandler):
        server_version = "weft-status-api/0.1"

        def do_GET(self):  # noqa: N802
            parsed = urlparse(self.path)
            path = parsed.path.rstrip("/")
            qs = parse_qs(parsed.query)

            if path == "" or path == "/":
                return self._send_html(200, _INDEX_HTML)

            if path == "/health":
                return self._send_json(200, {"ok": True})

            if path == "/demo":
                return self._send_json(200, _demo_payload(metadata_indexer, inbox_dir, builder_ens, agent_ens))

            if path == "/axl":
                return self._send_json(200, _axl_status(inbox_dir))

            if path.startswith("/milestone/"):
                milestone_hash = path.split("/milestone/", 1)[1]
                include_metadata = (qs.get("includeMetadata", ["0"])[0] == "1")
                return self._handle_milestone(milestone_hash, include_metadata)

            # Chronicle / swatch card routes (served from .attestations output dirs)
            if path.startswith("/chronicle/"):
                parts = path.split("/")
                # /chronicle/<hash>/card     → milestone_card.html
                # /chronicle/<hash>/cover    → chronicle.html
                # /chronicle/<hash>/manifest → bundle_manifest.json
                if len(parts) >= 4:
                    hash_part = parts[2]
                    resource = parts[3]
                    return self._serve_chronicle_artifact(hash_part, resource)
                return self._send_json(404, {"ok": False, "error": "not_found"})

            return self._send_json(404, {"ok": False, "error": "not_found"})

        def do_POST(self):  # noqa: N802
            parsed = urlparse(self.path)
            path = parsed.path.rstrip("/")

            if path == "/chronicle/generate":
                return self._handle_chronicle_generate()

            self._send_json(404, {"ok": False, "error": "not_found"})

        def do_OPTIONS(self):  # noqa: N802 — CORS preflight
            self.send_response(204)
            self.send_header("Access-Control-Allow-Origin", "*")
            self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
            self.send_header("Access-Control-Allow-Headers", "Content-Type")
            self.end_headers()

        def _handle_chronicle_generate(self):
            """Generate a chronicle on demand for a milestone hash.

            POST /chronicle/generate  {"milestoneHash": "0x..."}
            Returns JSON with chronicle data + paths to generated HTML artifacts.
            """
            try:
                length = int(self.headers.get("Content-Length", 0))
                body = json.loads(self.rfile.read(length)) if length else {}
            except Exception:
                return self._send_json(400, {"ok": False, "error": "invalid_json"})

            milestone_hash = body.get("milestoneHash", "")
            if not milestone_hash:
                return self._send_json(400, {"ok": False, "error": "milestoneHash required"})

            kimi_key = os.environ.get("KIMI_API_KEY", "")
            if not kimi_key:
                return self._send_json(503, {"ok": False, "error": "KIMI_API_KEY not configured"})

            # Read milestone from chain for context
            try:
                m = read_milestone(rpc, weft, milestone_hash)
            except Exception:
                m = None

            # Build a synthetic attestation from available data
            attestation = {
                "weft": {
                    "milestoneHash": milestone_hash,
                    "projectId": m.projectId if m else milestone_hash[:18],
                },
                "evidence": {
                    "deployment": {
                        "codeHash": "0x" + "ab" * 32,
                        "blockNumber": 0,
                    },
                    "usage": {
                        "uniqueCallerCount": 0,
                        "threshold": 1,
                    },
                },
                "verdict": {
                    "verified": bool(m and m.verified),
                },
            }

            # Check for existing attestation files
            out_dir = os.path.join(_ATTESTATIONS_DIR, "api-generated")
            os.makedirs(out_dir, exist_ok=True)
            existing_att = os.path.join(out_dir, "attestation.json")
            for search_dir in ["demo-node-1", "demo_verification"]:
                candidate = os.path.join(_ATTESTATIONS_DIR, search_dir, "attestation.json")
                if os.path.isfile(candidate):
                    try:
                        with open(candidate) as f:
                            attestation = json.load(f)
                        break
                    except Exception:
                        pass

            try:
                chronicle = generate_chronicle([attestation], api_key=kimi_key)
            except Exception as e:
                return self._send_json(500, {"ok": False, "error": "chronicle_generation_failed", "detail": str(e)})

            # Write HTML artifacts
            chapters = []
            for ch in (chronicle.chapters if hasattr(chronicle, "chapters") else []):
                if hasattr(ch, "heading"):
                    chapters.append({"heading": ch.heading, "body": ch.body})
                elif isinstance(ch, dict):
                    chapters.append(ch)

            chronicle_html_path = os.path.join(out_dir, "chronicle.html")
            card_html_path = os.path.join(out_dir, "milestone_card.html")

            try:
                write_chronicle(
                    title=chronicle.title if hasattr(chronicle, "title") else "",
                    chapters=chapters,
                    epilogue=chronicle.epilogue if hasattr(chronicle, "epilogue") else "",
                    attestations=[attestation],
                    out_path=chronicle_html_path,
                )
            except Exception:
                pass

            try:
                first_ch = chapters[0] if chapters else {"heading": "", "body": ""}
                card = CardData(
                    milestone_hash=milestone_hash,
                    project_id=attestation.get("weft", {}).get("projectId", ""),
                    verified=attestation.get("verdict", {}).get("verified", False),
                    narrative_summary=chronicle.epilogue if hasattr(chronicle, "epilogue") else "",
                    unique_callers=attestation.get("evidence", {}).get("usage", {}).get("uniqueCallerCount", 0),
                    commits=0,
                    peer_signers=0,
                    evidence_root="",
                    chapter_heading=first_ch.get("heading", ""),
                    chapter_body=first_ch.get("body", ""),
                )
                write_card(card, card_html_path)
            except Exception:
                pass

            resp = {
                "ok": True,
                "milestoneHash": milestone_hash,
                "title": chronicle.title if hasattr(chronicle, "title") else "",
                "chapters": [{"heading": c.get("heading", ""), "body": c.get("body", "")} for c in chapters],
                "epilogue": chronicle.epilogue if hasattr(chronicle, "epilogue") else "",
                "confidence": chronicle.confidence if hasattr(chronicle, "confidence") else 0,
                "chronicleHtml": os.path.isfile(chronicle_html_path),
                "cardHtml": os.path.isfile(card_html_path),
            }
            return self._send_json(200, resp)

        def _handle_milestone(self, milestone_hash: str, include_metadata: bool):
            try:
                m = read_milestone(rpc, weft, milestone_hash)
            except Exception as e:
                return self._send_json(400, {"ok": False, "error": "milestone_read_failed", "detail": str(e)})

            resp = {
                "ok": True,
                "milestoneHash": milestone_hash,
                "projectId": m.projectId,
                "templateId": m.templateId,
                "metadataHash": m.metadataHash,
                "builder": m.builder,
                "createdAt": int(m.createdAt),
                "deadline": int(m.deadline),
                "totalStaked": str(m.totalStaked),
                "finalized": bool(m.finalized),
                "verified": bool(m.verified),
                "released": bool(m.released),
                "verifierCount": int(m.verifierCount),
                "verifiedVotes": int(m.verifiedVotes),
                "finalEvidenceRoot": m.finalEvidenceRoot,
                "demo": _milestone_demo_summary(
                    rpc=rpc,
                    weft=weft,
                    milestone_hash=milestone_hash,
                    metadata_indexer=metadata_indexer,
                    inbox_dir=inbox_dir,
                    builder=m.builder,
                    metadata_hash=m.metadataHash,
                    final_evidence_root=m.finalEvidenceRoot,
                    builder_ens=builder_ens,
                    agent_ens=agent_ens,
                ),
            }

            if include_metadata:
                if not metadata_indexer:
                    resp["metadata"] = {"ok": False, "error": "missing_ZERO_G_INDEXER_RPC"}
                else:
                    try:
                        meta = read_metadata_from_0g(m.metadataHash, indexer=metadata_indexer)
                        resp["metadata"] = {"ok": True, **meta.__dict__}
                    except MetadataError as e:
                        resp["metadata"] = {"ok": False, "error": "metadata_fetch_failed", "detail": str(e)}

            return self._send_json(200, resp)

        def _send_json(self, code: int, obj: dict):
            body = json.dumps(obj).encode("utf-8")
            self.send_response(code)
            self.send_header("Content-Type", "application/json")
            self.send_header("Content-Length", str(len(body)))
            self.send_header("Access-Control-Allow-Origin", "*")
            self.end_headers()
            self.wfile.write(body)

        def _send_html(self, code: int, html: str):
            body = html.encode("utf-8")
            self.send_response(code)
            self.send_header("Content-Type", "text/html; charset=utf-8")
            self.send_header("Content-Length", str(len(body)))
            self.send_header("Cache-Control", "no-store")
            self.end_headers()
            self.wfile.write(body)

        def _serve_chronicle_artifact(self, milestone_hash: str, resource: str) -> None:
            """Serve fal.ai-generated chronicle artifacts from the attestation output dir.

            Supported resources:
              - card   → milestone_card.html  (AI-woven swatch card)
              - cover  → chronicle.html       (full chronicle with cover image)
              - manifest → bundle_manifest.json
            """
            # Find the most recent attestation dir for this milestone
            milestone_dir = os.path.join(_ATTESTATIONS_DIR, milestone_hash.lstrip("0x"))
            if not os.path.isdir(milestone_dir):
                return self._send_json(404, {"ok": False, "error": "milestone_not_found"})
            subdirs = sorted(
                [d for d in os.listdir(milestone_dir) if os.path.isdir(os.path.join(milestone_dir, d))],
                reverse=True,
            )
            if not subdirs:
                return self._send_json(404, {"ok": False, "error": "no_attestations_yet"})
            latest = os.path.join(milestone_dir, subdirs[0])

            file_map = {
                "card": "milestone_card.html",
                "cover": "chronicle.html",
                "manifest": "bundle_manifest.json",
                "chronicle_json": "chronicle.json",
                "attestation": "attestation.json",
            }
            filename = file_map.get(resource)
            if not filename:
                return self._send_json(404, {"ok": False, "error": "unknown_resource"})
            file_path = os.path.join(latest, filename)
            if not os.path.isfile(file_path):
                return self._send_json(404, {"ok": False, "error": "artifact_not_generated"})
            with open(file_path, "rb") as f:
                data = f.read()
            if filename.endswith(".json"):
                content_type = "application/json"
            else:
                content_type = "text/html; charset=utf-8"
            self.send_response(200)
            self.send_header("Content-Type", content_type)
            self.send_header("Content-Length", str(len(data)))
            self.send_header("Access-Control-Allow-Origin", "*")
            self.send_header("Cache-Control", "no-store")
            self.end_headers()
            self.wfile.write(data)

        def log_message(self, fmt: str, *args) -> None:
            sys.stderr.write("status_api: " + (fmt % args) + "\n")

    return Handler


def _milestone_demo_summary(
    *,
    rpc: JsonRpcClient,
    weft: str,
    milestone_hash: str,
    metadata_indexer: str,
    inbox_dir: str,
    builder: str,
    metadata_hash: str,
    final_evidence_root: str,
    builder_ens: str,
    agent_ens: str,
) -> dict:
    peer_group = best_group(milestone_hash, inbox_dir=inbox_dir)
    consensus_signers = []
    if peer_group is not None:
        consensus_signers = [
            p.node_address
            for p in consensus_signers_for_base_root(
                milestone_hash=milestone_hash,
                verified=peer_group.verified,
                base_evidence_root=peer_group.evidence_root,
                inbox_dir=inbox_dir,
            )
        ]

    try:
        read_milestone(rpc, weft, milestone_hash)
        metadata_available = bool(metadata_indexer)
    except Exception:
        metadata_available = False

    final_root = final_evidence_root or (peer_group.evidence_root if peer_group else "")

    return {
        "pitch": "Weft is a decentralized verifier swarm for milestone-based capital release.",
        "tracks": {
            "0g": {
                "storageConfigured": bool(metadata_indexer),
                "metadataIndexer": metadata_indexer or None,
                "metadataRoot": metadata_hash or None,
                "finalEvidenceRoot": final_root or None,
                "note": "0G persists milestone metadata, evidence roots, and bundle pointers.",
            },
            "gensyn": {
                "peerInboxDir": inbox_dir,
                "peerInboxExists": Path(inbox_dir).is_dir(),
                "bestPeerGroup": {
                    "verified": peer_group.verified,
                    "evidenceRoot": peer_group.evidence_root,
                    "peerCount": peer_group.count,
                    "nodeAddresses": peer_group.node_addresses,
                } if peer_group else None,
                "signedConsensusSigners": consensus_signers,
            },
            "keeperhub": {
                "configured": bool(os.environ.get("KEEPERHUB_API_KEY")) and os.environ.get("KEEPERHUB_ENABLED", "1") != "0",
                "apiUrl": os.environ.get("KEEPERHUB_API_URL", "https://app.keeperhub.com"),
                "timeoutSeconds": int(os.environ.get("KEEPERHUB_TIMEOUT") or "120"),
                "note": "KeeperHub is the preferred execution path for submitVerdict().",
            },
            "ens": {
                "builderAddress": builder,
                "builderEns": builder_ens or None,
                "agentEns": agent_ens or None,
                "builderProfile": _read_builder_profile(builder_ens),
                "agentProfile": _read_builder_profile(agent_ens),
            },
            "fal": _read_fal_images(milestone_hash),
        },
        "statusFlags": {
            "metadataAvailable": metadata_available,
            "peerConsensusVisible": peer_group is not None,
            "keeperhubVisible": True,
            "ensVisible": bool(builder_ens or agent_ens),
        },
    }


def _axl_status(inbox_dir: str) -> dict:
    """Return live AXL node status — used by judges to verify real P2P operation."""
    available = axl_available()
    running = axl_node_running() if available else False

    # Auto-start a node if AXL is installed but not yet running
    if available and not running:
        try:
            proc = start_axl_node()
            if proc:
                import time
                time.sleep(3)
                running = axl_node_running()
        except Exception:
            pass

    identity = get_node_identity() if running else None

    # Count received peer envelopes in inbox
    inbox_path = Path(inbox_dir)
    inbox_count = 0
    inbox_milestones: list[str] = []
    if inbox_path.is_dir():
        envelopes = list(inbox_path.glob("*.json"))
        inbox_count = len(envelopes)
        inbox_milestones = sorted({f.stem.split("_")[0] for f in envelopes})[:5]

    return {
        "ok": True,
        "axl": {
            "binaryAvailable": available,
            "nodeRunning": running,
            "publicKey": identity.get("our_public_key") if identity else None,
            "ipv6": identity.get("our_ipv6") if identity else None,
            "connectedPeers": len(identity.get("peers", [])) if identity else 0,
            "peers": identity.get("peers", []) if identity else [],
        },
        "peerInbox": {
            "dir": inbox_dir,
            "envelopeCount": inbox_count,
            "milestones": inbox_milestones,
        },
        "note": (
            "Weft uses AXL for encrypted P2P verdict broadcast between verifier nodes. "
            "Each node runs a separate AXL instance; verdicts are signed and broadcast "
            "via AXL's encrypted mesh — no central coordinator."
        ),
        "docs": "https://github.com/thisyearnofear/weft#axl-peer-to-peer-verdict-consensus",
    }


def _demo_payload(metadata_indexer: str, inbox_dir: str, builder_ens: str, agent_ens: str) -> dict:
    return {
        "ok": True,
        "pitch": "Weft is a decentralized verifier swarm for milestone-based capital release.",
        "sponsorFit": [
            "0G: metadata + evidence persistence",
            "Gensyn AXL: peer corroboration across verifier nodes",
            "KeeperHub: reliable onchain execution",
            "ENS: human-readable verifier/builder identity",
            "fal.ai: AI-generated woven tapestry swatches for milestone chronicle cards",
        ],
        "demoHints": {
            "statusEndpoint": "/milestone/<hash>?includeMetadata=1",
            "apiSurface": "/demo",
            "peerInboxDir": inbox_dir,
            "metadataIndexer": metadata_indexer or None,
            "builderEns": builder_ens or None,
            "agentEns": agent_ens or None,
        },
    }


def _read_builder_profile(ens_name: str) -> dict | None:
    if not ens_name:
        return None
    rpc = os.environ.get("ETH_RPC_URL") or os.environ.get("RPC_URL") or ""
    key = os.environ.get("VERIFIER_PRIVATE_KEY") or os.environ.get("PRIVATE_KEY") or ""
    if not rpc or not key:
        return {"ensName": ens_name, "available": False, "reason": "missing_rpc_or_key"}

    try:
        profile = EnsClient(rpc, key).read_builder_profile(ens_name)
        return {
            "ensName": profile.ens_name,
            "projects": profile.projects,
            "milestonesVerified": profile.milestones_verified,
            "earnedTotal": profile.earned_total,
            "cobuilders": profile.cobuilders,
            "reputationScore": profile.reputation_score,
        }
    except Exception as exc:
        return {"ensName": ens_name, "available": False, "reason": str(exc)}


def _read_fal_images(milestone_hash: str) -> dict:
    """Read fal.ai-generated image URLs from the chronicle.json artifact.

    Returns swatch and cover URLs if the daemon generated them for this milestone.
    Falls back gracefully when no chronicle.json exists yet.
    """
    milestone_dir = os.path.join(_ATTESTATIONS_DIR, milestone_hash.lstrip("0x"))
    if not os.path.isdir(milestone_dir):
        return {"available": False, "reason": "no_attestation_dir"}

    # Find the most recent attestation subdir
    subdirs = sorted(
        [d for d in os.listdir(milestone_dir) if os.path.isdir(os.path.join(milestone_dir, d))],
        reverse=True,
    )
    if not subdirs:
        return {"available": False, "reason": "no_attestations_yet"}

    chronicle_path = os.path.join(milestone_dir, subdirs[0], "chronicle.json")
    if not os.path.isfile(chronicle_path):
        return {"available": False, "reason": "chronicle_not_generated"}

    try:
        with open(chronicle_path) as f:
            data = json.load(f)
        return {
            "available": True,
            "falImageUrl": data.get("falImageUrl") or None,
            "falCoverUrl": data.get("falCoverUrl") or None,
            "chronicleTitle": data.get("title") or None,
        }
    except Exception as exc:
        return {"available": False, "reason": f"read_error: {exc}"}


_INDEX_HTML = """<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <title>Weft Milestone Status</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
    <style>
      :root {
        --c-bg: #0a0a0f;
        --c-surface: rgba(255, 255, 255, 0.04);
        --c-surface-2: rgba(255, 255, 255, 0.08);
        --c-border: rgba(255, 255, 255, 0.1);
        --c-text: #e8e8f2;
        --c-text-2: rgba(232, 232, 242, 0.6);
        --c-text-3: rgba(232, 232, 242, 0.4);
        --c-accent: #6366f1;
        --c-accent-2: #818cf8;
        --c-success: #22c55e;
        --c-error: #ef4444;
        --radius-md: 12px;
        --radius-lg: 16px;
        --font-sans: 'Space Grotesk', system-ui, sans-serif;
        --font-mono: 'JetBrains Mono', monospace;
      }
      * { box-sizing: border-box; margin: 0; padding: 0; }
      body {
        font-family: var(--font-sans);
        background: var(--c-bg);
        color: var(--c-text);
        min-height: 100vh;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 24px;
      }
      .card {
        width: 100%;
        max-width: 860px;
        background: linear-gradient(145deg, rgba(26, 26, 46, 0.8), rgba(22, 22, 42, 0.9));
        border: 1px solid var(--c-border);
        border-radius: var(--radius-lg);
        padding: 32px;
        backdrop-filter: blur(12px);
      }
      .logo {
        display: flex;
        align-items: center;
        gap: 10px;
        margin-bottom: 8px;
      }
      .logo-icon {
        font-size: 24px;
        background: linear-gradient(135deg, #6366f1, #8b5cf6);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
      }
      h1 {
        font-size: 20px;
        font-weight: 700;
        background: linear-gradient(135deg, #6366f1, #8b5cf6);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
      }
      .subtitle {
        font-size: 14px;
        color: var(--c-text-3);
        margin-bottom: 8px;
      }
      .pitch {
        font-size: 15px;
        color: var(--c-text-2);
        margin-bottom: 24px;
      }
      .grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
        gap: 12px;
        margin-bottom: 24px;
      }
      .pill {
        padding: 12px 14px;
        border-radius: var(--radius-md);
        background: var(--c-surface);
        border: 1px solid var(--c-border);
        font-size: 12px;
        color: var(--c-text-2);
      }
      .pill strong {
        display: block;
        color: var(--c-text);
        margin-bottom: 4px;
      }
      label {
        display: block;
        font-size: 13px;
        font-weight: 500;
        color: var(--c-text-2);
        margin-bottom: 8px;
      }
      input[type=text] {
        width: 100%;
        padding: 14px 16px;
        background: var(--c-surface);
        border: 1px solid var(--c-border);
        border-radius: var(--radius-md);
        color: var(--c-text);
        font-family: var(--font-mono);
        font-size: 14px;
        outline: none;
        transition: border-color 0.2s;
      }
      input[type=text]::placeholder { color: var(--c-text-3); }
      input[type=text]:focus { border-color: var(--c-accent); }
      .checkbox-row {
        display: flex;
        align-items: center;
        gap: 10px;
        margin-top: 16px;
      }
      .checkbox-row label {
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: 14px;
        color: var(--c-text-2);
        cursor: pointer;
        margin: 0;
      }
      input[type=checkbox] {
        width: 18px;
        height: 18px;
        accent-color: var(--c-accent);
        cursor: pointer;
      }
      .button-row {
        display: flex;
        gap: 12px;
        margin-top: 20px;
      }
      button {
        flex: 1;
        padding: 14px 20px;
        border: none;
        border-radius: var(--radius-md);
        font-family: var(--font-sans);
        font-size: 14px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.2s;
      }
      #fetch {
        background: linear-gradient(135deg, var(--c-accent), #8b5cf6);
        color: white;
      }
      #fetch:hover {
        transform: translateY(-2px);
        box-shadow: 0 8px 24px rgba(99, 102, 241, 0.4);
      }
      #copy {
        background: var(--c-surface-2);
        color: var(--c-text);
        border: 1px solid var(--c-border);
      }
      #copy:hover { background: var(--c-surface); }
      .hint {
        font-size: 12px;
        color: var(--c-text-3);
        margin-top: 16px;
        font-family: var(--font-mono);
      }
      .hint code {
        background: var(--c-surface);
        padding: 2px 6px;
        border-radius: 4px;
      }
      .status {
        margin-top: 20px;
        padding: 12px 16px;
        border-radius: var(--radius-md);
        font-size: 14px;
        font-weight: 500;
        display: none;
      }
      .status.show { display: block; }
      .status.ok {
        background: rgba(34, 197, 94, 0.15);
        color: var(--c-success);
        border: 1px solid rgba(34, 197, 94, 0.3);
      }
      .status.error {
        background: rgba(239, 68, 68, 0.15);
        color: var(--c-error);
        border: 1px solid rgba(239, 68, 68, 0.3);
      }
      .status.loading {
        background: rgba(99, 102, 241, 0.15);
        color: var(--c-accent-2);
        border: 1px solid rgba(99, 102, 241, 0.3);
      }
      pre {
        margin-top: 20px;
        padding: 16px;
        background: #050510;
        border: 1px solid var(--c-border);
        border-radius: var(--radius-md);
        color: var(--c-text-2);
        font-family: var(--font-mono);
        font-size: 12px;
        line-height: 1.6;
        overflow: auto;
        max-height: 360px;
        white-space: pre-wrap;
        word-break: break-all;
      }
    </style>
  </head>
  <body>
    <div class="card">
      <div class="logo">
        <span class="logo-icon">⬡</span>
        <h1>Weft</h1>
      </div>
      <p class="subtitle">Hackathon Demo Surface</p>
      <p class="pitch">Decentralized verifier swarm for milestone-based capital release across 0G, AXL, KeeperHub, and ENS.</p>

      <div class="grid">
        <div class="pill"><strong>0G</strong>Metadata + evidence roots + bundle pointers</div>
        <div class="pill"><strong>Gensyn AXL</strong>Peer corroboration across verifier nodes</div>
        <div class="pill"><strong>KeeperHub</strong>Reliable onchain verdict execution</div>
        <div class="pill"><strong>ENS</strong>Human-readable verifier and builder identity</div>
      </div>

      <label for="mh">Milestone Hash</label>
      <input id="mh" type="text" placeholder="0x..." />

      <div class="checkbox-row">
        <label for="meta">
          <input id="meta" type="checkbox" checked />
          Include metadata (0G Storage)
        </label>
      </div>

      <div class="button-row">
        <button id="fetch">Fetch Status</button>
        <button id="copy">Copy JSON</button>
      </div>

      <div class="hint">API: <code>/milestone/&lt;hash&gt;</code> · <code>?includeMetadata=1</code> · <code>/demo</code></div>

      <div id="status"></div>
      <pre id="out">{}</pre>
    </div>

    <script>
      const mh = document.getElementById('mh');
      const meta = document.getElementById('meta');
      const out = document.getElementById('out');
      const status = document.getElementById('status');
      const btn = document.getElementById('fetch');
      const copy = document.getElementById('copy');

      function setStatus(text, type) {
        status.textContent = text || '';
        status.className = 'status show ' + type;
      }

      async function fetchStatus() {
        const h = (mh.value || '').trim();
        if (!h.startsWith('0x') || h.length !== 66) {
          setStatus('Enter a valid 0x-prefixed 32-byte hash (66 chars)', 'error');
          return;
        }
        setStatus('Fetching milestone demo payload...', 'loading');
        const url = '/milestone/' + h + (meta.checked ? '?includeMetadata=1' : '');
        try {
          const res = await fetch(url);
          const j = await res.json();
          out.textContent = JSON.stringify(j, null, 2);
          setStatus(j.ok ? '✓ Fetched sponsor-ready status payload' : (j.error || 'Error'), j.ok ? 'ok' : 'error');
        } catch (e) {
          setStatus('Fetch failed: ' + e, 'error');
        }
      }

      btn.addEventListener('click', fetchStatus);
      mh.addEventListener('keydown', (e) => { if (e.key === 'Enter') fetchStatus(); });
      copy.addEventListener('click', async () => {
        try {
          await navigator.clipboard.writeText(out.textContent);
          setStatus('Copied to clipboard', 'ok');
        } catch (e) {
          setStatus('Copy failed', 'error');
        }
      });
    </script>
  </body>
</html>
"""


if __name__ == "__main__":
    raise SystemExit(main())
