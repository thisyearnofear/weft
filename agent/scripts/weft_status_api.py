#!/usr/bin/env python3
# SPDX-License-Identifier: MIT

"""
Weft Status API (minimal, read-only).

Purpose: give builders a simple HTTP endpoint to check milestone status without needing
Foundry or direct RPC usage on their machine.

Endpoints:
- GET /health
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
from urllib.parse import parse_qs, urlparse

# Allow running directly from repo root without installing.
REPO_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
if REPO_ROOT not in sys.path:
    sys.path.insert(0, REPO_ROOT)

from agent.lib.jsonrpc import JsonRpcClient, default_cache  # noqa: E402
from agent.lib.metadata_reader import MetadataError, read_metadata_from_0g  # noqa: E402
from agent.lib.weft_milestone_reader import read_milestone  # noqa: E402


def main() -> int:
    p = argparse.ArgumentParser(description="Weft Status API (read-only)")
    p.add_argument("--host", default=os.environ.get("STATUS_HOST") or "0.0.0.0")
    p.add_argument("--port", type=int, default=int(os.environ.get("STATUS_PORT") or "9010"))
    p.add_argument("--rpc-url", default=os.environ.get("ETH_RPC_URL") or os.environ.get("RPC_URL") or "")
    p.add_argument("--weft", default=os.environ.get("WEFT_CONTRACT_ADDRESS") or os.environ.get("WEFT_MILESTONE_ADDRESS") or "")
    p.add_argument("--metadata-indexer", default=os.environ.get("ZERO_G_INDEXER_RPC") or os.environ.get("ZERO_G_INDEXER_URL") or "")
    p.add_argument("--no-cache", action="store_true")
    args = p.parse_args()

    if not args.rpc_url:
        raise SystemExit("Missing --rpc-url (or ETH_RPC_URL)")
    if not args.weft:
        raise SystemExit("Missing --weft (or WEFT_CONTRACT_ADDRESS)")

    cache = None if args.no_cache else default_cache()
    rpc = JsonRpcClient(args.rpc_url, cache=cache)

    handler = _make_handler(rpc, args.weft, args.metadata_indexer)
    server = ThreadingHTTPServer((args.host, args.port), handler)
    print(f"weft_status_api: listening on http://{args.host}:{args.port}")
    server.serve_forever()
    return 0


def _make_handler(rpc: JsonRpcClient, weft: str, metadata_indexer: str):
    class Handler(BaseHTTPRequestHandler):
        server_version = "weft-status-api/0.1"

        def do_GET(self):  # noqa: N802
            parsed = urlparse(self.path)
            path = parsed.path.rstrip("/")
            qs = parse_qs(parsed.query)

            if path == "" or path == "/":
                return self._send_json(200, {"ok": True, "service": "weft-status-api"})

            if path == "/health":
                return self._send_json(200, {"ok": True})

            if path.startswith("/milestone/"):
                milestone_hash = path.split("/milestone/", 1)[1]
                include_metadata = (qs.get("includeMetadata", ["0"])[0] == "1")
                return self._handle_milestone(milestone_hash, include_metadata)

            return self._send_json(404, {"ok": False, "error": "not_found"})

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

        def log_message(self, fmt: str, *args) -> None:
            # Quiet default logs
            sys.stderr.write("status_api: " + (fmt % args) + "\n")

    return Handler


if __name__ == "__main__":
    raise SystemExit(main())

