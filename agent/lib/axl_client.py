#!/usr/bin/env python3
# SPDX-License-Identifier: MIT

"""
AXL (or AXL-like) transport shim for multi-verifier coordination.

MVP goal: keep a clean boundary so we can swap the transport later without
touching verification logic.

Current behavior:
- If `AXL_PEERS` is unset: no-op.
- If set: best-effort HTTP POST of a signed-ish message envelope to each peer.
- Polling endpoint for receiving peer verdicts.

This is intentionally minimal and does not assume a specific Gensyn AXL SDK.
"""

from __future__ import annotations

import json
import os
import time
import urllib.request
from dataclasses import dataclass
from typing import Any, Dict, List, Optional

from .verdict_envelope import build_verdict_envelope, sign_envelope

@dataclass(frozen=True)
class BroadcastResult:
    attempted: int
    succeeded: int


@dataclass(frozen=True)
class VerdictMessage:
    milestone_hash: str
    verified: bool
    evidence_root: str
    node_address: str
    timestamp: int


def parse_peers(peers: Optional[str] = None) -> List[str]:
    raw = peers if peers is not None else (os.environ.get("AXL_PEERS") or "")
    items = [p.strip() for p in raw.split(",") if p.strip()]
    return items


def broadcast_verdict(
    *,
    milestone_hash: str,
    verified: bool,
    evidence_root: str,
    node_address: str,
    peers: Optional[List[str]] = None,
    endpoint_path: str = "/send",
) -> BroadcastResult:
    """
    Broadcast a verifier vote to peers.

    Expected peer format: "http://host:port" (we POST to <peer><endpoint_path>).
    """
    peer_list = peers if peers is not None else parse_peers()
    if not peer_list:
        return BroadcastResult(attempted=0, succeeded=0)

    endpoint_path = os.environ.get("AXL_ENDPOINT_PATH") or endpoint_path

    payload: Dict[str, Any] = build_verdict_envelope(
        milestone_hash=milestone_hash,
        verified=bool(verified),
        evidence_root=evidence_root,
        node_address=node_address,
        timestamp=int(time.time()),
    )

    # If AXL_SIGN is enabled (default), attach a signature if a key is available.
    if os.environ.get("AXL_SIGN", "1") != "0":
        payload = sign_envelope(payload)

    attempted = 0
    succeeded = 0
    for peer in peer_list:
        attempted += 1
        url = peer.rstrip("/") + endpoint_path
        try:
            req = urllib.request.Request(
                url,
                data=json.dumps(payload).encode("utf-8"),
                headers={"Content-Type": "application/json"},
                method="POST",
            )
            with urllib.request.urlopen(req, timeout=5) as _:
                succeeded += 1
        except Exception:
            continue

    return BroadcastResult(attempted=attempted, succeeded=succeeded)


def receive_verdicts(
    milestone_hash: str,
    endpoint_path: str = "/recv",
    local_port: int = 9002,
) -> List[VerdictMessage]:
    """
    Poll local AXL endpoint for incoming verdict messages.
    """
    url = f"http://127.0.0.1:{local_port}{endpoint_path}"
    try:
        req = urllib.request.Request(url, method="GET")
        with urllib.request.urlopen(req, timeout=5) as resp:
            data = json.loads(resp.read().decode("utf-8"))
        messages = data.get("messages", []) if isinstance(data, dict) else []
        return [
            VerdictMessage(
                milestone_hash=m["milestoneHash"],
                verified=m["verified"],
                evidence_root=m.get("evidenceRoot", ""),
                node_address=m.get("nodeAddress", ""),
                timestamp=m.get("timestamp", 0),
            )
            for m in messages
            if m.get("milestoneHash") == milestone_hash
        ]
    except Exception:
        return []


def tally_consensus(
    own_verdict: bool,
    peer_verdicts: List[VerdictMessage],
    quorum: int = 2,
) -> tuple[bool, bool]:
    """
    Tally verdicts and determine if quorum is reached.

    Returns (has_quorum, should_submit).
    """
    true_votes = 1 if own_verdict else 0
    for v in peer_verdicts:
        if v.verified:
            true_votes += 1

    return true_votes >= quorum, true_votes >= quorum


def register_peer(
    peer_address: str,
    peer_key: Optional[str] = None,
    local_port: int = 9002,
) -> bool:
    """
    Register this node with the AXL network.
    """
    url = f"http://127.0.0.1:{local_port}/register"
    payload = {"peerAddress": peer_address, "peerKey": peer_key or ""}
    try:
        req = urllib.request.Request(
            url,
            data=json.dumps(payload).encode("utf-8"),
            headers={"Content-Type": "application/json"},
            method="POST",
        )
        with urllib.request.urlopen(req, timeout=5) as _:
            return True
    except Exception:
        return False
