#!/usr/bin/env python3
# SPDX-License-Identifier: MIT

"""
Canonical Weft verdict envelope + signing/verification helpers.

Design:
- Deterministic message serialization (canonical JSON) -> stable signature target
- Use `cast wallet sign/verify` to avoid Python crypto deps (PREVENT BLOAT)
"""

from __future__ import annotations

import json
import os
import subprocess
from typing import Any, Dict, Optional, Tuple


def build_verdict_envelope(
    *,
    milestone_hash: str,
    verified: bool,
    evidence_root: str,
    node_address: str,
    timestamp: int,
) -> Dict[str, Any]:
    return {
        "type": "weft.verdict",
        "milestoneHash": milestone_hash,
        "verified": bool(verified),
        "evidenceRoot": evidence_root,
        "nodeAddress": node_address,
        "timestamp": int(timestamp),
    }


def canonical_message(envelope: Dict[str, Any]) -> str:
    """
    Deterministic JSON serialization used for signing/verifying.
    Excludes the 'signature' field if present.
    """
    msg_obj = dict(envelope)
    msg_obj.pop("signature", None)
    return json.dumps(msg_obj, sort_keys=True, separators=(",", ":"), ensure_ascii=False)


def sign_envelope(envelope: Dict[str, Any], private_key: Optional[str] = None) -> Dict[str, Any]:
    """
    Adds `signature` field in-place and returns envelope.
    Signature scheme: `cast wallet sign <message>` (EIP-191 prefix + hash).
    """
    key = private_key or os.environ.get("AXL_SIGNING_KEY") or os.environ.get("AXL_PRIVATE_KEY") or os.environ.get("PRIVATE_KEY") or ""
    if not key:
        return envelope

    msg = canonical_message(envelope)
    sig = _cast_wallet_sign(msg, key)
    if sig:
        envelope["signature"] = sig
    return envelope


def verify_envelope(envelope: Dict[str, Any]) -> Tuple[bool, str]:
    """
    Verifies envelope signature using `cast wallet verify`.
    Returns (ok, reason).
    """
    sig = envelope.get("signature")
    if not sig:
        return False, "missing_signature"

    addr = envelope.get("nodeAddress")
    if not (isinstance(addr, str) and addr.startswith("0x") and len(addr) == 42):
        return False, "invalid_nodeAddress"

    msg = canonical_message(envelope)
    ok = _cast_wallet_verify(msg, sig, addr)
    return (True, "") if ok else (False, "signature_invalid")


def _cast_wallet_sign(message: str, private_key: str) -> str:
    try:
        proc = subprocess.run(
            ["cast", "wallet", "sign", "--private-key", private_key, message],
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            text=True,
            check=False,
        )
        if proc.returncode != 0:
            return ""
        # output is a single 0x... signature
        out = proc.stdout.strip().splitlines()[-1].strip()
        return out if out.startswith("0x") else ""
    except Exception:
        return ""


def _cast_wallet_verify(message: str, signature: str, address: str) -> bool:
    try:
        proc = subprocess.run(
            ["cast", "wallet", "verify", "--address", address, message, signature],
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
            text=True,
            check=False,
        )
        return proc.returncode == 0
    except Exception:
        return False

