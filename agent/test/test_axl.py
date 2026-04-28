# SPDX-License-Identifier: MIT
"""Additional agent tests for AXL client."""

import pytest

from agent.lib import (
    axl_client,
    BroadcastResult,
    VerdictMessage,
    broadcast_verdict,
    receive_verdicts,
    tally_consensus,
    parse_peers,
)


class TestAxlClient:
    def test_parse_peers_empty(self):
        assert parse_peers("") == []
        assert parse_peers(None) == []

    def test_parse_peers_with_values(self):
        assert parse_peers("http://a:9001,http://b:9001") == [
            "http://a:9001",
            "http://b:9001",
        ]

    def test_broadcast_no_peers_returns_zero(self):
        result = broadcast_verdict(
            milestone_hash="0x1234",
            verified=True,
            evidence_root="0xdead",
            node_address="0xnode",
            peers=[],
        )
        assert result.attempted == 0
        assert result.succeeded == 0

    def test_broadcast_noop_when_unset(self, monkeypatch):
        monkeypatch.delenv("AXL_PEERS", raising=False)
        result = broadcast_verdict(
            milestone_hash="0x1234",
            verified=True,
            evidence_root="0xdead",
            node_address="0xnode",
        )
        assert result.attempted == 0

    def test_verdict_message_dataclass(self):
        msg = VerdictMessage(
            milestone_hash="0x1234",
            verified=True,
            evidence_root="0xdead",
            node_address="0xnode",
            timestamp=1700000000,
        )
        assert msg.milestone_hash == "0x1234"
        assert msg.verified is True

    def test_tally_consensus_true_quorum(self):
        peer_msg = VerdictMessage(
            milestone_hash="0x1234",
            verified=True,
            evidence_root="0xdead",
            node_address="0xpeer1",
            timestamp=1700000000,
        )
        has_quorum, should_submit = tally_consensus(
            own_verdict=True,
            peer_verdicts=[peer_msg],
            quorum=2,
        )
        assert has_quorum is True
        assert should_submit is True

    def test_tally_consensus_false_quorum(self):
        peer_msg = VerdictMessage(
            milestone_hash="0x1234",
            verified=False,
            evidence_root="0xdead",
            node_address="0xpeer1",
            timestamp=1700000000,
        )
        has_quorum, should_submit = tally_consensus(
            own_verdict=True,
            peer_verdicts=[peer_msg],
            quorum=2,
        )
        assert has_quorum is False
        assert should_submit is False

    def test_tally_consensus_single_node(self):
        has_quorum, should_submit = tally_consensus(
            own_verdict=True,
            peer_verdicts=[],
            quorum=1,
        )
        assert has_quorum is True
        assert should_submit is True