#!/usr/bin/env python3
# SPDX-License-Identifier: MIT

"""
Download a bundle.tar.gz from 0G Storage (by root hash) and verify it via bundle_manifest.json.

This is a convenience wrapper around:
- `0g-storage-client download --indexer ... --root ... --file ...`
- `python3 agent/scripts/weft_verify_bundle.py --bundle ...`

Exit codes:
  0: success
  2: verification failed
  3: download failed / config error
"""

from __future__ import annotations

import argparse
import os
import subprocess
import sys


def main() -> int:
    p = argparse.ArgumentParser(description="Download and verify a Weft bundle from 0G Storage.")
    p.add_argument("--root", required=True, help="0G merkle root (0x...) of bundle.tar.gz")
    p.add_argument("--out", default="", help="Output path for bundle.tar.gz (default: ./bundle-<root>.tar.gz)")
    p.add_argument(
        "--indexer",
        default=os.environ.get("ZERO_G_INDEXER_RPC") or os.environ.get("ZERO_G_INDEXER_URL") or "",
        help="0G indexer RPC/endpoint (default: ZERO_G_INDEXER_RPC or ZERO_G_INDEXER_URL env var)",
    )
    p.add_argument("--strict", action="store_true", help="Pass --strict to weft_verify_bundle.py")
    args = p.parse_args()

    if not args.indexer:
        print("error: missing --indexer (or ZERO_G_INDEXER_RPC / ZERO_G_INDEXER_URL)", file=sys.stderr)
        return 3

    root = args.root.strip()
    if not root.startswith("0x"):
        print("error: --root must be 0x-prefixed", file=sys.stderr)
        return 3

    out = args.out.strip()
    if not out:
        short = root[2:10]
        out = f"./bundle-{short}.tar.gz"
    out = os.path.abspath(out)

    # 1) Download
    rc = _download(root=root, indexer=args.indexer, out=out)
    if rc != 0:
        return 3

    # 2) Verify
    return _verify(out, strict=bool(args.strict))


def _download(*, root: str, indexer: str, out: str) -> int:
    bin_path = "0g-storage-client"
    cmd = [bin_path, "download", "--indexer", indexer, "--root", root, "--file", out]
    print("download:", " ".join(cmd))

    try:
        proc = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True, check=False)
    except FileNotFoundError:
        print("error: 0g-storage-client not found on PATH", file=sys.stderr)
        return 3

    if proc.returncode != 0:
        print("download failed:\n" + proc.stdout, file=sys.stderr)
        return 3

    print(f"downloaded: {out}")
    return 0


def _verify(bundle_path: str, *, strict: bool) -> int:
    script = os.path.join(os.path.dirname(__file__), "weft_verify_bundle.py")
    cmd = ["python3", script, "--bundle", bundle_path]
    if strict:
        cmd.append("--strict")
    print("verify:", " ".join(cmd))

    proc = subprocess.run(cmd, check=False)
    return proc.returncode


if __name__ == "__main__":
    raise SystemExit(main())

