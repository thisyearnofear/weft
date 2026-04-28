#!/usr/bin/env python3
# SPDX-License-Identifier: MIT

"""
Milestone metadata reader (0G-backed).

For builder-first onboarding, verifier nodes MUST derive template inputs from the
milestone's onchain `metadataHash` (a content-addressed root), not from local env.
"""

from __future__ import annotations

import json
import os
import subprocess
import tempfile
from dataclasses import dataclass
from typing import Any, Dict, Optional, Tuple


TEMPLATE_ID_STR = "DEPLOYED_AND_100_UNIQUE_CALLERS_7D"
ZERO_HASH = "0x" + "00" * 32


@dataclass(frozen=True)
class MilestoneMetadata:
    templateId: str
    chainId: int
    contractAddress: str
    deadline: int
    measurementWindowSeconds: int
    uniqueCallerThreshold: int
    notes: str = ""


class MetadataError(RuntimeError):
    pass


def read_metadata_from_0g(
    metadata_root: str,
    *,
    indexer: Optional[str] = None,
) -> MilestoneMetadata:
    """
    Download metadata.json from 0G by root and validate schema.
    """
    root = (metadata_root or "").strip()
    if not root or root == ZERO_HASH:
        raise MetadataError("metadataHash is empty/zero; cannot derive verifier inputs")
    if not root.startswith("0x"):
        raise MetadataError("metadataHash must be 0x-prefixed")

    idx = (
        indexer
        or os.environ.get("ZERO_G_INDEXER_RPC")
        or os.environ.get("ZERO_G_INDEXER_URL")
        or ""
    )
    if not idx:
        raise MetadataError("Missing ZERO_G_INDEXER_RPC (or ZERO_G_INDEXER_URL) for metadata download")

    with tempfile.TemporaryDirectory(prefix="weft_metadata_") as td:
        out_path = os.path.join(td, "metadata.json")
        _download_root(idx, root, out_path)
        raw = _load_json(out_path)
        meta, err = _validate_metadata_dict(raw)
        if err:
            raise MetadataError(err)
        return meta


def _download_root(indexer: str, root: str, out_path: str) -> None:
    cmd = ["0g-storage-client", "download", "--indexer", indexer, "--root", root, "--file", out_path]
    try:
        proc = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True, check=False)
    except FileNotFoundError as e:
        raise MetadataError("0g-storage-client not found on PATH") from e
    if proc.returncode != 0:
        raise MetadataError("0g download failed: " + proc.stdout.strip())


def _load_json(path: str) -> Dict[str, Any]:
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


def _validate_metadata_dict(raw: Dict[str, Any]) -> Tuple[MilestoneMetadata, str]:
    # Required keys
    tid = raw.get("templateId")
    if tid != TEMPLATE_ID_STR:
        return _dummy(), f"templateId mismatch (expected {TEMPLATE_ID_STR}, got {tid})"

    chain_id = raw.get("chainId")
    if not isinstance(chain_id, int):
        return _dummy(), "chainId must be an int"

    ca = raw.get("contractAddress")
    if not (isinstance(ca, str) and ca.startswith("0x") and len(ca) == 42):
        return _dummy(), "contractAddress must be a 0x-prefixed 20-byte address string"

    deadline = raw.get("deadline")
    if not isinstance(deadline, int):
        return _dummy(), "deadline must be an int (unix seconds)"

    mws = raw.get("measurementWindowSeconds")
    if not (isinstance(mws, int) and mws > 0):
        return _dummy(), "measurementWindowSeconds must be a positive int"

    uct = raw.get("uniqueCallerThreshold")
    if not (isinstance(uct, int) and uct > 0):
        return _dummy(), "uniqueCallerThreshold must be a positive int"

    notes = raw.get("notes") or ""
    if not isinstance(notes, str):
        notes = str(notes)

    return (
        MilestoneMetadata(
            templateId=tid,
            chainId=chain_id,
            contractAddress=ca,
            deadline=deadline,
            measurementWindowSeconds=mws,
            uniqueCallerThreshold=uct,
            notes=notes,
        ),
        "",
    )


def _dummy() -> MilestoneMetadata:
    return MilestoneMetadata(
        templateId=TEMPLATE_ID_STR,
        chainId=0,
        contractAddress="0x0000000000000000000000000000000000000000",
        deadline=0,
        measurementWindowSeconds=1,
        uniqueCallerThreshold=1,
        notes="",
    )

