# SPDX-License-Identifier: MIT
"""Tests for the AgenticIdClient (ERC-7857-inspired verifier tokenization)."""

import os
import pytest
from unittest.mock import patch, MagicMock

from agent.lib import agentic_id_client as mod
from agent.lib import AgenticIdClient, VerifierStats, agentic_id_configured, get_agentic_id_address
from agent.lib.abi import chunk_words


CONTRACT = "0x000000000000000000000000000000000000a111"
VERIFIER = "0xdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef"
OTHER = "0x000000000000000000000000000000000000b222"


class TestVerifierStats:
    def test_from_words_decodes_six_words(self):
        # milestonesVerified=1, quorumParticipated=2, lastEvidenceRoot=0xab..., lastActiveAt=100, mintedAt=50, metadataRoot=0xcd...
        words = [
            (1).to_bytes(32, "big"),
            (2).to_bytes(32, "big"),
            bytes.fromhex("ab" * 32),
            (100).to_bytes(32, "big"),
            (50).to_bytes(32, "big"),
            bytes.fromhex("cd" * 32),
        ]
        s = VerifierStats.from_words(words)
        assert s.milestones_verified == 1
        assert s.quorum_participated == 2
        assert s.last_evidence_root == "0x" + "ab" * 32
        assert s.last_active_at == 100
        assert s.minted_at == 50
        assert s.metadata_root == "0x" + "cd" * 32

    def test_from_words_rejects_wrong_count(self):
        with pytest.raises(RuntimeError, match="expected 6 words"):
            VerifierStats.from_words([bytes(32)] * 5)


class TestAgenticIdClientReads:
    def _make_client(self, return_hex):
        """Build a client whose rpc.call returns the given hex string for eth_call."""
        from agent.lib.jsonrpc import JsonRpcClient
        rpc = MagicMock(spec=JsonRpcClient)
        rpc.call.return_value = return_hex
        return AgenticIdClient(rpc, CONTRACT)

    def test_weft_milestone_decodes_address(self):
        # address is right-aligned in 32 bytes
        addr_hex = "0x" + "00" * 12 + "00" * 8 + "abcdef" + "00" * 9
        client = self._make_client(addr_hex)
        # The actual decode_address pulls the last 20 bytes
        result = client.weft_milestone()
        assert result.startswith("0x")
        assert len(result) == 42

    def test_total_agents_decodes_uint(self):
        client = self._make_client("0x" + "00" * 31 + "05")
        assert client.total_agents() == 5

    def test_token_of_zero_when_not_minted(self):
        client = self._make_client("0x" + "00" * 32)
        assert client.token_of(VERIFIER) == 0

    def test_token_of_returns_token_id(self):
        client = self._make_client("0x" + "00" * 31 + "03")
        assert client.token_of(VERIFIER) == 3

    def test_get_stats_decodes_six_words(self):
        # Build a 6-word return: verified=2, participated=3, root=0xab.., lastActive=999, mintedAt=111, meta=0xcd..
        words = [
            (2).to_bytes(32, "big"),
            (3).to_bytes(32, "big"),
            bytes.fromhex("ab" * 32),
            (999).to_bytes(32, "big"),
            (111).to_bytes(32, "big"),
            bytes.fromhex("cd" * 32),
        ]
        hex_data = "0x" + b"".join(words).hex()
        client = self._make_client(hex_data)
        s = client.get_stats(token_id=1)
        assert s.milestones_verified == 2
        assert s.quorum_participated == 3
        assert s.last_evidence_root == "0x" + "ab" * 32
        assert s.last_active_at == 999
        assert s.minted_at == 111
        assert s.metadata_root == "0x" + "cd" * 32

    def test_stats_of_verifier_caches(self):
        words = [
            (1).to_bytes(32, "big"),
            (1).to_bytes(32, "big"),
            bytes.fromhex("ab" * 32),
            (100).to_bytes(32, "big"),
            (50).to_bytes(32, "big"),
            bytes.fromhex("cd" * 32),
        ]
        hex_data = "0x" + b"".join(words).hex()
        client = self._make_client(hex_data)

        s1 = client.stats_of_verifier(VERIFIER, use_cache=True)
        assert rpc_call_count(client) == 1

        # Second call should use cache
        s2 = client.stats_of_verifier(VERIFIER, use_cache=True)
        assert rpc_call_count(client) == 1
        assert s2 == s1

        # Bypass cache
        s3 = client.stats_of_verifier(VERIFIER, use_cache=False)
        assert rpc_call_count(client) == 2

    def test_stats_of_verifier_lowercase_key(self):
        # Verifier with uppercase hex should be cached under lowercase key
        words = [bytes(32)] * 6
        hex_data = "0x" + b"".join(words).hex()
        client = self._make_client(hex_data)

        client.stats_of_verifier("0xDEADBEEFDEADBEEFDEADBEEFDEADBEEFDEADBEEF", use_cache=True)
        # Different-case same address should hit cache
        s = client.stats_of_verifier("0xdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef", use_cache=True)
        assert rpc_call_count(client) == 1


def rpc_call_count(client: AgenticIdClient) -> int:
    return client.rpc.call.call_count


class TestAgenticIdClientWriteEncoders:
    def test_encode_mint_selector_and_args(self):
        calldata = AgenticIdClient.encode_mint(VERIFIER, "0x" + "ab" * 32)
        # Selector for mint(address,bytes32) is 0x2cfd3005
        assert calldata.startswith("0x2cfd3005")
        # 4 bytes selector + 32 bytes address + 32 bytes bytes32 = 68 bytes hex = 136 chars + 0x
        assert len(calldata) == 2 + 136

    def test_encode_mint_default_metadata_root(self):
        calldata = AgenticIdClient.encode_mint(VERIFIER)
        # Last 64 hex chars (32 bytes) should be all zeros
        assert calldata[-64:] == "00" * 32

    def test_encode_set_weft_milestone_selector(self):
        calldata = AgenticIdClient.encode_set_weft_milestone(CONTRACT)
        # Selector for setWeftMilestone(address) is 0xde2e4816
        assert calldata.startswith("0xde2e4816")
        assert len(calldata) == 2 + 4 * 2 + 64  # selector + one 32-byte word

    def test_encode_record_verdict_selector_and_args(self):
        calldata = AgenticIdClient.encode_record_verdict(VERIFIER, True, "0x" + "cd" * 32)
        # Selector for recordVerdict(address,bool,bytes32) is 0xa1fc56ef
        assert calldata.startswith("0xa1fc56ef")
        # 4 + 32 + 32 + 32 bytes = 100 bytes hex = 200 chars + 0x
        assert len(calldata) == 2 + 200

    def test_encode_record_verdict_bool_encoding(self):
        true_calldata = AgenticIdClient.encode_record_verdict(VERIFIER, True, "0x" + "00" * 32)
        false_calldata = AgenticIdClient.encode_record_verdict(VERIFIER, False, "0x" + "00" * 32)
        # The bool word (positions 8-72 in hex after 0x + 8 char selector) should differ
        # Selector is 8 chars (4 bytes), then 64 chars for address, then 64 chars for bool
        true_bool_word = true_calldata[2 + 8 + 64 : 2 + 8 + 64 + 64]
        false_bool_word = false_calldata[2 + 8 + 64 : 2 + 8 + 64 + 64]
        assert int(true_bool_word, 16) == 1
        assert int(false_bool_word, 16) == 0

    def test_encode_update_metadata_root_selector(self):
        calldata = AgenticIdClient.encode_update_metadata_root(1, "0x" + "ef" * 32)
        # Selector for updateMetadataRoot(uint256,bytes32) is 0x8d1105bf
        assert calldata.startswith("0x8d1105bf")
        assert len(calldata) == 2 + 8 + 128  # selector + two 32-byte words


class TestEnvConfiguration:
    def test_agentic_id_configured_false_when_unset(self, monkeypatch):
        monkeypatch.delenv("WEFT_AGENTIC_ID_ADDRESS", raising=False)
        assert agentic_id_configured() is False
        assert get_agentic_id_address() is None

    def test_agentic_id_configured_true_when_set(self, monkeypatch):
        monkeypatch.setenv("WEFT_AGENTIC_ID_ADDRESS", CONTRACT)
        assert agentic_id_configured() is True
        assert get_agentic_id_address() == CONTRACT

    def test_get_agentic_id_address_adds_0x_prefix(self, monkeypatch):
        monkeypatch.setenv("WEFT_AGENTIC_ID_ADDRESS", "1234567890abcdef1234567890abcdef12345678")
        result = get_agentic_id_address()
        assert result is not None
        assert result.startswith("0x")


class TestEdgeCases:
    def test_encode_mint_rejects_bad_address(self):
        with pytest.raises(ValueError, match="address must be 20 bytes"):
            AgenticIdClient.encode_mint("0xdead", "0x" + "00" * 32)

    def test_encode_mint_rejects_bad_bytes32(self):
        # 31 bytes instead of 32 — valid hex, wrong length
        with pytest.raises(ValueError, match="bytes32 must be 32 bytes"):
            AgenticIdClient.encode_mint(VERIFIER, "0x" + "ab" * 31)

    def test_encode_record_verdict_rejects_negative_uint(self):
        # encode_record_verdict only takes bool + bytes32, no uint256 to test negative.
        # Test the uint256 encoder indirectly via update_metadata_root with negative.
        with pytest.raises(ValueError, match="uint256 must be non-negative"):
            AgenticIdClient.encode_update_metadata_root(-1, "0x" + "00" * 32)
