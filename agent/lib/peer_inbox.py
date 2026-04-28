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
    signature: Optional[str] = None


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


def verdicts_for_milestone(
    milestone_hash: str,
    inbox_dir: Optional[str] = None,
) -> List[PeerVerdict]:
    return [v for v in iter_peer_verdicts(inbox_dir) if v.milestone_hash.lower() == milestone_hash.lower()]


def group_verdicts(
    milestone_hash: str,
    inbox_dir: Optional[str] = None,
) -> List[VerdictGroup]:
    """
    Groups verdicts for a milestone by (verified, evidenceRoot), deduped by nodeAddress.
    """
    verdicts = verdicts_for_milestone(milestone_hash, inbox_dir=inbox_dir)
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


def consensus_signers_for_base_root(
    *,
    milestone_hash: str,
    verified: bool,
    base_evidence_root: str,
    inbox_dir: Optional[str] = None,
) -> List[PeerVerdict]:
    """
    Returns peer verdicts whose envelope matches the expected (milestoneHash, verified, baseEvidenceRoot)
    and includes a signature. Sorted deterministically by node_address.
    """
    target_root = base_evidence_root.lower()
    target_verified = bool(verified)
    verdicts = verdicts_for_milestone(milestone_hash, inbox_dir=inbox_dir)
    filtered = [
        v
        for v in verdicts
        if bool(v.verified) == target_verified
        and v.evidence_root.lower() == target_root
        and v.signature is not None
    ]
    filtered.sort(key=lambda v: v.node_address.lower())
    return filtered


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
            signature=str(payload.get("signature")) if payload.get("signature") else None,
        )
    except Exception:
        return None
