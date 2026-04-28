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
                return self._send_html(200, _INDEX_HTML)

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

        def _send_html(self, code: int, html: str):
            body = html.encode("utf-8")
            self.send_response(code)
            self.send_header("Content-Type", "text/html; charset=utf-8")
            self.send_header("Content-Length", str(len(body)))
            self.send_header("Cache-Control", "no-store")
            self.end_headers()
            self.wfile.write(body)

        def log_message(self, fmt: str, *args) -> None:
            # Quiet default logs
            sys.stderr.write("status_api: " + (fmt % args) + "\n")

    return Handler


_INDEX_HTML = """<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <title>Weft Milestone Status</title>
    <style>
      body { font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial; margin: 24px; color: #111; }
      .card { max-width: 880px; border: 1px solid #e5e7eb; border-radius: 12px; padding: 16px; }
      label { display: block; font-size: 13px; margin: 12px 0 6px; color: #374151; }
      input[type=text] { width: 100%; padding: 10px 12px; border: 1px solid #d1d5db; border-radius: 10px; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; }
      .row { display: flex; gap: 12px; align-items: center; margin-top: 12px; flex-wrap: wrap; }
      button { padding: 10px 12px; border: 1px solid #111827; background: #111827; color: white; border-radius: 10px; cursor: pointer; }
      button.secondary { background: white; color: #111827; }
      .hint { font-size: 12px; color: #6b7280; margin-top: 8px; }
      pre { background: #0b1020; color: #e5e7eb; padding: 14px; border-radius: 12px; overflow: auto; }
      .error { color: #b91c1c; font-size: 13px; margin-top: 10px; }
      .ok { color: #047857; font-size: 13px; margin-top: 10px; }
      .small { font-size: 12px; color: #6b7280; }
    </style>
  </head>
  <body>
    <div class="card">
      <h2>Weft Milestone Status</h2>
      <div class="small">Paste a milestone hash and fetch its current onchain status (optionally including metadata).</div>

      <label for="mh">Milestone hash</label>
      <input id="mh" type="text" placeholder="0x..." />

      <div class="row">
        <label style="display:flex;gap:8px;align-items:center;margin:0;">
          <input id="meta" type="checkbox" />
          include metadata (0G)
        </label>
        <button id="fetch">Fetch</button>
        <button id="copy" class="secondary">Copy JSON</button>
      </div>

      <div class="hint">API endpoints: <code>/milestone/&lt;hash&gt;</code> and <code>?includeMetadata=1</code></div>
      <div id="msg"></div>
      <pre id="out">{}</pre>
    </div>

    <script>
      const mh = document.getElementById('mh');
      const meta = document.getElementById('meta');
      const out = document.getElementById('out');
      const msg = document.getElementById('msg');
      const btn = document.getElementById('fetch');
      const copy = document.getElementById('copy');

      function setMsg(text, ok=true) {
        msg.innerHTML = '';
        if (!text) return;
        const div = document.createElement('div');
        div.className = ok ? 'ok' : 'error';
        div.textContent = text;
        msg.appendChild(div);
      }

      async function fetchStatus() {
        const h = (mh.value || '').trim();
        if (!h.startsWith('0x') || h.length !== 66) {
          setMsg('Please enter a 0x-prefixed 32-byte milestone hash (66 chars).', false);
          return;
        }
        setMsg('Fetching...', true);
        const url = `/milestone/${h}?` + (meta.checked ? 'includeMetadata=1' : '');
        try {
          const res = await fetch(url);
          const j = await res.json();
          out.textContent = JSON.stringify(j, null, 2);
          setMsg(j.ok ? 'OK' : (j.error || 'Error'), !!j.ok);
        } catch (e) {
          setMsg('Fetch failed: ' + e, false);
        }
      }

      btn.addEventListener('click', fetchStatus);
      mh.addEventListener('keydown', (e) => { if (e.key === 'Enter') fetchStatus(); });
      copy.addEventListener('click', async () => {
        try {
          await navigator.clipboard.writeText(out.textContent);
          setMsg('Copied JSON to clipboard.', true);
        } catch (e) {
          setMsg('Copy failed: ' + e, false);
        }
      });
    </script>
  </body>
</html>
"""


if __name__ == "__main__":
    raise SystemExit(main())
