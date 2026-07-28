#!/usr/bin/env python3
# SPDX-License-Identifier: MIT

"""
OKX.AI Agent-to-Agent (A2A) escrow verifier adapter for Weft.

OKX's Agent Payments Protocol (APP) escrow contracts are not yet public.
This module therefore defines a pluggable interface and a concrete fallback
implementation that uses WeftMilestone as the escrow contract. When OKX APP
contracts become available, a new adapter can be swapped in without changing
Weft's verification logic.

Responsibilities:
- Represent an A2A escrow task (buyer, seller, terms, funds)
- Delegate verification to Weft's existing evidence pipeline
- Authorize escrow release or refund based on deterministic evidence rules
- Charge a verification fee (default 2.5% of released capital)
- Provide hooks for OKX Evaluator dispute escalation
"""

from __future__ import annotations

import json
import os
from dataclasses import dataclass, field
from enum import Enum
from typing import Any, Dict, List, Optional, Protocol


# ---------------------------------------------------------------------------
# Types
# ---------------------------------------------------------------------------

class EscrowStatus(Enum):
    PENDING = "pending"
    VERIFIED = "verified"
    RELEASED = "released"
    REFUNDED = "refunded"
    DISPUTED = "disputed"


@dataclass(frozen=True)
class A2ATask:
    """Description of an A2A task escrowed onchain."""
    task_id: str
    buyer: str
    seller: str
    escrow_address: str
    chain_id: int
    amount: str          # raw amount in smallest unit
    currency: str        # e.g. "USDC"
    terms: Dict[str, Any] = field(default_factory=dict)
    deadline: Optional[int] = None


@dataclass(frozen=True)
class VerificationResult:
    """Outcome of Weft verification for an A2A task."""
    verified: bool
    evidence_hash: str
    evidence_url: Optional[str]
    confidence: int      # 0-100
    reason: str


@dataclass(frozen=True)
class SettlementResult:
    """Result of an escrow release/refund action."""
    ok: bool
    status: EscrowStatus
    tx_hash: str = ""
    fee_amount: str = "0"
    error: str = ""


# ---------------------------------------------------------------------------
# Escrow adapter protocol
# ---------------------------------------------------------------------------

class EscrowAdapter(Protocol):
    """Pluggable escrow adapter."""

    def release(self, task: A2ATask, result: VerificationResult) -> SettlementResult:
        """Release escrowed funds to the seller after successful verification."""
        ...

    def refund(self, task: A2ATask, result: VerificationResult) -> SettlementResult:
        """Refund escrowed funds to the buyer after failed verification."""
        ...

    def dispute(self, task: A2ATask, reason: str) -> SettlementResult:
        """Escalate to OKX Evaluators (or local dispute mechanism)."""
        ...


# ---------------------------------------------------------------------------
# WeftMilestone fallback adapter
# ---------------------------------------------------------------------------

class WeftMilestoneEscrowAdapter:
    """
    Fallback escrow adapter that uses WeftMilestone as the escrow contract.

    Maps A2A task fields to WeftMilestone concepts:
      - task_id  -> milestoneHash
      - seller   -> builder
      - buyer(s) -> backers (staked onchain)
      - deadline -> milestone.deadline
      - terms    -> template inputs + metadataHash
    """

    def __init__(self, *, rpc_url: str = "", contract_address: str = "", private_key: str = "") -> None:
        self.rpc_url = rpc_url or os.environ.get("ETH_RPC_URL", "")
        self.contract_address = contract_address or os.environ.get("WEFT_CONTRACT_ADDRESS", "")
        self.private_key = private_key or os.environ.get("PRIVATE_KEY", "")

    def release(self, task: A2ATask, result: VerificationResult) -> SettlementResult:
        if not result.verified:
            return SettlementResult(
                ok=False,
                status=EscrowStatus.PENDING,
                error="Cannot release escrow for unverified task",
            )
        try:
            # In production this calls KeeperHub or cast send release(bytes32).
            # For now, we delegate to the existing settlement path.
            from .evm_settlement import EvmSettlement

            rail = EvmSettlement(
                rpc_url=self.rpc_url,
                contract_address=self.contract_address,
                private_key=self.private_key,
            )
            # Weft's submit_verdict path is not used here; we just release.
            receipt = rail.release(task.task_id)
            if not receipt.ok:
                return SettlementResult(ok=False, status=EscrowStatus.PENDING, error=receipt.error or "release failed")
            fee = self._compute_fee(task.amount)
            return SettlementResult(
                ok=True,
                status=EscrowStatus.RELEASED,
                tx_hash=receipt.reference,
                fee_amount=str(fee),
            )
        except Exception as e:
            return SettlementResult(ok=False, status=EscrowStatus.PENDING, error=str(e))

    def refund(self, task: A2ATask, result: VerificationResult) -> SettlementResult:
        try:
            from .evm_settlement import EvmSettlement
            rail = EvmSettlement(
                rpc_url=self.rpc_url,
                contract_address=self.contract_address,
                private_key=self.private_key,
            )
            # WeftMilestone refund is not implemented in EvmSettlement v1,
            # so this returns a clear error.
            receipt = rail.refund(task.task_id)
            if not receipt.ok:
                return SettlementResult(ok=False, status=EscrowStatus.PENDING, error=receipt.error or "refund failed")
            return SettlementResult(ok=True, status=EscrowStatus.REFUNDED, tx_hash=receipt.reference)
        except Exception as e:
            return SettlementResult(ok=False, status=EscrowStatus.PENDING, error=str(e))

    def dispute(self, task: A2ATask, reason: str) -> SettlementResult:
        # Hook for OKX Evaluator escalation once API is public.
        return SettlementResult(
            ok=False,
            status=EscrowStatus.DISPUTED,
            error=f"Dispute escalation not implemented yet (reason: {reason}). OKX Evaluator API unavailable.",
        )

    def _compute_fee(self, amount: str) -> int:
        try:
            fee_bps = int(os.environ.get("WEFT_FEE_BPS", "250"))  # 2.5%
            return int(amount) * fee_bps // 10000
        except Exception:
            return 0


# ---------------------------------------------------------------------------
# OKX APP adapter (stub for when contracts are public)
# ---------------------------------------------------------------------------

class OkxAppEscrowAdapter:
    """
    Placeholder for OKX APP escrow integration.

    Once OKX releases the APP escrow contract ABI/addresses, this class will:
      - call the OKX escrow contract's verify() or release() functions
      - route disputes to OKX Evaluators
      - settle fees in USDC on X Layer
    """

    def __init__(self, *, broker_url: str = "", contract_address: str = "") -> None:
        self.broker_url = broker_url or os.environ.get("OKX_APP_BROKER_URL", "")
        self.contract_address = contract_address or os.environ.get("OKX_A2A_ESCROW_CONTRACT", "")

    def release(self, task: A2ATask, result: VerificationResult) -> SettlementResult:
        return SettlementResult(
            ok=False,
            status=EscrowStatus.PENDING,
            error="OKX APP escrow adapter not implemented — contract ABI unavailable",
        )

    def refund(self, task: A2ATask, result: VerificationResult) -> SettlementResult:
        return SettlementResult(
            ok=False,
            status=EscrowStatus.PENDING,
            error="OKX APP escrow adapter not implemented — contract ABI unavailable",
        )

    def dispute(self, task: A2ATask, reason: str) -> SettlementResult:
        return SettlementResult(
            ok=False,
            status=EscrowStatus.DISPUTED,
            error="OKX Evaluator dispute escalation not implemented — API unavailable",
        )


# ---------------------------------------------------------------------------
# Verifier orchestrator
# ---------------------------------------------------------------------------

class A2AVerifier:
    """
    High-level service: verify an A2A task and settle the escrow.

    Usage:
        verifier = A2AVerifier(adapter=WeftMilestoneEscrowAdapter())
        result = verifier.verify_and_settle(task)
    """

    def __init__(self, adapter: EscrowAdapter) -> None:
        self.adapter = adapter

    def verify_and_settle(self, task: A2ATask) -> SettlementResult:
        # Collect deterministic evidence using existing Weft pipeline.
        # For now, build a synthetic result from task terms.
        result = self._verify(task)
        if result.verified:
            return self.adapter.release(task, result)
        return self.adapter.refund(task, result)

    def _verify(self, task: A2ATask) -> VerificationResult:
        # TODO: wire to weft_collect_attestation.py / mvp_verifier.py
        # For the MVP adapter, we trust the task terms if a delivery hash is present.
        delivery_hash = task.terms.get("deliveryHash")
        if delivery_hash:
            return VerificationResult(
                verified=True,
                evidence_hash=delivery_hash,
                evidence_url=task.terms.get("evidenceUrl"),
                confidence=80,
                reason="delivery hash present (MVP deterministic rule)",
            )
        return VerificationResult(
            verified=False,
            evidence_hash="",
            evidence_url=None,
            confidence=0,
            reason="no delivery hash in task terms",
        )


def get_escrow_adapter() -> EscrowAdapter:
    """Return the configured escrow adapter."""
    adapter_type = os.environ.get("OKX_A2A_ADAPTER", "weft_milestone").lower()
    if adapter_type == "okx_app":
        return OkxAppEscrowAdapter()
    return WeftMilestoneEscrowAdapter()
