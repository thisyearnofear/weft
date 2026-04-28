#!/usr/bin/env python3
# SPDX-License-Identifier: MIT

"""
0G Storage reader for Weft milestone evidence.
Reads from 0G Storage Log + KV layers when env vars are configured.
Falls back gracefully when not configured (MVP mode).
"""

from __future__ import annotations

import json
import os
import urllib.request
from dataclasses import dataclass
from typing import Any, Dict, Optional


@dataclass(frozen=True)
class StorageReceipt:
    log_root: str
    kv_key: str
    verified: Optional[bool] = None
    timestamp: Optional[int] = None


def write_evidence_to_storage(
    milestone_hash: str,
    evidence_bundle: Dict[str, Any],
    *,
    rpc_url: Optional[str] = None,
    signer_key: Optional[str] = None,
    indexer_url: Optional[str] = None,
    stream_id: Optional[str] = None,
) -> StorageReceipt:
    """
    Write a milestone evidence bundle to 0G Storage.

    Env vars (all optional for MVP mode):
        ZERO_G_RPC_URL    — 0G Chain RPC
        ZERO_G_SIGNER_KEY — signer private key
        ZERO_G_INDEXER_URL — storage indexer RPC
        ZERO_G_STREAM_ID   — KV stream ID

    Returns a StorageReceipt.
    """
    rpc   = rpc_url     or os.environ.get("ZERO_G_RPC_URL") or ""
    signer = signer_key or os.environ.get("ZERO_G_SIGNER_KEY") or ""
    indexer = indexer_url or os.environ.get("ZERO_G_INDEXER_URL") or ""
    s_id  = stream_id  or os.environ.get("ZERO_G_STREAM_ID") or ""

    if not rpc:
        return StorageReceipt(log_root="", kv_key=f"weft:milestone:{milestone_hash}:latest")

    bundle = {
        "milestoneHash": milestone_hash,
        "timestamp": __import__("time").time(),
        "evidence": evidence_bundle,
    }

    if indexer:
        try:
            req = urllib.request.Request(
                indexer + "/upload",
                data=json.dumps(bundle).encode("utf-8"),
                headers={"Content-Type": "application/json"},
                method="POST",
            )
            with urllib.request.urlopen(req, timeout=60) as resp:
                result = json.loads(resp.read().decode("utf-8"))
            root = result.get("root") or result.get("logRoot") or ""
        except Exception:
            root = ""
    else:
        root = ""

    kv_key = f"weft:milestone:{milestone_hash}:latest"
    if s_id and rpc:
        _kv_write(rpc, signer, s_id, kv_key, json.dumps(bundle))

    return StorageReceipt(
        log_root=root,
        kv_key=kv_key,
        verified=evidence_bundle.get("verified"),
        timestamp=int(bundle["timestamp"]),
    )


def read_evidence_from_storage(
    milestone_hash: str,
    *,
    rpc_url: Optional[str] = None,
    indexer_url: Optional[str] = None,
    stream_id: Optional[str] = None,
) -> Optional[Dict[str, Any]]:
    """
    Read milestone evidence from 0G Storage KV.
    Returns None if not found or env vars not configured.
    """
    rpc    = rpc_url     or os.environ.get("ZERO_G_RPC_URL") or ""
    indexer = indexer_url or os.environ.get("ZERO_G_INDEXER_URL") or ""
    s_id   = stream_id  or os.environ.get("ZERO_G_STREAM_ID") or ""

    if not s_id or not indexer:
        return None

    key = f"weft:milestone:{milestone_hash}:latest"
    try:
        req = urllib.request.Request(
            f"{indexer}/kv/get",
            data=json.dumps({"streamId": s_id, "key": key}).encode("utf-8"),
            headers={"Content-Type": "application/json"},
            method="POST",
        )
        with urllib.request.urlopen(req, timeout=30) as resp:
            result = json.loads(resp.read().decode("utf-8"))
        return result
    except Exception:
        return None


def _kv_write(rpc: str, signer: str, stream_id: str, key: str, value: str) -> None:
    """Write a key-value pair to 0G Storage KV."""
    try:
        payload = {
            "method": "kv_write",
            "params": {
                "streamId": stream_id,
                "keys": [key],
                "values": [value],
            },
        }
        req = urllib.request.Request(
            rpc,
            data=json.dumps(payload).encode("utf-8"),
            headers={"Content-Type": "application/json"},
            method="POST",
        )
        urllib.request.urlopen(req, timeout=30)
    except Exception:
        pass