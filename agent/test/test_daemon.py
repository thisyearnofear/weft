# SPDX-License-Identifier: MIT
"""Tests for weft_daemon.py core logic."""

import json
import os
import sys
import time
import unittest
from unittest.mock import MagicMock, patch

REPO_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
if REPO_ROOT not in sys.path:
    sys.path.insert(0, REPO_ROOT)


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
    def test_returns_false_when_milestone_read_fails(self, mock_read):
        """Returns False when read_milestone raises."""
        mock_read.side_effect = RuntimeError("rpc error")

        from agent.scripts.weft_daemon import _process_one
        result = _process_one(**self._minimal_process_one_kwargs(milestone_hash="0x1234"))
        self.assertFalse(result)

    @patch("agent.scripts.weft_daemon.read_milestone")
    def test_returns_false_when_metadata_fails_without_overrides(self, mock_read):
        """Returns False when metadata download fails and no overrides exist."""
        mock_read.return_value = MagicMock(metadataHash="0x" + "ff" * 32)

        from agent.scripts.weft_daemon import _process_one
        result = _process_one(**self._minimal_process_one_kwargs(milestone_hash="0x1234"))
        self.assertFalse(result)

    @patch("agent.scripts.weft_daemon._submit_verdict")
    @patch("agent.scripts.weft_daemon.read_milestone")
    @patch("agent.scripts.weft_daemon.eth_chain_id", return_value=16600)
    @patch("agent.scripts.weft_daemon.eth_block_number", return_value=42)
    @patch("agent.scripts.weft_daemon.eth_get_code", return_value="0xdeadbeef")
    @patch("agent.scripts.weft_daemon.count_unique_callers", return_value=(50, 100, 200))
    def test_evm_template_dispatches_to_submit(self, mock_count, mock_code, mock_bn, mock_chain, mock_read, mock_submit):
        """Submits verdict for an milestone with sufficient EVM evidence."""
        mock_milestone = MagicMock()
        mock_milestone.builder = "0xabcd"
        mock_milestone.totalStaked = 10_000_000_000_000_000_000
        mock_milestone.projectId = "0xproj"
        mock_milestone.metadataHash = "0x" + "ff" * 32
        mock_milestone.deadline = int(time.time()) - 3600
        mock_milestone.templateId = "evm.deployment_usage.v1"
        mock_read.return_value = mock_milestone

        meta_mock = MagicMock()
        meta_mock.templateId = "evm.deployment_usage.v1"
        meta_mock.contractAddress = "0xcontract"
        meta_mock.measurementWindowSeconds = 604800
        meta_mock.uniqueCallerThreshold = 10
        meta_mock.templateInputs = {}

        with patch("agent.scripts.weft_daemon.read_metadata_from_0g", return_value=meta_mock):
            with patch("agent.scripts.weft_daemon.write_attestation_files") as mock_write:
                mock_write.return_value = "/tmp/attestation.json"
                with patch("builtins.open", unittest.mock.mock_open(read_data=b"{}")):
                    from agent.scripts.weft_daemon import _process_one
                    result = _process_one(
                        **self._minimal_process_one_kwargs(milestone_hash="0x1234")
                    )
                    mock_submit.assert_called_once()
                    self.assertTrue(result)

    @patch("agent.scripts.weft_daemon._submit_verdict")
    @patch("agent.scripts.weft_daemon.read_milestone")
    @patch("agent.scripts.weft_daemon.eth_chain_id", return_value=16600)
    def test_generic_template_dispatch(self, mock_chain, mock_read, mock_submit):
        """Dispatches to the generic TemplateRegistry for a non-EVM template."""
        mock_milestone = MagicMock()
        mock_milestone.builder = "0xabcd"
        mock_milestone.totalStaked = 0
        mock_milestone.projectId = "0xproj"
        mock_milestone.metadataHash = "0x" + "ff" * 32
        mock_milestone.deadline = int(time.time()) - 3600
        mock_milestone.templateId = "research.report.v1"
        mock_read.return_value = mock_milestone

        meta_mock = MagicMock()
        meta_mock.templateId = "research.report.v1"
        meta_mock.templateInputs = {
            "deliverable_hash": "0x" + "aa" * 32,
            "word_count": 2500,
            "citation_count": 20,
            "source_count": 10,
            "plagiarism_score": 5,
            "required_words": 1500,
            "required_citations": 10,
            "required_sources": 5,
            "max_plagiarism": 10,
        }

        with patch("agent.scripts.weft_daemon.read_metadata_from_0g", return_value=meta_mock):
            with patch("agent.scripts.weft_daemon.write_attestation_files") as mock_write:
                mock_write.return_value = "/tmp/attestation.json"
                with patch("builtins.open", unittest.mock.mock_open(read_data=b"{}")):
                    from agent.scripts.weft_daemon import _process_one
                    result = _process_one(
                        **self._minimal_process_one_kwargs(milestone_hash="0x1234")
                    )
                    mock_submit.assert_called_once()
                    self.assertTrue(result)


if __name__ == "__main__":
    unittest.main()
