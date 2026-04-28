#!/usr/bin/env python3
# SPDX-License-Identifier: MIT

"""
Peer inbox utilities.

Receives and persists peer broadcasts via `weft_peer_server.py` into `agent/.inbox/`.
This module reads those files and computes simple consensus signals.

Core principles:
- DRY: single source of truth for payload structure
- CLEAN: no onchain calls here; this is pure filesystem + aggregation logic
"""

from __future__ import annotations

import json
import os
from dataclasses import dataclass
from typing import Any, Dict, Iterable, List, Optional, Set, Tuple


@dataclass(frozen=True)
class PeerVerdict:
    milestone_hash: str
    verified: bool
    evidence_root: str
    node_address: str
    timestamp: int
    source_path: str


@dataclass(frozen=True)
class VerdictGroup:
    milestone_hash: str
    verified: bool
    evidence_root: str
    node_addresses: List[str]

    @property
    def count(self) -> int:
        return len(self.node_addresses)


def default_inbox_dir() -> str:
    return os.environ.get("WEFT_INBOX_DIR") or "agent/.inbox"


def iter_peer_verdicts(inbox_dir: Optional[str] = None) -> Iterable[PeerVerdict]:
    root = inbox_dir or default_inbox_dir()
    if not os.path.isdir(root):
        return []

    out: List[PeerVerdict] = []
    for dirpath, _, filenames in os.walk(root):
        for name in filenames:
            if not name.endswith(".json"):
                continue
            path = os.path.join(dirpath, name)
            try:
                with open(path, "r", encoding="utf-8") as f:
                    payload = json.load(f)
                pv = _payload_to_peer_verdict(payload, path)
                if pv is not None:
                    out.append(pv)
            except Exception:
                continue
    return out


def group_verdicts(
    milestone_hash: str,
    inbox_dir: Optional[str] = None,
) -> List[VerdictGroup]:
    """
    Groups verdicts for a milestone by (verified, evidenceRoot), deduped by nodeAddress.
    """
    verdicts = [v for v in iter_peer_verdicts(inbox_dir) if v.milestone_hash.lower() == milestone_hash.lower()]
    buckets: Dict[Tuple[bool, str], Set[str]] = {}
    for v in verdicts:
        key = (bool(v.verified), v.evidence_root.lower())
        buckets.setdefault(key, set()).add(v.node_address.lower())

    groups: List[VerdictGroup] = []
    for (verified, root), nodes in buckets.items():
        groups.append(
            VerdictGroup(
                milestone_hash=milestone_hash,
                verified=verified,
                evidence_root=root,
                node_addresses=sorted(nodes),
            )
        )

    # Largest group first
    groups.sort(key=lambda g: g.count, reverse=True)
    return groups


def best_group(
    milestone_hash: str,
    inbox_dir: Optional[str] = None,
) -> Optional[VerdictGroup]:
    groups = group_verdicts(milestone_hash, inbox_dir=inbox_dir)
    return groups[0] if groups else None


def _payload_to_peer_verdict(payload: Dict[str, Any], path: str) -> Optional[PeerVerdict]:
    if payload.get("type") != "weft.verdict":
        return None
    try:
        return PeerVerdict(
            milestone_hash=str(payload["milestoneHash"]),
            verified=bool(payload["verified"]),
            evidence_root=str(payload["evidenceRoot"]),
            node_address=str(payload["nodeAddress"]),
            timestamp=int(payload["timestamp"]),
            source_path=path,
        )
    except Exception:
        return None

