#!/usr/bin/env python3
# SPDX-License-Identifier: MIT

"""
Verify a Weft attestation bundle against bundle_manifest.json.

Supports:
1) Verifying an extracted directory containing bundle_manifest.json
2) Verifying a bundle.tar.gz by extracting to a temporary directory first

Exit codes:
  0: success
  2: verification failed (mismatch/missing)
  3: usage/config error
"""

from __future__ import annotations

import argparse
import json
import os
import sys
import tarfile
import tempfile
from typing import Any, Dict, List, Tuple

# Allow running directly from repo root without installing.
REPO_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
if REPO_ROOT not in sys.path:
    sys.path.insert(0, REPO_ROOT)

from agent.lib.mvp_verifier import keccak_bytes


def main() -> int:
    p = argparse.ArgumentParser(description="Verify a Weft bundle via bundle_manifest.json.")
    src = p.add_mutually_exclusive_group(required=True)
    src.add_argument("--dir", help="Directory containing bundle_manifest.json and referenced files")
    src.add_argument("--bundle", help="Path to bundle.tar.gz (will extract to temp dir and verify)")
    p.add_argument("--manifest", help="Optional explicit path to bundle_manifest.json")
    p.add_argument("--strict", action="store_true", help="Fail if extra files exist that are not listed in manifest")
    args = p.parse_args()

    if args.dir:
        root_dir = os.path.abspath(args.dir)
        return _verify_dir(root_dir, args.manifest, strict=bool(args.strict))

    if args.bundle:
        bundle_path = os.path.abspath(args.bundle)
        if not os.path.exists(bundle_path):
            print(f"error: bundle not found: {bundle_path}", file=sys.stderr)
            return 3
        with tempfile.TemporaryDirectory(prefix="weft_bundle_") as td:
            _extract_tar_gz(bundle_path, td)
            return _verify_dir(td, args.manifest, strict=bool(args.strict))

    return 3


def _extract_tar_gz(bundle_path: str, out_dir: str) -> None:
    with tarfile.open(bundle_path, "r:gz") as tf:
        tf.extractall(out_dir)


def _load_manifest(root_dir: str, manifest_path: str | None) -> Dict[str, Any]:
    path = os.path.abspath(manifest_path) if manifest_path else os.path.join(root_dir, "bundle_manifest.json")
    if not os.path.exists(path):
        raise FileNotFoundError(f"bundle_manifest.json not found at {path}")
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


def _verify_dir(root_dir: str, manifest_path: str | None, *, strict: bool) -> int:
    try:
        manifest = _load_manifest(root_dir, manifest_path)
    except Exception as e:
        print(f"error: failed to load manifest: {e}", file=sys.stderr)
        return 3

    files = manifest.get("files", [])
    if not isinstance(files, list):
        print("error: manifest.files must be a list", file=sys.stderr)
        return 3

    failures: List[str] = []
    seen_paths = set()

    for entry in files:
        if not isinstance(entry, dict):
            failures.append("manifest entry is not an object")
            continue
        rel = entry.get("path")
        expected_bytes = entry.get("bytes")
        expected_hash = entry.get("keccak256")
        if not isinstance(rel, str):
            failures.append("manifest entry missing path")
            continue

        seen_paths.add(rel)
        abs_path = os.path.join(root_dir, rel)
        if not os.path.exists(abs_path):
            failures.append(f"missing: {rel}")
            continue

        try:
            st = os.stat(abs_path)
            if isinstance(expected_bytes, int) and int(st.st_size) != expected_bytes:
                failures.append(f"size mismatch: {rel} expected={expected_bytes} got={int(st.st_size)}")
            with open(abs_path, "rb") as f:
                data = f.read()
            got_hash = keccak_bytes(data)
            if isinstance(expected_hash, str) and expected_hash.lower() != got_hash.lower():
                failures.append(f"hash mismatch: {rel} expected={expected_hash} got={got_hash}")
        except Exception as e:
            failures.append(f"read error: {rel} err={e}")

    if strict:
        extra = _find_extra_files(root_dir, seen_paths)
        for rel in sorted(extra):
            failures.append(f"extra: {rel}")

    if failures:
        print("bundle verification: FAIL")
        for f in failures[:200]:
            print(f" - {f}")
        if len(failures) > 200:
            print(f" ... and {len(failures) - 200} more")
        return 2

    print("bundle verification: OK")
    # Print a small summary (non-authoritative).
    print(f"files verified: {len(files)}")
    return 0


def _find_extra_files(root_dir: str, manifest_paths: set[str]) -> List[str]:
    extras: List[str] = []
    for dirpath, _, filenames in os.walk(root_dir):
        for name in filenames:
            abs_path = os.path.join(dirpath, name)
            rel = os.path.relpath(abs_path, root_dir)
            # Always ignore the manifest itself (may or may not be included)
            if rel == "bundle_manifest.json":
                continue
            if rel not in manifest_paths:
                extras.append(rel)
    return extras


if __name__ == "__main__":
    raise SystemExit(main())

