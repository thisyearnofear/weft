# SPDX-License-Identifier: MIT
"""Tests for weft_daemon.py core logic."""

import json
import os
import subprocess
import sys
import tempfile
import unittest
from unittest.mock import MagicMock, patch

REPO_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
if REPO_ROOT not in sys.path:
    sys.path.insert(0, REPO_ROOT)

from agent.lib.keeperhub_client import ExecutionStatus, KeeperHubExecution


class TestSubmitVerdict(unittest.TestCase):
    """Test _submit_verdict() with mocked dependencies."""

    def _run_submit(self, use_keeperhub=False, keeperhub_result=None, cast_fails=False, **overrides):
        """Helper to call _submit_verdict with minimal required params."""
        from agent.scripts.weft_daemon import _submit_verdict

        keeperhub_configured = overrides.pop("keeperhub_configured", use_keeperhub)

        with patch("agent.scripts.weft_daemon.keeperhub_configured", return_value=keeperhub_configured):
            with patch("agent.scripts.weft_daemon.execute_verdict", return_value=keeperhub_result):
                with patch("subprocess.run") as mock_cast:
                    if cast_fails:
                        mock_cast.return_value = MagicMock(returncode=1, stdout="error")
                    else:
                        mock_cast.return_value = MagicMock(returncode=0, stdout="blockHash 0xabc")

                    _submit_verdict(
                        milestone_hash="0x1234",
                        verified_arg="true",
                        evidence_root="0xdead",
                        weft="0xWeftContract",
                        rpc_url="https://rpc.test",
                        private_key="0xkey",
                        use_keeperhub=use_keeperhub,
                        **overrides,
                    )
                    return mock_cast

    def test_keeperhub_path_called(self):
        """Uses KeeperHub when configured and available."""
        kh_result = KeeperHubExecution(
            execution_id="exec-1",
            tx_hash="0xkhtx",
            status=ExecutionStatus.CONFIRMED,
            explorer_url="https://explorer/tx/0xkhtx",
        )
        mock_cast = self._run_submit(use_keeperhub=True, keeperhub_result=kh_result)
        # Verify cast was NOT called (KeeperHub succeeded)
        mock_cast.assert_not_called()

    def test_keeperhub_failure_falls_back_to_cast(self):
        """Falls back to cast send when KeeperHub returns failed status."""
        kh_result = KeeperHubExecution(
            execution_id="exec-2",
            tx_hash=None,
            status=ExecutionStatus.FAILED,
            explorer_url=None,
            error="reverted",
        )
        mock_cast = self._run_submit(use_keeperhub=True, keeperhub_result=kh_result)
        mock_cast.assert_called_once()

    def test_keeperhub_unavailable_falls_back_to_cast(self):
        """Falls back to cast send when KeeperHub returns None."""
        mock_cast = self._run_submit(use_keeperhub=True, keeperhub_result=None)
        mock_cast.assert_called_once()

    def test_cast_fallback_when_no_keeperhub(self):
        """Uses cast send directly when KeeperHub is not configured."""
        mock_cast = self._run_submit(use_keeperhub=False)
        mock_cast.assert_called_once()
        call_args = mock_cast.call_args[0][0]
        self.assertIn("cast", call_args)
        self.assertIn("send", call_args)
        self.assertIn("0xWeftContract", call_args)
        self.assertTrue(any("submitVerdict" in a for a in call_args))

    def test_cast_send_with_correct_args(self):
        """Passes correct args to cast send."""
        mock_cast = self._run_submit(use_keeperhub=False)
        args = mock_cast.call_args[0][0]
        self.assertIn("0x1234", args)
        self.assertIn("true", args)
        self.assertIn("0xdead", args)
        self.assertIn("https://rpc.test", args)

    def test_cast_failure_logged(self):
        """Handles cast send failure gracefully."""
        mock_cast = self._run_submit(use_keeperhub=False, cast_fails=True)
        mock_cast.assert_called_once()


class TestProcessOne(unittest.TestCase):
    """Test _process_one() edge cases with mocked dependencies."""

    def _minimal_process_one_kwargs(self, **overrides):
        """Build the minimal kwargs dict for _process_one()."""
        kwargs = dict(
            rpc=MagicMock(),
            rpc_url="https://rpc.test",
            weft="0xWeftContract",
            private_key="0xkey",
            node_address="0xnode",
            milestone_hash="0x1234",
            contract_address_override="",
            measurement_window_seconds_override=0,
            unique_caller_threshold_override=0,
            metadata_indexer="",
            publish_0g=False,
            do_broadcast=False,
            wait_for_peers=False,
            peer_threshold=2,
            inbox_dir="/tmp",
            registry_client=None,
            use_consensus_root=False,
            publish_consensus_0g=False,
            publish_bundle_0g=False,
            use_keeperhub=False,
            keeperhub_timeout=120,
            builder_ens="",
        )
        kwargs.update(overrides)
        return kwargs

    @patch("agent.scripts.weft_daemon.read_milestone")
    @patch("agent.scripts.weft_daemon.JsonRpcClient")
    def test_returns_false_when_milestone_read_fails(self, mock_rpc, mock_read):
        """Returns False when read_milestone raises."""
        mock_read.side_effect = RuntimeError("rpc error")

        from agent.scripts.weft_daemon import _process_one
        result = _process_one(**self._minimal_process_one_kwargs(milestone_hash="0x1234"))
        self.assertFalse(result)

    @patch("agent.scripts.weft_daemon.read_milestone")
    @patch("agent.scripts.weft_daemon.JsonRpcClient")
    def test_returns_false_when_metadata_fails_without_overrides(self, mock_rpc, mock_read):
        """Returns False when metadata download fails and no overrides exist."""
        mock_read.return_value = MagicMock(metadataHash="0x" + "ff" * 32)

        from agent.scripts.weft_daemon import _process_one
        result = _process_one(**self._minimal_process_one_kwargs(milestone_hash="0x1234"))
        self.assertFalse(result)

    @patch("agent.scripts.weft_daemon.read_milestone")
    @patch("agent.scripts.weft_daemon.JsonRpcClient")
    @patch("agent.scripts.weft_daemon._submit_verdict")
    def test_verified_milestone_triggers_submit(self, mock_submit, mock_rpc, mock_read):
        """Submits verdict for a milestone with sufficient evidence."""
        import time
        mock_milestone = MagicMock()
        mock_milestone.builder = "0xabcd"
        mock_milestone.totalStaked = 10_000_000_000_000_000_000
        mock_milestone.projectId = "0xproj"
        mock_milestone.metadataHash = "0x" + "ff" * 32
        mock_milestone.deadline = int(time.time()) - 3600
        mock_milestone.templateId = 1
        mock_read.return_value = mock_milestone

        meta_mock = MagicMock()
        meta_mock.contractAddress = "0xcontract"
        meta_mock.measurementWindowSeconds = 604800
        meta_mock.uniqueCallerThreshold = 10

        with patch("agent.scripts.weft_daemon.read_metadata_from_0g", return_value=meta_mock):
            with patch("agent.scripts.weft_daemon.count_unique_callers", return_value=(50, 100, 200)):
                with patch("agent.scripts.weft_daemon.eth_get_code", return_value="0xdeadbeef"):
                    with patch("agent.scripts.weft_daemon.build_attestation") as mock_build:
                        mock_build.return_value = {
                            "verdict": {"verified": True},
                            "evidenceRoot": "0xevidence",
                        }
                        with patch("agent.scripts.weft_daemon.eth_block_number", return_value=42):
                            with patch("agent.scripts.weft_daemon.eth_chain_id", return_value=16600):
                                with patch("agent.scripts.weft_daemon.write_attestation_files") as mock_write:
                                    mock_write.return_value = "/tmp/attestation.json"
                                    with patch("builtins.open", unittest.mock.mock_open(read_data=b'{}')):
                                        from agent.scripts.weft_daemon import _process_one
                                        result = _process_one(
                                            **self._minimal_process_one_kwargs(milestone_hash="0x1234")
                                        )
                                        mock_submit.assert_called_once()
                                        self.assertTrue(result)


if __name__ == "__main__":
    unittest.main()
