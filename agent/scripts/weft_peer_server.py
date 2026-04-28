#!/usr/bin/env python3
# SPDX-License-Identifier: MIT

"""
Weft peer server (MVP).

Purpose:
- Provide a minimal HTTP endpoint that other verifier nodes can POST to.
- Persist received verdict envelopes for later inspection and/or processing.

Endpoints:
- GET  /health  -> 200 OK
- POST /send    -> accepts JSON payload, writes to agent/.inbox/, returns 200 OK

This intentionally does NOT:
- validate signatures (planned)
- submit onchain votes (daemon owns that)
- enforce any transport/security beyond basic structure (MVP)
"""

from __future__ import annotations

import argparse
import json
import os
import sys
import time
from http.server import BaseHTTPRequestHandler, HTTPServer
from typing import Any, Dict, Tuple

# Allow running directly from repo root without installing.
REPO_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
if REPO_ROOT not in sys.path:
    sys.path.insert(0, REPO_ROOT)

from agent.lib.verdict_envelope import verify_envelope


def main() -> int:
    p = argparse.ArgumentParser(description="Weft peer server (POST /send).")
    p.add_argument("--host", default=os.environ.get("AXL_HOST") or "0.0.0.0")
    p.add_argument("--port", type=int, default=int(os.environ.get("AXL_PORT") or "9002"))
    p.add_argument("--inbox-dir", default=os.environ.get("WEFT_INBOX_DIR") or "agent/.inbox")
    p.add_argument(
        "--require-signature",
        action="store_true",
        default=(os.environ.get("AXL_REQUIRE_SIGNATURE") == "1"),
        help="If set, only accept envelopes with valid cast-verifiable signatures.",
    )
    args = p.parse_args()

    inbox_dir = os.path.abspath(args.inbox_dir)
    os.makedirs(inbox_dir, exist_ok=True)

    handler = _make_handler(inbox_dir, require_signature=bool(args.require_signature))
    httpd = HTTPServer((args.host, args.port), handler)
    print(f"weft_peer_server: listening on http://{args.host}:{args.port}  inbox={inbox_dir}")
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        return 0


def _make_handler(inbox_dir: str, *, require_signature: bool):
    class Handler(BaseHTTPRequestHandler):
        server_version = "weft-peer-server/0.1"

        def do_GET(self):  # noqa: N802
            if self.path.rstrip("/") == "/health":
                self._send_json(200, {"ok": True})
                return
            self._send_json(404, {"ok": False, "error": "not_found"})

        def do_POST(self):  # noqa: N802
            if self.path.rstrip("/") != "/send":
                self._send_json(404, {"ok": False, "error": "not_found"})
                return

            length = int(self.headers.get("content-length") or "0")
            if length <= 0:
                self._send_json(400, {"ok": False, "error": "empty_body"})
                return

            try:
                raw = self.rfile.read(length)
                payload: Dict[str, Any] = json.loads(raw.decode("utf-8"))
            except Exception:
                self._send_json(400, {"ok": False, "error": "invalid_json"})
                return

            ok, err = _validate_payload(payload)
            if not ok:
                self._send_json(400, {"ok": False, "error": err})
                return

            if require_signature:
                ok_sig, sig_err = verify_envelope(payload)
                if not ok_sig:
                    self._send_json(400, {"ok": False, "error": sig_err})
                    return

            milestone_hash = str(payload.get("milestoneHash"))
            node_address = str(payload.get("nodeAddress", "unknown"))
            ts = int(payload.get("timestamp") or time.time())

            # Avoid filesystem issues: keep names predictable.
            safe_m = _safe_name(milestone_hash)
            safe_n = _safe_name(node_address)

            dir_path = os.path.join(inbox_dir, safe_m)
            os.makedirs(dir_path, exist_ok=True)
            out_path = os.path.join(dir_path, f"{ts}-{safe_n}.json")

            tmp = out_path + ".tmp"
            with open(tmp, "w", encoding="utf-8") as f:
                json.dump(payload, f, indent=2, sort_keys=True)
                f.write("\n")
            os.replace(tmp, out_path)

            self._send_json(200, {"ok": True, "path": out_path, "signatureRequired": require_signature})

        def log_message(self, fmt: str, *args) -> None:
            # Keep logs concise; avoid noisy default HTTP logs.
            sys.stderr.write("peer_server: " + (fmt % args) + "\n")

        def _send_json(self, code: int, obj: Dict[str, Any]) -> None:
            body = json.dumps(obj).encode("utf-8")
            self.send_response(code)
            self.send_header("Content-Type", "application/json")
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            self.wfile.write(body)

    return Handler


def _validate_payload(payload: Dict[str, Any]) -> Tuple[bool, str]:
    if payload.get("type") != "weft.verdict":
        return False, "invalid_type"
    for k in ("milestoneHash", "verified", "evidenceRoot", "nodeAddress", "timestamp"):
        if k not in payload:
            return False, f"missing_{k}"
    if not isinstance(payload["verified"], bool):
        return False, "verified_must_be_bool"
    if not (isinstance(payload["milestoneHash"], str) and payload["milestoneHash"].startswith("0x")):
        return False, "milestoneHash_must_be_hex"
    if not (isinstance(payload["evidenceRoot"], str) and payload["evidenceRoot"].startswith("0x")):
        return False, "evidenceRoot_must_be_hex"
    return True, ""


def _safe_name(s: str) -> str:
    # keep alnum + -_. only
    return "".join([c if c.isalnum() or c in ("-", "_", ".") else "_" for c in s])[:120]


if __name__ == "__main__":
    raise SystemExit(main())
