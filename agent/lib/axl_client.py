#!/usr/bin/env python3
# SPDX-License-Identifier: MIT

"""
AXL (or AXL-like) transport shim for multi-verifier coordination.

MVP goal: keep a clean boundary so we can swap the transport later without
touching verification logic.

Current behavior:
- If `AXL_PEERS` is unset: no-op.
- If set: best-effort HTTP POST of a signed-ish message envelope to each peer.

This is intentionally minimal and does not assume a specific Gensyn AXL SDK.
"""

from __future__ import annotations

import json
import os
import time
import urllib.request
from dataclasses import dataclass
from typing import Any, Dict, List, Optional


@dataclass(frozen=True)
class BroadcastResult:
    attempted: int
    succeeded: int


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

    payload: Dict[str, Any] = {
        "type": "weft.verdict",
        "milestoneHash": milestone_hash,
        "verified": bool(verified),
        "evidenceRoot": evidence_root,
        "nodeAddress": node_address,
        "timestamp": int(time.time()),
    }

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

