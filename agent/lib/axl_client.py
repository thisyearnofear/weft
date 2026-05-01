#!/usr/bin/env python3
# SPDX-License-Identifier: MIT

"""
AXL transport client for multi-verifier coordination.

Routes peer broadcasts through a local AXL node for encrypted, decentralized
P2P communication. Each verifier daemon talks to localhost; AXL handles
encryption, routing, and peer discovery across the mesh.

Integration modes (selected automatically):
1. AXL node running locally → route through localhost HTTP API (/send, /recv)
2. Fallback → best-effort raw HTTP POST to peers (legacy stub behavior)

AXL HTTP API (per docs/api.md in gensyn-ai/axl):
  POST /send   — fire-and-forget to peer (X-Destination-Peer-Id header, raw body)
  GET  /recv   — poll inbound messages (returns raw body + X-From-Peer-Id header)
  GET  /topology — node info (our_ipv6, our_public_key, peers, tree)

Env vars:
  AXL_PEERS          comma-separated peer IDs (hex public keys) or HTTP URLs (legacy)
  AXL_BINARY         path to axl binary (default: "axl" on PATH)
  AXL_PORT           local AXL node HTTP port (default: 9002)
  AXL_BRIDGE_ADDR    local AXL node bind address (default: "127.0.0.1")
  AXL_SIGN           sign envelopes (default: "1")
  AXL_ENDPOINT_PATH  HTTP endpoint path for legacy mode (default: "/send")
  AXL_USE_BINARY     force AXL mode "1" or force legacy "0" (default: auto-detect)
  AXL_CONFIG         path to node-config.json for start_axl_node (default: auto-generated)
  AXL_PRIVATE_KEY_PATH  path to ed25519 PEM key for AXL node identity
"""

from __future__ import annotations

import json
import os
import shutil
import subprocess
import tempfile
import time
import urllib.request
from dataclasses import dataclass
from typing import Any, Dict, List, Optional

from .verdict_envelope import build_verdict_envelope, sign_envelope


# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------

def _axl_binary() -> str:
    return os.environ.get("AXL_BINARY", "axl")


def _axl_port() -> int:
    return int(os.environ.get("AXL_PORT", "9002"))


def _axl_bridge_addr() -> str:
    return os.environ.get("AXL_BRIDGE_ADDR", "127.0.0.1")


def _axl_base_url() -> str:
    return f"http://{_axl_bridge_addr()}:{_axl_port()}"


def _axl_use_binary() -> Optional[bool]:
    """Return True to force AXL, False to force legacy, None for auto-detect."""
    val = os.environ.get("AXL_USE_BINARY", "")
    if val == "1":
        return True
    if val == "0":
        return False
    return None


def axl_available() -> bool:
    """Check if AXL is available (node running or binary on PATH)."""
    if axl_node_running():
        return True
    binary = _axl_binary()
    return shutil.which(binary) is not None


def axl_node_running() -> bool:
    """Check if a local AXL node is actively running and responding."""
    try:
        url = f"{_axl_base_url()}/topology"
        req = urllib.request.Request(url, method="GET")
        with urllib.request.urlopen(req, timeout=3) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            return "our_public_key" in data
    except Exception:
        return False


def get_node_identity() -> Optional[Dict[str, Any]]:
    """Get this node's identity from the local AXL node (public key, IPv6)."""
    try:
        url = f"{_axl_base_url()}/topology"
        req = urllib.request.Request(url, method="GET")
        with urllib.request.urlopen(req, timeout=3) as resp:
            return json.loads(resp.read().decode("utf-8"))
    except Exception:
        return None


def _use_axl_transport() -> bool:
    """Decide whether to use AXL transport or legacy HTTP mode."""
    forced = _axl_use_binary()
    if forced is not None:
        return forced
    return axl_node_running()


# ---------------------------------------------------------------------------
# Types
# ---------------------------------------------------------------------------

@dataclass(frozen=True)
class BroadcastResult:
    attempted: int
    succeeded: int
    mode: str = "legacy"  # "axl" or "legacy"


@dataclass(frozen=True)
class VerdictMessage:
    milestone_hash: str
    verified: bool
    evidence_root: str
    node_address: str
    timestamp: int


# ---------------------------------------------------------------------------
# Peer parsing
# ---------------------------------------------------------------------------

def parse_peers(peers: Optional[str] = None) -> List[str]:
    raw = peers if peers is not None else (os.environ.get("AXL_PEERS") or "")
    items = [p.strip() for p in raw.split(",") if p.strip()]
    return items


def _is_axl_peer_id(peer: str) -> bool:
    """Check if a peer string looks like a hex-encoded AXL public key (64 hex chars)."""
    if peer.startswith("http://") or peer.startswith("https://"):
        return False
    cleaned = peer.strip()
    return len(cleaned) == 64 and all(c in "0123456789abcdefABCDEF" for c in cleaned)


# ---------------------------------------------------------------------------
# AXL HTTP API transport (real AXL node)
# ---------------------------------------------------------------------------

def _axl_send(peer_id: str, payload: Dict[str, Any]) -> bool:
    """Send a message to a peer via the local AXL node's POST /send endpoint."""
    url = f"{_axl_base_url()}/send"
    body = json.dumps(payload, sort_keys=True, separators=(",", ":")).encode("utf-8")
    try:
        req = urllib.request.Request(
            url,
            data=body,
            headers={
                "X-Destination-Peer-Id": peer_id,
                "Content-Type": "application/octet-stream",
            },
            method="POST",
        )
        with urllib.request.urlopen(req, timeout=10) as resp:
            return resp.status == 200
    except Exception:
        return False


def _axl_recv() -> List[Dict[str, Any]]:
    """Receive pending messages from the local AXL node via GET /recv.

    AXL returns one message per call (raw body + X-From-Peer-Id header),
    or 204 if the queue is empty. We drain until 204.
    """
    messages: List[Dict[str, Any]] = []
    base_url = _axl_base_url()
    for _ in range(100):  # safety cap
        try:
            req = urllib.request.Request(f"{base_url}/recv", method="GET")
            with urllib.request.urlopen(req, timeout=5) as resp:
                if resp.status == 204:
                    break
                from_peer = resp.getheader("X-From-Peer-Id", "")
                raw = resp.read()
                try:
                    data = json.loads(raw.decode("utf-8"))
                except (json.JSONDecodeError, UnicodeDecodeError):
                    data = {"_raw": raw.hex(), "_from": from_peer}
                if isinstance(data, dict):
                    data["_from_peer_id"] = from_peer
                messages.append(data)
        except Exception:
            break
    return messages


# ---------------------------------------------------------------------------
# Legacy HTTP transport (fallback)
# ---------------------------------------------------------------------------

def _legacy_send(peer: str, payload: Dict[str, Any], endpoint_path: str) -> bool:
    """Best-effort HTTP POST to a peer (legacy stub behavior)."""
    url = peer.rstrip("/") + endpoint_path
    try:
        req = urllib.request.Request(
            url,
            data=json.dumps(payload).encode("utf-8"),
            headers={"Content-Type": "application/json"},
            method="POST",
        )
        with urllib.request.urlopen(req, timeout=5) as _:
            return True
    except Exception:
        return False


def _legacy_recv(milestone_hash: str, port: int, endpoint_path: str) -> List[Dict[str, Any]]:
    """Poll local peer server for incoming verdict messages (legacy)."""
    url = f"http://127.0.0.1:{port}{endpoint_path}"
    try:
        req = urllib.request.Request(url, method="GET")
        with urllib.request.urlopen(req, timeout=5) as resp:
            data = json.loads(resp.read().decode("utf-8"))
        messages = data.get("messages", []) if isinstance(data, dict) else []
        return [m for m in messages if m.get("milestoneHash") == milestone_hash]
    except Exception:
        return []


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def broadcast_verdict(
    *,
    milestone_hash: str,
    verified: bool,
    evidence_root: str,
    node_address: str,
    peers: Optional[List[str]] = None,
    endpoint_path: str = "/send",
) -> BroadcastResult:
    """Broadcast a verifier vote to peers.

    Automatically selects AXL transport or legacy HTTP transport.
    When AXL is active, peers should be hex-encoded public keys (64 chars).
    When in legacy mode, peers should be HTTP URLs.
    """
    peer_list = peers if peers is not None else parse_peers()
    if not peer_list:
        return BroadcastResult(attempted=0, succeeded=0)

    endpoint_path = os.environ.get("AXL_ENDPOINT_PATH") or endpoint_path

    payload: Dict[str, Any] = build_verdict_envelope(
        milestone_hash=milestone_hash,
        verified=bool(verified),
        evidence_root=evidence_root,
        node_address=node_address,
        timestamp=int(time.time()),
    )

    # Sign if enabled (default)
    if os.environ.get("AXL_SIGN", "1") != "0":
        payload = sign_envelope(payload)

    use_axl = _use_axl_transport()

    attempted = 0
    succeeded = 0
    for peer in peer_list:
        attempted += 1
        if use_axl and _is_axl_peer_id(peer):
            ok = _axl_send(peer, payload)
        else:
            ok = _legacy_send(peer, payload, endpoint_path)
        if ok:
            succeeded += 1

    mode = "axl" if use_axl else "legacy"
    return BroadcastResult(attempted=attempted, succeeded=succeeded, mode=mode)


def receive_verdicts(
    milestone_hash: str,
    endpoint_path: str = "/recv",
    local_port: int = 9002,
) -> List[VerdictMessage]:
    """Receive incoming verdict messages from peers.

    Automatically selects AXL transport or legacy HTTP transport.
    """
    use_axl = _use_axl_transport()

    if use_axl:
        raw = _axl_recv()
    else:
        raw = _legacy_recv(milestone_hash, local_port or _axl_port(), endpoint_path)

    results = []
    for m in raw:
        msg = m.get("message", m) if isinstance(m, dict) else m
        if not isinstance(msg, dict):
            continue
        mh = msg.get("milestoneHash", "")
        if mh and (mh == milestone_hash or not milestone_hash):
            results.append(VerdictMessage(
                milestone_hash=mh,
                verified=msg.get("verified", False),
                evidence_root=msg.get("evidenceRoot", ""),
                node_address=msg.get("nodeAddress", ""),
                timestamp=msg.get("timestamp", 0),
            ))
    return results


def tally_consensus(
    own_verdict: bool,
    peer_verdicts: List[VerdictMessage],
    quorum: int = 2,
) -> tuple[bool, bool]:
    """Tally verdicts and determine if quorum is reached.

    Returns (has_quorum, should_submit).
    """
    true_votes = 1 if own_verdict else 0
    for v in peer_verdicts:
        if v.verified:
            true_votes += 1
    return true_votes >= quorum, true_votes >= quorum


def register_peer(
    peer_address: str,
    peer_key: Optional[str] = None,
    local_port: int = 9002,
) -> bool:
    """Register this node with the AXL network (no-op for real AXL; used in legacy)."""
    if _use_axl_transport():
        # Real AXL handles peer discovery via Yggdrasil mesh — no explicit registration
        return True

    # Fallback: HTTP registration (legacy peer server)
    url = f"http://127.0.0.1:{local_port}/register"
    payload = {"peerAddress": peer_address, "peerKey": peer_key or ""}
    try:
        req = urllib.request.Request(
            url,
            data=json.dumps(payload).encode("utf-8"),
            headers={"Content-Type": "application/json"},
            method="POST",
        )
        with urllib.request.urlopen(req, timeout=5) as _:
            return True
    except Exception:
        return False


def start_axl_node(
    *,
    port: Optional[int] = None,
    data_dir: Optional[str] = None,
    config_path: Optional[str] = None,
    private_key_path: Optional[str] = None,
    peers: Optional[List[str]] = None,
    background: bool = True,
) -> Optional[subprocess.Popen]:
    """Start a local AXL node.

    Generates a node-config.json if none is provided, starts the AXL binary,
    and returns the Popen handle if background=True.
    """
    binary = _axl_binary()
    if not shutil.which(binary):
        return None

    p = port or _axl_port()

    # Resolve or generate config
    cfg_path = config_path or os.environ.get("AXL_CONFIG")
    if not cfg_path:
        # Auto-generate a minimal config
        cfg_dir = data_dir or tempfile.mkdtemp(prefix="axl_")
        cfg_path = os.path.join(cfg_dir, "node-config.json")

        config: Dict[str, Any] = {
            "api_port": p,
            "bridge_addr": _axl_bridge_addr(),
        }

        # Identity key
        key_path = private_key_path or os.environ.get("AXL_PRIVATE_KEY_PATH")
        if key_path and os.path.isfile(key_path):
            config["PrivateKeyPath"] = key_path
        else:
            # Generate an ephemeral key
            ephemeral_key = os.path.join(cfg_dir, "private.pem")
            try:
                subprocess.run(
                    ["openssl", "genpkey", "-algorithm", "ed25519", "-out", ephemeral_key],
                    capture_output=True, check=True, timeout=5,
                )
                config["PrivateKeyPath"] = ephemeral_key
            except Exception:
                pass  # AXL will generate an in-memory key

        # Bootstrap peers (Gensyn public nodes)
        bootstrap = peers or [
            "tls://34.46.48.224:9001",
            "tls://136.111.135.206:9001",
        ]
        config["Peers"] = bootstrap

        with open(cfg_path, "w") as f:
            json.dump(config, f, indent=2)

    cmd = [binary, "-config", cfg_path]

    if background:
        proc = subprocess.Popen(
            cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE,
        )
        # Give the node a moment to start
        time.sleep(2)
        if proc.poll() is not None:
            return None
        # Verify it's responding
        if axl_node_running():
            return proc
        # Give it a bit more time
        time.sleep(2)
        if proc.poll() is not None:
            return None
        return proc
    else:
        subprocess.run(cmd, check=False)
        return None
