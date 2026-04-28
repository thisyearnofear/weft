# SPDX-License-Identifier: MIT
"""Tests for agent.lib.ens_client — covers all 5 issues from the review."""

import json
import os
import sys
import unittest
from unittest.mock import MagicMock, patch

REPO_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
if REPO_ROOT not in sys.path:
    sys.path.insert(0, REPO_ROOT)

from agent.lib.ens_client import (
    BuilderProfile,
    EnsClient,
    _namehash,
    update_ens_after_verification,
)


class TestNamehash(unittest.TestCase):
    """Issue #1: _namehash must use keccak256 per EIP-137, not sha256."""

    def _run_namehash(self, name: str) -> str:
        import hashlib
        def fake_keccak(data: bytes) -> bytes:
            return hashlib.sha256(data).digest()  # deterministic stand-in
        with patch("agent.lib.ens_client._keccak256", side_effect=fake_keccak):
            return _namehash(name)

    def test_empty_name_returns_zero_node(self):
        result = _namehash("")
        self.assertEqual(result, "0x" + "00" * 32)

    def test_single_label(self):
        result = self._run_namehash("eth")
        self.assertTrue(result.startswith("0x"))
        self.assertEqual(len(result), 66)
        self.assertNotEqual(result, "0x" + "00" * 32)

    def test_two_labels_differ_from_one(self):
        h1 = self._run_namehash("eth")
        h2 = self._run_namehash("foo.eth")
        self.assertNotEqual(h1, h2)

    def test_three_labels(self):
        result = self._run_namehash("builder.weft.eth")
        self.assertTrue(result.startswith("0x"))
        self.assertEqual(len(result), 66)

    def test_namehash_calls_keccak_not_sha256(self):
        """_namehash delegates to _keccak256, not hashlib.sha256."""
        with patch("agent.lib.ens_client._keccak256", return_value=b"\xab" * 32) as mock_k:
            _namehash("foo.eth")
        self.assertGreaterEqual(mock_k.call_count, 2)


class TestBuildProfile(unittest.TestCase):
    def test_builder_profile_fields(self):
        profile = BuilderProfile(
            ens_name="builder.weft.eth",
            projects=["p1", "p2"],
            milestones_verified=5,
            earned_total=1_000_000_000_000_000_000,
            cobuilders=[],
            reputation_score=85,
        )
        self.assertEqual(profile.projects, ["p1", "p2"])
        self.assertEqual(profile.milestones_verified, 5)
        self.assertEqual(profile.reputation_score, 85)


class TestEnsClientInit(unittest.TestCase):
    def test_init_stores_fields(self):
        client = EnsClient("http://localhost:8545", "0x1234")
        self.assertEqual(client.rpc_url, "http://localhost:8545")
        self.assertEqual(client.wallet_key, "0x1234")
        self.assertNotEqual(client.public_resolver, "")
        self.assertNotEqual(client.ens_registry, "")


class TestUpdateBuilderProfileNoOp(unittest.TestCase):
    def test_returns_empty_when_no_updates(self):
        client = EnsClient("http://localhost:8545", "0x1234")
        result = client.update_builder_profile("test.weft.eth")
        self.assertEqual(result, "")


class TestExecuteTextUpdates(unittest.TestCase):
    """Issue #5: individual cast send per key, no fragile multicall."""

    @patch("agent.lib.ens_client._namehash", return_value="0x" + "aa" * 32)
    @patch("agent.lib.ens_client.subprocess.run")
    def test_sends_one_tx_per_key(self, mock_run, mock_nh):
        mock_run.return_value = MagicMock(returncode=0, stdout="0xtxhash\n", stderr="")
        client = EnsClient("http://localhost:8545", "0xdeadbeef")
        client._execute_text_updates("foo.eth", {"key1": "val1", "key2": "val2"})
        self.assertEqual(mock_run.call_count, 2)
        for c in mock_run.call_args_list:
            args = c[0][0]
            self.assertIn("cast", args)
            self.assertIn("send", args)
            self.assertIn("setText(bytes32,string,string)", args)
            self.assertNotIn("multicall", " ".join(args))

    @patch("agent.lib.ens_client._namehash", return_value="0x" + "aa" * 32)
    @patch("agent.lib.ens_client.subprocess.run")
    def test_returns_last_tx_hash(self, mock_run, mock_nh):
        mock_run.return_value = MagicMock(returncode=0, stdout="0xlasttx\n", stderr="")
        client = EnsClient("http://localhost:8545", "0xdeadbeef")
        result = client._execute_text_updates("foo.eth", {"k": "v"})
        self.assertEqual(result, "0xlasttx")

    @patch("agent.lib.ens_client._namehash", return_value="0x" + "aa" * 32)
    @patch("agent.lib.ens_client.subprocess.run")
    def test_returns_empty_on_failure(self, mock_run, mock_nh):
        mock_run.return_value = MagicMock(returncode=1, stdout="", stderr="revert")
        client = EnsClient("http://localhost:8545", "0xdeadbeef")
        result = client._execute_text_updates("foo.eth", {"k": "v"})
        self.assertEqual(result, "")


class TestVerifyOwnership(unittest.TestCase):
    """Issue #3: ownership pre-flight check."""

    @patch("agent.lib.ens_client._namehash", return_value="0x" + "bb" * 32)
    @patch("agent.lib.ens_client.subprocess.run")
    @patch("agent.lib.ens_client.urllib.request.urlopen")
    def test_returns_true_when_owner_matches(self, mock_urlopen, mock_run, mock_nh):
        owner_addr = "0xabcdef1234567890abcdef1234567890abcdef12"
        padded = "0x" + "00" * 12 + owner_addr[2:]
        mock_resp = MagicMock()
        mock_resp.__enter__ = lambda s: s
        mock_resp.__exit__ = MagicMock(return_value=False)
        mock_resp.read.return_value = json.dumps({"result": padded}).encode()
        mock_urlopen.return_value = mock_resp
        mock_run.return_value = MagicMock(returncode=0, stdout=owner_addr + "\n", stderr="")
        client = EnsClient("http://localhost:8545", "0xprivkey")
        self.assertTrue(client.verify_ownership("builder.weft.eth"))

    @patch("agent.lib.ens_client._namehash", return_value="0x" + "bb" * 32)
    @patch("agent.lib.ens_client.subprocess.run")
    @patch("agent.lib.ens_client.urllib.request.urlopen")
    def test_returns_false_when_owner_differs(self, mock_urlopen, mock_run, mock_nh):
        owner_addr = "0xabcdef1234567890abcdef1234567890abcdef12"
        padded = "0x" + "00" * 12 + owner_addr[2:]
        mock_resp = MagicMock()
        mock_resp.__enter__ = lambda s: s
        mock_resp.__exit__ = MagicMock(return_value=False)
        mock_resp.read.return_value = json.dumps({"result": padded}).encode()
        mock_urlopen.return_value = mock_resp
        mock_run.return_value = MagicMock(returncode=0, stdout="0xdifferent000000000000000000000000000000\n", stderr="")
        client = EnsClient("http://localhost:8545", "0xprivkey")
        self.assertFalse(client.verify_ownership("builder.weft.eth"))

    @patch("agent.lib.ens_client._namehash", return_value="0x" + "bb" * 32)
    @patch("agent.lib.ens_client.urllib.request.urlopen", side_effect=Exception("network error"))
    def test_returns_false_on_rpc_error(self, mock_urlopen, mock_nh):
        client = EnsClient("http://localhost:8545", "0xprivkey")
        self.assertFalse(client.verify_ownership("builder.weft.eth"))


class TestUpdateAgentRecord(unittest.TestCase):
    """Issue #4: update_agent_record writes weft.agent.* keys."""

    @patch("agent.lib.ens_client._namehash", return_value="0x" + "cc" * 32)
    @patch("agent.lib.ens_client.subprocess.run")
    def test_writes_contributions_key(self, mock_run, mock_nh):
        mock_run.return_value = MagicMock(returncode=0, stdout="0xtx\n", stderr="")
        client = EnsClient("http://localhost:8545", "0xkey")
        with patch.object(client, "_get_text", return_value=None):
            client.update_agent_record("agent.weft.eth", contributions=42)
        all_args = [a for c in mock_run.call_args_list for a in c[0][0]]
        self.assertTrue(any("weft.agent.contributions" in a for a in all_args))

    @patch("agent.lib.ens_client._namehash", return_value="0x" + "cc" * 32)
    @patch("agent.lib.ens_client.subprocess.run")
    def test_writes_earnings_key(self, mock_run, mock_nh):
        mock_run.return_value = MagicMock(returncode=0, stdout="0xtx\n", stderr="")
        client = EnsClient("http://localhost:8545", "0xkey")
        with patch.object(client, "_get_text", return_value="100"):
            client.update_agent_record("agent.weft.eth", earnings=50)
        all_args = [a for c in mock_run.call_args_list for a in c[0][0]]
        self.assertTrue(any("weft.agent.earnings" in a for a in all_args))

    @patch("agent.lib.ens_client._namehash", return_value="0x" + "cc" * 32)
    @patch("agent.lib.ens_client.subprocess.run")
    def test_writes_projects_key(self, mock_run, mock_nh):
        mock_run.return_value = MagicMock(returncode=0, stdout="0xtx\n", stderr="")
        client = EnsClient("http://localhost:8545", "0xkey")
        with patch.object(client, "_get_text", return_value="[]"):
            client.update_agent_record("agent.weft.eth", projects=["proj-1"])
        all_args = [a for c in mock_run.call_args_list for a in c[0][0]]
        self.assertTrue(any("weft.agent.projects" in a for a in all_args))

    def test_returns_empty_when_no_updates(self):
        client = EnsClient("http://localhost:8545", "0xkey")
        result = client.update_agent_record("agent.weft.eth")
        self.assertEqual(result, "")


class TestUpdateEnsAfterVerification(unittest.TestCase):
    """update_ens_after_verification: ownership pre-flight + env fallback."""

    def test_returns_empty_when_no_env(self):
        with patch.dict(os.environ, {}, clear=True):
            os.environ.pop("ETH_RPC_URL", None)
            os.environ.pop("VERIFIER_PRIVATE_KEY", None)
            os.environ.pop("PRIVATE_KEY", None)

            class _R:
                log_root = "0x" + "aa" * 32
                timestamp = 0

            result = update_ens_after_verification("b.eth", "proj", "0xhash", _R(), 0)
            self.assertEqual(result, "")

    @patch.dict(os.environ, {"ETH_RPC_URL": "http://localhost:8545", "PRIVATE_KEY": "0xkey"})
    def test_skips_when_ownership_fails(self):
        """Returns empty string and prints warning when verify_ownership returns False."""
        class _R:
            log_root = "0x" + "aa" * 32
            timestamp = 0

        with patch("agent.lib.ens_client.EnsClient.verify_ownership", return_value=False):
            result = update_ens_after_verification("b.eth", "proj", "0xhash", _R(), 0)
        self.assertEqual(result, "")


if __name__ == "__main__":
    unittest.main()