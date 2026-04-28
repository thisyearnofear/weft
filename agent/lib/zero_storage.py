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
import re
import shutil
import subprocess
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
    file_path: Optional[str] = None,
    indexer_url: Optional[str] = None,
    stream_id: Optional[str] = None,
) -> StorageReceipt:
    """
    Write a milestone evidence bundle to 0G Storage.

    Env vars (all optional for MVP mode):
        # Preferred (official SDK/CLI naming)
        ZERO_G_EVM_RPC_URL     — 0G Chain EVM RPC endpoint
        ZERO_G_INDEXER_RPC     — 0G Storage indexer RPC endpoint
        ZERO_G_PRIVATE_KEY     — signer private key (0x...)
        ZERO_G_STREAM_ID       — KV stream ID (optional)

        # Backwards-compat aliases
        ETH_RPC_URL            — chain RPC (used if ZERO_G_EVM_RPC_URL not set)
        ZERO_G_INDEXER_URL     — indexer URL (used if ZERO_G_INDEXER_RPC not set)

    Returns a StorageReceipt.
    """
    indexer = (
        indexer_url
        or os.environ.get("ZERO_G_INDEXER_RPC")
        or os.environ.get("ZERO_G_INDEXER_URL")
        or ""
    )
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

    # 1) Upload to 0G Storage (preferred: official CLI, fallback: best-effort HTTP).
    root = ""
    root = _upload_via_cli_if_available(file_path=file_path, indexer_rpc=indexer)
    if not root:
        root = _upload_via_http_best_effort(indexer_url=indexer, bundle=bundle)

    kv_key = f"weft:milestone:{milestone_hash}:latest"
    # 2) KV write (best-effort). If this endpoint is not available, we still return receipt.
    if s_id:
        # Keep KV payload minimal to avoid delimiter/encoding pitfalls:
        # store only the log root, and fetch the full attestation via that root.
        if root:
            _kv_write_root_pointer(indexer_rpc=indexer, stream_id=s_id, key=kv_key, root=root)

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


def _upload_via_cli_if_available(*, file_path: Optional[str], indexer_rpc: str) -> str:
    """
    Uses the official 0g-storage-client CLI when available.
    Returns root hash (0x...) or empty string.
    """
    if not file_path:
        return ""
    bin_path = shutil.which("0g-storage-client")
    if not bin_path:
        return ""

    evm_rpc = os.environ.get("ZERO_G_EVM_RPC_URL") or os.environ.get("ETH_RPC_URL") or ""
    private_key = os.environ.get("ZERO_G_PRIVATE_KEY") or os.environ.get("PRIVATE_KEY") or ""
    if not evm_rpc or not private_key:
        return ""

    try:
        proc = subprocess.run(
            [
                bin_path,
                "upload",
                "--url",
                evm_rpc,
                "--key",
                private_key,
                "--indexer",
                indexer_rpc,
                "--file",
                file_path,
            ],
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            text=True,
            check=True,
        )
        # CLI prints at least one 0x<32-byte-root>
        m = re.search(r"0x[a-fA-F0-9]{64}", proc.stdout)
        return m.group(0) if m else ""
    except Exception:
        return ""


def _upload_via_http_best_effort(*, indexer_url: str, bundle: Dict[str, Any]) -> str:
    """
    Legacy fallback for deployments exposing a custom /upload endpoint.
    Returns root hash or empty string.
    """
    try:
        req = urllib.request.Request(
            indexer_url.rstrip("/") + "/upload",
            data=json.dumps(bundle).encode("utf-8"),
            headers={"Content-Type": "application/json"},
            method="POST",
        )
        with urllib.request.urlopen(req, timeout=60) as resp:
            result = json.loads(resp.read().decode("utf-8"))
        return result.get("root") or result.get("logRoot") or result.get("evidenceRoot") or ""
    except Exception:
        return ""


def _kv_write_root_pointer(*, indexer_rpc: str, stream_id: str, key: str, root: str) -> None:
    """
    Prefer official CLI for KV writes when available; otherwise best-effort HTTP /kv/put.
    """
    bin_path = shutil.which("0g-storage-client")
    evm_rpc = os.environ.get("ZERO_G_EVM_RPC_URL") or os.environ.get("ETH_RPC_URL") or ""
    private_key = os.environ.get("ZERO_G_PRIVATE_KEY") or os.environ.get("PRIVATE_KEY") or ""

    if bin_path and evm_rpc and private_key:
        try:
            subprocess.run(
                [
                    bin_path,
                    "kv-write",
                    "--url",
                    evm_rpc,
                    "--key",
                    private_key,
                    "--indexer",
                    indexer_rpc,
                    "--stream-id",
                    stream_id,
                    "--stream-keys",
                    key,
                    "--stream-values",
                    root,
                ],
                stdout=subprocess.DEVNULL,
                stderr=subprocess.DEVNULL,
                check=True,
            )
            return
        except Exception:
            pass

    # Fallback: custom HTTP KV put (deployment-specific).
    try:
        _kv_put(indexer_rpc, stream_id, key, {"root": root})
    except Exception:
        pass
