#!/usr/bin/env python3
# SPDX-License-Identifier: MIT

"""
Unified indexer client for Weft milestone state.

Enhancement-first:
- Uses existing 0G KV (when configured) and cleanly falls back to onchain reads.
- Uses canonical Weft event topics from `weft_topics.py` (single source of truth).
"""

from __future__ import annotations

import json
import os
from dataclasses import dataclass
from typing import Any, Dict, List, Optional, Iterator, Tuple

from .jsonrpc import JsonRpcClient
from .weft_milestone_reader import MilestoneView, read_milestone
from .zero_storage import read_evidence_from_storage
from .eth_rpc import latest_timestamp
from .weft_topics import MILESTONE_CREATED_TOPIC0


@dataclass(frozen=True)
class MilestoneState:
    milestone_hash: str
    project_id: str
    template_id: str
    builder: str
    deadline: int
    total_staked: int
    finalized: bool
    verified: bool
    released: bool
    verifier_count: int
    verified_votes: int
    final_evidence_root: str
    source: str  # "0g-kv" or "onchain"


class IndexerClient:
    """
    Reads Weft milestone state from 0G Storage KV or on-chain events.

    Env vars:
        ETH_RPC_URL     — RPC URL (required)
        ZERO_G_INDEXER_URL — 0G Storage indexer (optional — enables KV layer)
        ZERO_G_STREAM_ID   — KV stream ID (optional)

    Tries 0G Storage KV first when ZERO_G_STREAM_ID + ZERO_G_INDEXER_URL are set,
    falls back to on-chain via JsonRpcClient.
    """

    def __init__(
        self,
        rpc: JsonRpcClient,
        contract_address: str,
        indexer_url: Optional[str] = None,
        stream_id: Optional[str] = None,
    ):
        self.rpc              = rpc
        self.contract_address = contract_address
        self.indexer_url    = indexer_url or os.environ.get("ZERO_G_INDEXER_URL") or ""
        self.stream_id      = stream_id or os.environ.get("ZERO_G_STREAM_ID") or ""
        self._use_kv        = bool(self.indexer_url and self.stream_id)

    def get_milestone(self, milestone_hash: str) -> Optional[MilestoneState]:
        """
        Read milestone state. Tries 0G Storage KV, falls back to on-chain.
        Returns None if not found.
        """
        if self._use_kv:
            data = read_evidence_from_storage(
                milestone_hash,
                indexer_url=self.indexer_url,
                stream_id=self.stream_id,
            )
            if data:
                return _kv_to_milestone_state(milestone_hash, data, "0g-kv")

        m = _read_onchain(self.rpc, self.contract_address, milestone_hash)
        if m is None:
            return None
        return _milestone_view_to_state(milestone_hash, m, "onchain")

    def get_pending_milestones(self) -> List[MilestoneState]:
        """Get all milestones that are past deadline and not yet finalized."""
        now_ts = latest_timestamp(self.rpc)

        pending: List[MilestoneState] = []
        for m_hash, m in _iter_onchain_milestones(self.rpc, self.contract_address):
            if m.finalized:
                continue
            if m.deadline > now_ts:
                continue
            pending.append(_milestone_view_to_state(m_hash, m, "onchain"))

        return pending

    def get_builder_reputation(
        self,
        builder_address: str,
    ) -> Optional[Dict[str, Any]]:
        """
        Read builder reputation from 0G Storage KV.
        Returns None if not found or KV not configured.
        """
        if not self._use_kv:
            return None

        key = f"weft:builder:{builder_address.lower()}:reputation"
        try:
            req = __import__("urllib.request").request.Request(
                f"{self.indexer_url}/kv/get",
                data=json.dumps({"streamId": self.stream_id, "key": key}).encode("utf-8"),
                headers={"Content-Type": "application/json"},
                method="POST",
            )
            with __import__("urllib.request").urlopen(req, timeout=30) as resp:
                return json.loads(resp.read().decode("utf-8"))
        except Exception:
            return None

    @property
    def source(self) -> str:
        """Which data source is active."""
        return "0g-kv" if self._use_kv else "onchain"


def _kv_to_milestone_state(
    m_hash: str,
    data: Dict[str, Any],
    source: str,
) -> MilestoneState:
    return MilestoneState(
        milestone_hash=m_hash,
        project_id=data.get("projectId", ""),
        template_id=data.get("templateId", ""),
        builder=data.get("builder", ""),
        deadline=data.get("deadline", 0),
        total_staked=data.get("totalStaked", 0),
        finalized=data.get("finalized", False),
        verified=data.get("verified", False),
        released=data.get("released", False),
        verifier_count=data.get("verifierCount", 0),
        verified_votes=data.get("verifiedVotes", 0),
        final_evidence_root=data.get("logRoot", ""),
        source=source,
    )


def _milestone_view_to_state(
    m_hash: str,
    m: MilestoneView,
    source: str,
) -> MilestoneState:
    return MilestoneState(
        milestone_hash=m_hash,
        project_id=m.projectId,
        template_id=m.templateId,
        builder=m.builder,
        deadline=m.deadline,
        total_staked=m.totalStaked,
        finalized=m.finalized,
        verified=m.verified,
        released=m.released,
        verifier_count=m.verifierCount,
        verified_votes=m.verifiedVotes,
        final_evidence_root=m.finalEvidenceRoot,
        source=source,
    )


def _read_onchain(
    rpc: JsonRpcClient,
    contract_address: str,
    milestone_hash: str,
) -> Optional[MilestoneView]:
    try:
        return read_milestone(rpc, contract_address, milestone_hash)
    except Exception:
        return None


def _iter_onchain_milestones(
    rpc: JsonRpcClient,
    contract_address: str,
):
    """
    Scan MilestoneCreated events to discover all milestones.
    Uses indexed topic for milestoneHash.
    """
    try:
        logs = rpc.call("eth_getLogs", [{
            "address": contract_address,
            "topics": [
                # MilestoneCreated event signature
                MILESTONE_CREATED_TOPIC0,
            ],
            "fromBlock": "0x0",
            "toBlock": "latest",
        }])
        for log in logs:
            m_hash = log["topics"][1]
            try:
                m = read_milestone(rpc, contract_address, m_hash)
                yield m_hash, m
            except Exception:
                continue
    except Exception:
        return
