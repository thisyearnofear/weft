#!/usr/bin/env python3
# SPDX-License-Identifier: MIT

"""
Chaos injection controller for Weft recovery demos.

Toggles failure flags that library code checks before making real calls.
When a flag is active, the corresponding library simulates failure and
triggers its recovery path.
"""

from __future__ import annotations

import threading
import time
from dataclasses import dataclass, field
from typing import Any, Dict, Set

from .recovery import EventType, Outcome, emit


@dataclass
class ChaosState:
    active_faults: Set[str] = field(default_factory=set)
    activated_at: Dict[str, float] = field(default_factory=dict)
    lock: threading.Lock = field(default_factory=threading.Lock)

    def inject(self, fault: str) -> None:
        with self.lock:
            self.active_faults.add(fault)
            self.activated_at[fault] = time.time()

    def clear(self, fault: str) -> None:
        with self.lock:
            self.active_faults.discard(fault)
            self.activated_at.pop(fault, None)

    def clear_all(self) -> None:
        with self.lock:
            self.active_faults.clear()
            self.activated_at.clear()

    def is_active(self, fault: str) -> bool:
        with self.lock:
            return fault in self.active_faults

    def status(self) -> Dict[str, Any]:
        with self.lock:
            return {
                "active": sorted(self.active_faults),
                "activatedAt": dict(self.activated_at),
            }


# Fault identifiers
FAULT_RPC = "kill_rpc"
FAULT_PEER = "kill_peer"
FAULT_KIMI = "kill_kimi"
FAULT_KEEPERHUB = "kill_keeperhub"

ALL_FAULTS = [FAULT_RPC, FAULT_PEER, FAULT_KIMI, FAULT_KEEPERHUB]

# Global singleton
_state = ChaosState()


def get_chaos_state() -> ChaosState:
    return _state


def inject_fault(fault: str) -> Dict[str, Any]:
    """Inject a single fault. Returns updated status."""
    if fault == "kill_all":
        for f in ALL_FAULTS:
            _state.inject(f)
        emit(
            EventType.CHAOS_INJECTED,
            context={"faults": ALL_FAULTS},
            action="kill_all",
            outcome=Outcome.SUCCESS,
        )
    elif fault in ALL_FAULTS:
        _state.inject(fault)
        emit(
            EventType.CHAOS_INJECTED,
            context={"fault": fault},
            action=fault,
            outcome=Outcome.SUCCESS,
        )
    else:
        return {"ok": False, "error": f"unknown fault: {fault}", "available": ALL_FAULTS + ["kill_all"]}

    return {"ok": True, **_state.status()}


def clear_fault(fault: str) -> Dict[str, Any]:
    """Clear a single fault or all faults."""
    if fault == "all":
        _state.clear_all()
    else:
        _state.clear(fault)
    return {"ok": True, **_state.status()}


def is_rpc_killed() -> bool:
    return _state.is_active(FAULT_RPC)


def is_peer_killed() -> bool:
    return _state.is_active(FAULT_PEER)


def is_kimi_killed() -> bool:
    return _state.is_active(FAULT_KIMI)


def is_keeperhub_killed() -> bool:
    return _state.is_active(FAULT_KEEPERHUB)
