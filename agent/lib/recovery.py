#!/usr/bin/env python3
# SPDX-License-Identifier: MIT

"""
Recovery event log for Weft verifier agents.

Captures every failure + recovery action taken during verification,
exposing a structured timeline that the frontend can poll and display.
"""

from __future__ import annotations

import time
import threading
from dataclasses import dataclass, field, asdict
from enum import Enum
from typing import Any, Dict, List, Optional


class EventType(str, Enum):
    RPC_TIMEOUT = "rpc_timeout"
    RPC_FALLBACK = "rpc_fallback"
    PEER_OFFLINE = "peer_offline"
    PEER_REROUTE = "peer_reroute"
    KIMI_UNAVAILABLE = "kimi_unavailable"
    KIMI_CACHE_HIT = "kimi_cache_hit"
    KEEPERHUB_503 = "keeperhub_503"
    KEEPERHUB_RETRY = "keeperhub_retry"
    KEEPERHUB_CONFIRMED = "keeperhub_confirmed"
    CONSENSUS_DEGRADED = "consensus_degraded"
    CONSENSUS_RECOVERED = "consensus_recovered"
    VERDICT_SUBMITTED = "verdict_submitted"
    VERIFICATION_STARTED = "verification_started"
    EVIDENCE_COLLECTED = "evidence_collected"
    NARRATIVE_GENERATED = "narrative_generated"
    CHAOS_INJECTED = "chaos_injected"


class Outcome(str, Enum):
    SUCCESS = "success"
    DEGRADED = "degraded"
    FAILED = "failed"
    PENDING = "pending"


@dataclass
class RecoveryEvent:
    timestamp: float
    event: EventType
    context: Dict[str, Any] = field(default_factory=dict)
    action: str = ""
    target: str = ""
    outcome: Outcome = Outcome.SUCCESS
    latency_ms: int = 0

    def to_dict(self) -> Dict[str, Any]:
        d = asdict(self)
        d["event"] = self.event.value
        d["outcome"] = self.outcome.value
        return d


from .hydradb_client import get_client as get_hydradb

class RecoveryLog:
    """Thread-safe append-only recovery event log."""

    def __init__(self) -> None:
        self._events: List[RecoveryEvent] = []
        self._lock = threading.Lock()
        self._hydra = get_hydradb()

    def emit(
        self,
        event: EventType,
        *,
        context: Optional[Dict[str, Any]] = None,
        action: str = "",
        target: str = "",
        outcome: Outcome = Outcome.SUCCESS,
        latency_ms: int = 0,
    ) -> RecoveryEvent:
        entry = RecoveryEvent(
            timestamp=time.time(),
            event=event,
            context=context or {},
            action=action,
            target=target,
            outcome=outcome,
            latency_ms=latency_ms,
        )
        with self._lock:
            self._events.append(entry)
        
        # Capture in HydraDB for long-term operational memory
        if self._hydra:
            text = f"Recovery Event: {event.value}."
            if action:
                text += f" Action taken: {action}."
            if target:
                text += f" Target: {target}."
            if outcome != Outcome.SUCCESS:
                text += f" Outcome: {outcome.value}."
            
            self._hydra.capture(
                text=text,
                metadata={
                    "event_type": event.value,
                    "outcome": outcome.value,
                    "latency_ms": latency_ms,
                    "target": target,
                    **entry.context
                },
                modality="event"
            )

        return entry

    def events(self, since: float = 0) -> List[Dict[str, Any]]:
        with self._lock:
            return [e.to_dict() for e in self._events if e.timestamp > since]

    def clear(self) -> None:
        with self._lock:
            self._events.clear()

    def summary(self) -> Dict[str, Any]:
        with self._lock:
            total = len(self._events)
            failures = sum(1 for e in self._events if e.outcome == Outcome.FAILED)
            recoveries = sum(
                1 for e in self._events
                if e.event in (
                    EventType.RPC_FALLBACK,
                    EventType.PEER_REROUTE,
                    EventType.KIMI_CACHE_HIT,
                    EventType.KEEPERHUB_RETRY,
                    EventType.CONSENSUS_RECOVERED,
                )
            )
            return {
                "totalEvents": total,
                "failures": failures,
                "recoveries": recoveries,
                "verdictLanded": any(
                    e.event == EventType.VERDICT_SUBMITTED for e in self._events
                ),
            }

    def recall_insights(self, query: str = "What are the most frequent infrastructure failures?") -> str:
        """Query HydraDB for historical operational insights."""
        if not self._hydra:
            return "HydraDB not configured."
        return self._hydra.recall(query)


# Global singleton — all modules emit to this log
_global_log = RecoveryLog()


def get_recovery_log() -> RecoveryLog:
    return _global_log


def emit(
    event: EventType,
    *,
    context: Optional[Dict[str, Any]] = None,
    action: str = "",
    target: str = "",
    outcome: Outcome = Outcome.SUCCESS,
    latency_ms: int = 0,
) -> RecoveryEvent:
    """Convenience: emit to the global recovery log."""
    return _global_log.emit(
        event,
        context=context,
        action=action,
        target=target,
        outcome=outcome,
        latency_ms=latency_ms,
    )
