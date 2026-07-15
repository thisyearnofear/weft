#!/usr/bin/env python3
# SPDX-License-Identifier: MIT
"""
Weft Canton API — institutional second-market surface.

Serves ONLY /canton/* (+ health). Does not require ETH_RPC_URL.
Leave EVM Weft status on a separate host (:9010).

  WEFT_SETTLEMENT_RAIL=canton \\
  CANTON_LEDGER_STORE=/opt/weft-canton/canton/.ledger/milestones.json \\
  python3 agent/scripts/weft_canton_api.py --port 9020
"""

from __future__ import annotations

import argparse
import json
import os
import sys
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import parse_qs, urlparse

REPO_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
if REPO_ROOT not in sys.path:
    sys.path.insert(0, REPO_ROOT)

os.environ.setdefault("WEFT_SETTLEMENT_RAIL", "canton")

from agent.lib.canton_client import CantonSettlement  # noqa: E402
from agent.lib import canton_http as ch  # noqa: E402


def main() -> int:
    p = argparse.ArgumentParser(description="Weft Canton API (institutional)")
    p.add_argument("--host", default=os.environ.get("CANTON_API_HOST") or "0.0.0.0")
    p.add_argument("--port", type=int, default=int(os.environ.get("CANTON_API_PORT") or "9020"))
    args = p.parse_args()

    c = CantonSettlement.from_env()
    handler = _make_handler(c)
    ThreadingHTTPServer.allow_reuse_address = True
    server = ThreadingHTTPServer((args.host, args.port), handler)
    print(f"weft_canton_api: listening on http://{args.host}:{args.port}")
    print(f"  ledger={c.store.path}")
    print(
        f"  consoleWallet={ch.CONSOLE_WALLET.get(os.environ.get('CANTON_NETWORK', 'devnet'), ch.CONSOLE_WALLET['devnet'])}"
    )
    server.serve_forever()
    return 0


def _make_handler(c: CantonSettlement):
    class Handler(BaseHTTPRequestHandler):
        server_version = "weft-canton-api/0.1"

        def log_message(self, fmt: str, *a) -> None:  # noqa: A003
            sys.stderr.write("%s - %s\n" % (self.address_string(), fmt % a))

        def do_OPTIONS(self):  # noqa: N802
            self.send_response(204)
            self._cors()
            self.end_headers()

        def do_GET(self):  # noqa: N802
            parsed = urlparse(self.path)
            path = parsed.path.rstrip("/") or "/"
            qs = parse_qs(parsed.query)

            if path in ("/", "/health"):
                return self._json(200, ch.health_payload())

            if path == "/canton/milestones":
                party = (qs.get("party", [""])[0] or "").strip()
                return self._json(200, ch.list_milestones(c, party))

            if path.startswith("/canton/milestone/"):
                mid = path.split("/canton/milestone/", 1)[1]
                code, payload = ch.get_milestone(c, mid)
                return self._json(code, payload)

            if path == "/canton/balances":
                party = (qs.get("party", [""])[0] or "").strip()
                return self._json(200, ch.get_balances(c, party))

            if path == "/canton/wallet":
                return self._json(200, ch.get_wallet_info())

            if path.startswith("/canton/receipt/"):
                mid = path.split("/canton/receipt/", 1)[1]
                code, payload = ch.get_receipt(c, mid)
                return self._json(code, payload)

            return self._json(404, {"ok": False, "error": "not_found"})

        def do_POST(self):  # noqa: N802
            parsed = urlparse(self.path)
            path = parsed.path.rstrip("/")
            if path == "/canton/ingest":
                try:
                    length = int(self.headers.get("Content-Length", 0))
                    body = json.loads(self.rfile.read(length)) if length else {}
                except Exception:
                    return self._json(400, {"ok": False, "error": "invalid_json"})
                code, payload = ch.handle_ingest(c, body)
                return self._json(code, payload)

            if path != "/canton/action":
                return self._json(404, {"ok": False, "error": "not_found"})
            try:
                length = int(self.headers.get("Content-Length", 0))
                body = json.loads(self.rfile.read(length)) if length else {}
            except Exception:
                return self._json(400, {"ok": False, "error": "invalid_json"})

            code, payload = ch.handle_action(c, body)
            return self._json(code, payload)

        def _cors(self) -> None:
            self.send_header("Access-Control-Allow-Origin", "*")
            self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
            self.send_header("Access-Control-Allow-Headers", "Content-Type, Authorization")

        def _json(self, code: int, obj: dict):
            raw = json.dumps(obj, indent=2).encode("utf-8") + b"\n"
            self.send_response(code)
            self._cors()
            self.send_header("Content-Type", "application/json")
            self.send_header("Content-Length", str(len(raw)))
            self.end_headers()
            self.wfile.write(raw)

    return Handler


if __name__ == "__main__":
    raise SystemExit(main())
