#!/usr/bin/env python3
# SPDX-License-Identifier: MIT

"""Tests for agent.lib.keeperhub_mcp and MCP transport routing."""

import json
import os
import sys
import unittest
from unittest.mock import MagicMock, patch

REPO_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
if REPO_ROOT not in sys.path:
    sys.path.insert(0, REPO_ROOT)

from agent.lib.keeperhub_client import (
    ExecutionStatus,
    execute_contract_call,
    get_execution_logs,
    keeperhub_transport,
    poll_execution_status,
)
from agent.lib.keeperhub_mcp import (
    KeeperHubMcpClient,
    KeeperHubMcpError,
    _status_from_payload,
    mcp_execute_contract_call,
    reset_mcp_client_for_tests,
)


class TestKeeperHubTransport(unittest.TestCase):
    @patch.dict(os.environ, {"KEEPERHUB_TRANSPORT": "mcp"})
    def test_mcp_mode(self):
        self.assertEqual(keeperhub_transport(), "mcp")

    @patch.dict(os.environ, {}, clear=True)
    def test_default_rest(self):
        os.environ.pop("KEEPERHUB_TRANSPORT", None)
        self.assertEqual(keeperhub_transport(), "rest")

    @patch.dict(os.environ, {"KEEPERHUB_TRANSPORT": "invalid"})
    def test_unknown_falls_back_to_rest(self):
        self.assertEqual(keeperhub_transport(), "rest")


class TestStatusParsing(unittest.TestCase):
    def test_completed_maps_to_confirmed(self):
        self.assertEqual(_status_from_payload({"status": "completed"}), "confirmed")

    def test_pending_preserved(self):
        self.assertEqual(_status_from_payload({"status": "pending"}), "pending")


class TestKeeperHubMcpClient(unittest.TestCase):
    def tearDown(self):
        reset_mcp_client_for_tests()

    @patch.dict(os.environ, {"KEEPERHUB_API_KEY": "wfb_webhook_key"})
    def test_rejects_webhook_key(self):
        with self.assertRaises(KeeperHubMcpError):
            KeeperHubMcpClient()

    @patch.dict(os.environ, {"KEEPERHUB_API_KEY": "kh_test123"})
    @patch("agent.lib.keeperhub_mcp.urllib.request.urlopen")
    def test_call_tool_parses_json_content(self, mock_urlopen):
        init_resp = MagicMock()
        init_resp.headers.get.return_value = "sess-1"
        init_resp.read.return_value = b""

        tool_resp = MagicMock()
        tool_resp.read.return_value = json.dumps(
            {
                "jsonrpc": "2.0",
                "id": 2,
                "result": {
                    "content": [{"type": "text", "text": '{"executionId":"exec-1","status":"pending"}'}],
                    "isError": False,
                },
            }
        ).encode()
        tool_resp.__enter__ = MagicMock(return_value=tool_resp)
        tool_resp.__exit__ = MagicMock(return_value=False)
        init_resp.__enter__ = MagicMock(return_value=init_resp)
        init_resp.__exit__ = MagicMock(return_value=False)

        mock_urlopen.side_effect = [init_resp, tool_resp]

        client = KeeperHubMcpClient()
        result = client.call_tool("execute_contract_call", {"contract_address": "0xabc"})
        self.assertEqual(result["executionId"], "exec-1")


class TestMcpExecuteContractCall(unittest.TestCase):
    def tearDown(self):
        reset_mcp_client_for_tests()

    @patch.dict(os.environ, {"KEEPERHUB_API_KEY": "kh_test", "KEEPERHUB_TRANSPORT": "mcp"})
    @patch("agent.lib.keeperhub_mcp.get_mcp_client")
    def test_simulate_then_write(self, mock_get_client):
        client = MagicMock()
        mock_get_client.return_value = client
        client.call_tool.side_effect = [
            {"success": True, "wouldRevert": False},
            {"executionId": "exec-mcp", "status": "pending"},
        ]

        execution_id, status, tx_hash, explorer = mcp_execute_contract_call(
            contract_address="0xWeft",
            function_signature="submitVerdict(bytes32,bool,bytes32)",
            args=["0xhash", "true", "0xevidence"],
            chain_id=16602,
        )

        self.assertEqual(execution_id, "exec-mcp")
        self.assertEqual(status, "pending")
        self.assertIsNone(tx_hash)
        self.assertEqual(client.call_tool.call_count, 2)
        write_args = client.call_tool.call_args_list[1][0][1]
        self.assertIn("idempotency_key", write_args)
        self.assertNotIn("simulate", write_args)


class TestExecuteContractCallMcpRouting(unittest.TestCase):
    @patch.dict(os.environ, {"KEEPERHUB_API_KEY": "kh_test", "KEEPERHUB_TRANSPORT": "mcp"})
    @patch("agent.lib.keeperhub_mcp.mcp_execute_contract_call")
    def test_routes_through_mcp(self, mock_mcp):
        mock_mcp.return_value = ("exec-routed", "pending", None, None)

        result = execute_contract_call(
            contract_address="0xWeft",
            function_signature="submitVerdict(bytes32,bool,bytes32)",
            args=["0xa", "true", "0xb"],
            chain_id=16602,
        )

        self.assertEqual(result.execution_id, "exec-routed")
        self.assertEqual(result.status, ExecutionStatus.PENDING)
        mock_mcp.assert_called_once()

    @patch.dict(os.environ, {"KEEPERHUB_API_KEY": "kh_test", "KEEPERHUB_TRANSPORT": "mcp"})
    @patch("agent.lib.keeperhub_mcp.mcp_poll_direct_execution")
    def test_poll_routes_through_mcp(self, mock_poll):
        mock_poll.return_value = (
            "confirmed",
            "0xtx",
            "https://explorer/tx/0xtx",
            None,
        )

        result = poll_execution_status("exec-1", timeout=10, poll_interval=0)
        self.assertEqual(result.status, ExecutionStatus.CONFIRMED)
        self.assertEqual(result.tx_hash, "0xtx")

    @patch.dict(os.environ, {"KEEPERHUB_API_KEY": "kh_test", "KEEPERHUB_TRANSPORT": "mcp"})
    @patch("agent.lib.keeperhub_mcp.mcp_get_execution_logs")
    def test_logs_routes_through_mcp(self, mock_logs):
        mock_logs.return_value = [{"message": "submitted"}]
        logs = get_execution_logs("exec-1")
        self.assertEqual(len(logs), 1)


if __name__ == "__main__":
    unittest.main()
