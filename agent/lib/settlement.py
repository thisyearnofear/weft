# SPDX-License-Identifier: MIT
"""Settlement rail protocol — EVM and Canton adapters implement this interface."""

from __future__ import annotations

import os
from typing import List, Optional, Protocol, runtime_checkable

from .domain.models import MilestoneViewModel, SettlementReceipt, VerdictPayload


@runtime_checkable
class SettlementRail(Protocol):
    """Rail-agnostic settlement operations (create → stake → verdict → release/refund)."""

    name: str

    def read_milestone(self, milestone_id: str) -> Optional[MilestoneViewModel]:
        ...

    def create_milestone(
        self,
        *,
        milestone_id: str,
        project_id: str,
        template_id: str,
        deadline: int,
        metadata_hash: str,
        builder: str,
        verifiers: List[str],
        observers: List[str],
        quorum: int = 2,
    ) -> SettlementReceipt:
        ...

    def stake(self, milestone_id: str, *, funder: str, amount: str) -> SettlementReceipt:
        ...

    def submit_verdict(self, milestone_id: str, verdict: VerdictPayload) -> SettlementReceipt:
        ...

    def release(self, milestone_id: str) -> SettlementReceipt:
        ...

    def refund(self, milestone_id: str) -> SettlementReceipt:
        ...


def get_settlement_rail_name() -> str:
    """Return configured rail: evm (default) or canton."""
    raw = (os.environ.get("WEFT_SETTLEMENT_RAIL") or "evm").strip().lower()
    if raw in ("canton", "daml"):
        return "canton"
    return "evm"


def get_settlement_rail() -> SettlementRail:
    """
    Factory for the active settlement rail.

    WEFT_SETTLEMENT_RAIL=evm|canton (default: evm)
    """
    rail = get_settlement_rail_name()
    if rail == "canton":
        from .canton_client import CantonSettlement

        return CantonSettlement.from_env()
    from .evm_settlement import EvmSettlement

    return EvmSettlement.from_env()
