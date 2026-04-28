#!/usr/bin/env python3
# SPDX-License-Identifier: MIT

"""
Deadline scheduler — polls WeftMilestone for milestones past their deadline
that haven't been finalized yet, and triggers verification.
"""

from __future__ import annotations

import os
import time
from dataclasses import dataclass
from typing import Iterator, List, Optional

from .jsonrpc import JsonRpcClient
from .weft_milestone_reader import MilestoneView, read_milestone


@dataclass(frozen=True)
class PendingMilestone:
    milestone_hash: str
    project_id: str
    builder: str
    deadline: int


class DeadlineScheduler:
    """
    Polls WeftMilestone for milestones past their deadline awaiting finalization.

    Env vars:
        ETH_RPC_URL     — RPC URL (required)
        POLL_INTERVAL   — seconds between polls (default: 3600)
        VERIFIER_ADDRESS — this node's address (for filtering)
    """

    def __init__(
        self,
        rpc: JsonRpcClient,
        contract_address: str,
        poll_interval: int = 3600,
    ):
        self.rpc              = rpc
        self.contract_address = contract_address
        self.poll_interval   = poll_interval

    def pending_milestones(self) -> Iterator[PendingMilestone]:
        """
        Yield milestones that are past their deadline and not yet finalized.
        Uses binary search on blocks to find the deadline transition.
        """
        latest_block = self.rpc.call("eth_blockNumber", [])
        latest_ts  = self._block_timestamp(int(latest_block, 16))

        for m_hash, m in self._iter_milestones():
            if m.finalized:
                continue
            if m.deadline > latest_ts:
                continue
            yield PendingMilestone(
                milestone_hash=m_hash,
                project_id=m.project_id,
                builder=m.builder,
                deadline=m.deadline,
            )

    def poll_until_deadline(self) -> Iterator[PendingMilestone]:
        """
        Block until the next poll interval, then yield pending milestones.
        """
        time.sleep(self.poll_interval)
        yield from self.pending_milestones()

    def _iter_milestones(self) -> Iterator[tuple[str, MilestoneView]]:
        """Iterate all known milestones via Milestones topic events."""
        topic = self.rpc.call("eth_getLogs", [{
            "address": self.contract_address,
            "topics": ["0xd5576e7d6bc5e7d3e8c0f7a9b4d3e2c1f0e9d8c7b6a5948372615540454433221100"],
            "fromBlock": "0x0",
            "toBlock": "latest",
        }])

        for event in topic:
            m_hash = event["topics"][1]
            try:
                m = read_milestone(self.rpc, self.contract_address, m_hash)
                yield m_hash, m
            except Exception:
                continue

    def _block_timestamp(self, block_num: int) -> int:
        block = self.rpc.call("eth_getBlockByNumber", [hex(block_num), False])
        return int(block["timestamp"], 16)


def poll_pending_milestones(
    contract_address: str,
    poll_interval: Optional[int] = None,
) -> Iterator[PendingMilestone]:
    """
    Convenience entry point.
    """
    rpc_url = os.environ.get("ETH_RPC_URL", "http://127.0.0.1:8545")
    interval = poll_interval or int(os.environ.get("POLL_INTERVAL", "3600"))

    rpc = JsonRpcClient(rpc_url)
    scheduler = DeadlineScheduler(rpc, contract_address, interval)

    yield from scheduler.pending_milestones()