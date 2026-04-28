# SPDX-License-Identifier: MIT
"""Tests for agent/lib modules."""

import json
import os
import pytest
from unittest.mock import patch, MagicMock

from agent.lib import (
    abi,
    github_client,
    kimi_client,
    deadline_scheduler,
    indexer_client,
    zero_storage,
    mvp_verifier,
)


class TestAbi:
    def test_encode_bytes32_valid(self):
        data = abi.encode_bytes32("0x" + "00" * 32)
        assert len(data) == 32

    def test_encode_bytes32_invalid(self):
        with pytest.raises(ValueError):
            abi.encode_bytes32("0x" + "ff" * 31)

    def test_decode_word(self):
        word = bytes.fromhex("00" * 31 + "01")
        assert abi.decode_word(word) == 1

    def test_decode_bool_true(self):
        assert abi.decode_bool(bytes(32)) is False

    def test_decode_bool_false(self):
        assert abi.decode_bool(bytes(31) + b"\x01") is True

    def test_decode_address(self):
        word = bytes(12) + bytes.fromhex("deadbeefdeadbeefdeadbeefdeadbeefdeadbeef")
        assert abi.decode_address(word) == "0xdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef"

    def test_chunk_words_even(self):
        data = "0x" + "00" * 64
        chunks = abi.chunk_words(data)
        assert len(chunks) == 2
        assert chunks[0] == bytes(32)
        assert chunks[1] == bytes(32)


class TestGithubClient:
    @patch("subprocess.run")
    def test_gh_cli_available_true(self, mock_run):
        mock_run.return_value = MagicMock(returncode=0)
        assert github_client._gh_cli_available() is True

    @patch("subprocess.run")
    def test_gh_cli_available_false(self, mock_run):
        mock_run.side_effect = FileNotFoundError()
        assert github_client._gh_cli_available() is False

    def test_evidence_to_dict(self):
        ev = github_client.GithubEvidence(
            repo="owner/repo",
            window_since="2024-01-01",
            window_until="2024-01-31",
            commit_count=5,
            merged_pr_count=2,
            commits=[],
            prs=[],
            passed=True,
        )
        d = github_client.evidence_to_dict(ev)
        assert d["source"] == "github"
        assert d["passed"] is True
        assert d["commitCount"] == 5


class TestKimiClient:
    @patch.dict(os.environ, {}, clear=True)
    def test_generate_narrative_no_api_key(self):
        result = kimi_client.generate_narrative(
            "project-id",
            "0x1234",
            {"deployment": {}, "usage": {}},
        )
        assert result.summary == ""
        assert result.confidence == 0.0


class TestZeroStorage:
    @patch.dict(os.environ, {}, clear=True)
    def test_write_evidence_fallback(self):
        result = zero_storage.write_evidence_to_storage(
            "0x1234",
            {"verified": True},
        )
        assert result.log_root == ""
        assert result.kv_key == "weft:milestone:0x1234:latest"

    @patch.dict(os.environ, {}, clear=True)
    def test_read_evidence_fallback(self):
        result = zero_storage.read_evidence_from_storage("0x1234")
        assert result is None


class TestDeadlineScheduler:
    def test_pending_milestone_dataclass(self):
        pm = deadline_scheduler.PendingMilestone(
            milestone_hash="0x1234",
            project_id="proj-1",
            builder="0xabcd",
            deadline=1700000000,
        )
        assert pm.milestone_hash == "0x1234"
        assert pm.deadline == 1700000000


class TestIndexClient:
    def test_milestone_state_dataclass(self):
        ms = indexer_client.MilestoneState(
            milestone_hash="0x1234",
            project_id="proj-1",
            template_id="tmpl-1",
            builder="0xabcd",
            deadline=1700000000,
            total_staked=1000,
            finalized=False,
            verified=False,
            released=False,
            verifier_count=0,
            verified_votes=0,
            final_evidence_root="0x",
            source="onchain",
        )
        assert ms.source == "onchain"
        assert ms.finalized is False


class TestMvpVerifier:
    def test_build_attestation_minimal(self):
        att = mvp_verifier.build_attestation(
            schema_version=1,
            project_id="proj-1",
            milestone_hash="0x1234",
            template_id="tmpl-1",
            chain_id=1,
            contract_address="0xabcd",
            deadline=1700000000,
            measurement_window_seconds=604800,
            unique_caller_threshold=100,
            deployment=mvp_verifier.DeploymentEvidence(
                contractAddress="0xabcd",
                codeHash="0x" + "00" * 32,
                blockNumber=1,
            ),
            usage=mvp_verifier.UsageEvidence(
                windowStart=1,
                windowEnd=100,
                uniqueCallerCount=50,
            ),
            node_address="0xnode",
            attested_at=1700000000,
        )
        assert att["verdict"]["verified"] is False
        assert att["narrative"]["summary"] == ""

    def test_build_attestation_verified(self):
        att = mvp_verifier.build_attestation(
            schema_version=1,
            project_id="proj-1",
            milestone_hash="0x1234",
            template_id="tmpl-1",
            chain_id=1,
            contract_address="0xabcd",
            deadline=1700000000,
            measurement_window_seconds=604800,
            unique_caller_threshold=100,
            deployment=mvp_verifier.DeploymentEvidence(
                contractAddress="0xabcd",
                codeHash="0xdeadbeef",
                blockNumber=1,
            ),
            usage=mvp_verifier.UsageEvidence(
                windowStart=1,
                windowEnd=100,
                uniqueCallerCount=200,
            ),
            node_address="0xnode",
            attested_at=1700000000,
        )
        assert att["verdict"]["verified"] is True

    def test_write_attestation_files(self, tmp_path):
        att = {"schemaVersion": 1, "verdict": {"verified": True}}
        out = tmp_path / "attestation.json"

        canonical = mvp_verifier.write_attestation_files(att, str(out))

        assert out.exists()
        # canonical is appended as .canonical extension, not suffix
        canonical_file = tmp_path / "attestation.json.canonical"
        assert canonical_file.exists()