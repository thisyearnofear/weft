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
        max-width: 520px;
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
        margin-bottom: 28px;
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
        max-height: 300px;
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
      <p class="subtitle">Milestone Status API</p>

      <label for="mh">Milestone Hash</label>
      <input id="mh" type="text" placeholder="0x..." />

      <div class="checkbox-row">
        <label for="meta">
          <input id="meta" type="checkbox" />
          Include metadata (0G Storage)
        </label>
      </div>

      <div class="button-row">
        <button id="fetch">Fetch Status</button>
        <button id="copy">Copy JSON</button>
      </div>

      <div class="hint">API: <code>/milestone/&lt;hash&gt;</code> · <code>?includeMetadata=1</code></div>
      
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
        setStatus('Fetching...', 'loading');
        const url = '/milestone/' + h + '?' + (meta.checked ? 'includeMetadata=1' : '');
        try {
          const res = await fetch(url);
          const j = await res.json();
          out.textContent = JSON.stringify(j, null, 2);
          setStatus(j.ok ? '✓ Fetched successfully' : (j.error || 'Error'), j.ok ? 'ok' : 'error');
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
