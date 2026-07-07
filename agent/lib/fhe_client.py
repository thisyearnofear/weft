#!/usr/bin/env python3
# SPDX-License-Identifier: MIT
"""
FHE client for confidential milestone votes.

Calls the Node.js helper (fhe_encrypt_vote.mjs) to encrypt the verifier's
boolean vote using the Zama SDK, then submits the encrypted verdict to
WeftMilestoneConfidential on Sepolia.

DRY: Single source of truth for all FHE vote encryption + submission.
MODULAR: Independent, testable module — no external pip dependencies.
CLEAN: Clear separation from the public vote path (cast send).
ENHANCEMENT FIRST: Called only for confidential milestones; the existing
  public vote path in weft_daemon.py is unchanged.

Env vars:
  ZAMA_RELAYER_URL — Zama SDK relayer URL for Sepolia (optional, can be
    set to an empty string for local testing)
"""

from __future__ import annotations

import json
import os
import subprocess
import sys
from dataclasses import dataclass
from pathlib import Path
from typing import Optional


@dataclass
class FheVoteResult:
    """Result of an encrypted vote submission."""
    tx_hash: str
    encrypted_handle: str
    status: str  # "confirmed" or "failed"
    gas_used: str
    error: Optional[str] = None


# Path to the JS helper (relative to this module's location)
_SCRIPTS_DIR = Path(__file__).resolve().parent.parent / "scripts"
_FHE_HELPER = _SCRIPTS_DIR / "fhe_encrypt_vote.mjs"
_FHE_WEIGHTED_HELPER = _SCRIPTS_DIR / "fhe_encrypt_weighted_vote.mjs"


def fhe_available() -> bool:
    """Return True if the FHE helper script and Node.js are available."""
    if not _FHE_HELPER.exists():
        return False
    try:
        proc = subprocess.run(
            ["node", "--version"],
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            check=False,
            timeout=5,
        )
        return proc.returncode == 0
    except (FileNotFoundError, subprocess.TimeoutExpired):
        return False


def submit_encrypted_verdict(
    *,
    milestone_hash: str,
    did_complete: bool,
    evidence_root: str,
    rpc_url: str,
    private_key: str,
    contract_address: str,
) -> FheVoteResult:
    """
    Encrypt a boolean vote and submit it to WeftMilestoneConfidential.

    Calls fhe_encrypt_vote.mjs via subprocess (same pattern as cast send
    in weft_daemon.py). The JS helper uses the Zama SDK to:
    1. Encrypt the boolean as euint32 (0 or 1)
    2. Submit submitVerdict() with the encrypted handle + proof
    3. Wait for transaction confirmation
    4. Return the result as JSON

    Returns FheVoteResult with tx_hash and status.
    """
    if not fhe_available():
        return FheVoteResult(
            tx_hash="",
            encrypted_handle="",
            status="failed",
            gas_used="0",
            error="FHE helper or Node.js not available",
        )

    try:
        proc = subprocess.run(
            [
                "node",
                str(_FHE_HELPER),
                "--rpc-url", rpc_url,
                "--private-key", private_key,
                "--contract", contract_address,
                "--milestone-hash", milestone_hash,
                "--did-complete", "true" if did_complete else "false",
                "--evidence-root", evidence_root,
            ],
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            check=False,
            timeout=120,
            env={**os.environ},
        )

        # Parse JSON output from the JS helper
        output = proc.stdout.strip()
        if not output:
            stderr = proc.stderr.strip()
            return FheVoteResult(
                tx_hash="",
                encrypted_handle="",
                status="failed",
                gas_used="0",
                error=f"Empty output from FHE helper. stderr: {stderr}",
            )

        try:
            result = json.loads(output)
        except json.JSONDecodeError:
            return FheVoteResult(
                tx_hash="",
                encrypted_handle="",
                status="failed",
                gas_used="0",
                error=f"Invalid JSON from FHE helper: {output[:200]}",
            )

        if "error" in result:
            return FheVoteResult(
                tx_hash="",
                encrypted_handle="",
                status="failed",
                gas_used="0",
                error=result["error"],
            )

        return FheVoteResult(
            tx_hash=result.get("txHash", ""),
            encrypted_handle=result.get("encryptedHandle", ""),
            status=result.get("status", "unknown"),
            gas_used=result.get("gasUsed", "0"),
        )

    except subprocess.TimeoutExpired:
        return FheVoteResult(
            tx_hash="",
            encrypted_handle="",
            status="failed",
            gas_used="0",
            error="FHE helper timed out (120s)",
        )
    except Exception as e:
        return FheVoteResult(
            tx_hash="",
            encrypted_handle="",
            status="failed",
            gas_used="0",
            error=f"Unexpected error: {e}",
        )


@dataclass
class FheWeightedVoteResult:
    """Result of an encrypted weighted vote submission."""
    tx_hash: str
    encrypted_handles: list  # [didCompleteHandle, confidenceHandle]
    status: str
    gas_used: str
    error: Optional[str] = None


def submit_encrypted_weighted_verdict(
    *,
    milestone_hash: str,
    did_complete: bool,
    confidence: int,
    evidence_root: str,
    rpc_url: str,
    private_key: str,
    contract_address: str,
) -> FheWeightedVoteResult:
    """
    Encrypt a boolean vote + confidence score and submit to
    WeftMilestoneConfidentialWeighted.

    Calls fhe_encrypt_weighted_vote.mjs via subprocess. The JS helper uses
    the Zama SDK to:
    1. Batch-encrypt didComplete (0/1) and confidence (1-100) as two euint32
    2. Submit submitWeightedVerdict() with both handles + single proof
    3. Wait for transaction confirmation
    4. Return the result as JSON

    The contract computes weightedVote = FHE.mul(ballot, confidence) on
    ciphertext — the vote AND confidence AND weighted tally are all encrypted.
    """
    if not fhe_available():
        return FheWeightedVoteResult(
            tx_hash="",
            encrypted_handles=[],
            status="failed",
            gas_used="0",
            error="FHE helper or Node.js not available",
        )

    if not _FHE_WEIGHTED_HELPER.exists():
        return FheWeightedVoteResult(
            tx_hash="",
            encrypted_handles=[],
            status="failed",
            gas_used="0",
            error="Weighted FHE helper script not found",
        )

    try:
        proc = subprocess.run(
            [
                "node",
                str(_FHE_WEIGHTED_HELPER),
                "--rpc-url", rpc_url,
                "--private-key", private_key,
                "--contract", contract_address,
                "--milestone-hash", milestone_hash,
                "--did-complete", "true" if did_complete else "false",
                "--confidence", str(max(1, min(100, confidence))),
                "--evidence-root", evidence_root,
            ],
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            check=False,
            timeout=120,
            env={**os.environ},
        )

        output = proc.stdout.strip()
        if not output:
            stderr = proc.stderr.strip()
            return FheWeightedVoteResult(
                tx_hash="",
                encrypted_handles=[],
                status="failed",
                gas_used="0",
                error=f"Empty output from FHE helper. stderr: {stderr}",
            )

        try:
            result = json.loads(output)
        except json.JSONDecodeError:
            return FheWeightedVoteResult(
                tx_hash="",
                encrypted_handles=[],
                status="failed",
                gas_used="0",
                error=f"Invalid JSON from FHE helper: {output[:200]}",
            )

        if "error" in result:
            return FheWeightedVoteResult(
                tx_hash="",
                encrypted_handles=[],
                status="failed",
                gas_used="0",
                error=result["error"],
            )

        return FheWeightedVoteResult(
            tx_hash=result.get("txHash", ""),
            encrypted_handles=result.get("encryptedHandles", []),
            status=result.get("status", "unknown"),
            gas_used=result.get("gasUsed", "0"),
        )

    except subprocess.TimeoutExpired:
        return FheWeightedVoteResult(
            tx_hash="",
            encrypted_handles=[],
            status="failed",
            gas_used="0",
            error="FHE helper timed out (120s)",
        )
