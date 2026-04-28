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
    indexer_url: Optional[str] = None,
    stream_id: Optional[str] = None,
) -> StorageReceipt:
    """
    Write a milestone evidence bundle to 0G Storage.

    Env vars (all optional for MVP mode):
        ZERO_G_INDEXER_URL — 0G Storage indexer base URL (HTTP)
        ZERO_G_STREAM_ID   — KV stream ID

    Returns a StorageReceipt.
    """
    indexer = indexer_url or os.environ.get("ZERO_G_INDEXER_URL") or ""
    s_id = stream_id or os.environ.get("ZERO_G_STREAM_ID") or ""

    # MVP mode: if no indexer configured, return empty receipt (caller can fall back to keccak root).
    if not indexer:
        return StorageReceipt(log_root="", kv_key=f"weft:milestone:{milestone_hash}:latest")

    now = __import__("time").time()
    bundle = {
        "milestoneHash": milestone_hash,
        "timestamp": now,
        "evidence": evidence_bundle,
    }

    # 1) Log upload (best-effort). Endpoint naming may vary by deployment.
    root = ""
    try:
        req = urllib.request.Request(
            indexer.rstrip("/") + "/upload",
            data=json.dumps(bundle).encode("utf-8"),
            headers={"Content-Type": "application/json"},
            method="POST",
        )
        with urllib.request.urlopen(req, timeout=60) as resp:
            result = json.loads(resp.read().decode("utf-8"))
        root = result.get("root") or result.get("logRoot") or result.get("evidenceRoot") or ""
    except Exception:
        root = ""

    kv_key = f"weft:milestone:{milestone_hash}:latest"
    # 2) KV write (best-effort). If this endpoint is not available, we still return receipt.
    if s_id:
        # Keep KV payload small: store a summary + the logRoot pointer.
        weft = evidence_bundle.get("weft", {}) if isinstance(evidence_bundle, dict) else {}
        verdict = evidence_bundle.get("verdict", {}) if isinstance(evidence_bundle, dict) else {}
        kv_value = {
            "milestoneHash": milestone_hash,
            "projectId": weft.get("projectId", ""),
            "templateId": weft.get("templateId", ""),
            "verified": verdict.get("verified", None),
            "timestamp": int(now),
            "logRoot": root,
        }
        _kv_put(indexer, s_id, kv_key, kv_value)

    return StorageReceipt(
        log_root=root,
        kv_key=kv_key,
        verified=(evidence_bundle.get("verdict", {}) or {}).get("verified") if isinstance(evidence_bundle, dict) else None,
        timestamp=int(now),
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
    indexer = indexer_url or os.environ.get("ZERO_G_INDEXER_URL") or ""
    s_id = stream_id or os.environ.get("ZERO_G_STREAM_ID") or ""

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
        # Some deployments wrap as {"value": {...}}.
        if isinstance(result, dict) and "value" in result:
            return result["value"]
        return result
    except Exception:
        return None


def _kv_write(rpc: str, signer: str, stream_id: str, key: str, value: str) -> None:
    raise NotImplementedError("Deprecated: use _kv_put(indexer_url, ...) instead")


def _kv_put(indexer_url: str, stream_id: str, key: str, value: Dict[str, Any]) -> None:
    """Best-effort KV put to the configured indexer."""
    try:
        req = urllib.request.Request(
            indexer_url.rstrip("/") + "/kv/put",
            data=json.dumps({"streamId": stream_id, "key": key, "value": value}).encode("utf-8"),
            headers={"Content-Type": "application/json"},
            method="POST",
        )
        urllib.request.urlopen(req, timeout=30)
    except Exception:
        pass
