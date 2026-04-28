#!/usr/bin/env python3
# SPDX-License-Identifier: MIT

"""
Bundle manifest generator.

Creates a deterministic `bundle_manifest.json` describing the contents of an attestation
output directory. This is useful for:
- verifying what a bundle contains without unpacking it
- quickly checking integrity before/after 0G download

Hashing:
- Uses Keccak-256 via foundry `cast keccak` (through mvp_verifier.keccak_bytes) to
  align with our existing evidenceRoot convention.
"""

from __future__ import annotations

import os
from typing import Any, Dict, List, Optional, Tuple

from .bundle_pack import list_files_recursively
from .mvp_verifier import keccak_bytes


def build_manifest(
    *,
    out_dir: str,
    milestone_hash: str,
    verified: bool,
    base_evidence_root: str,
    consensus_root: Optional[str] = None,
    signer_addresses: Optional[List[str]] = None,
    exclude_relpaths: Optional[List[str]] = None,
) -> Dict[str, Any]:
    """
    Build a manifest dict. This does not write to disk.
    """
    exclude = set(exclude_relpaths or [])
    exclude.add("bundle.tar.gz")
    exclude.add("bundle_manifest.json")  # avoid self-reference

    files: List[Dict[str, Any]] = []
    for abs_path, rel_path in list_files_recursively(out_dir):
        if rel_path in exclude:
            continue
        try:
            st = os.stat(abs_path)
            with open(abs_path, "rb") as f:
                data = f.read()
            files.append(
                {
                    "path": rel_path,
                    "bytes": int(st.st_size),
                    "keccak256": keccak_bytes(data),
                }
            )
        except Exception:
            continue

    files.sort(key=lambda x: x["path"])

    return {
        "schemaVersion": 1,
        "type": "weft.bundle_manifest",
        "milestoneHash": milestone_hash,
        "verified": bool(verified),
        "baseEvidenceRoot": base_evidence_root,
        "consensusRoot": consensus_root or "",
        "signers": signer_addresses or [],
        "files": files,
    }

