#!/usr/bin/env python3
# SPDX-License-Identifier: MIT

"""Tests for agent.lib.keeperhub_client."""

import io
import json
import os
import sys
import tempfile
import unittest
import urllib.error
from unittest.mock import patch

# Allow running directly from repo root.
REPO_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
if REPO_ROOT not in sys.path:
    sys.path.insert(0, REPO_ROOT)

from agent.lib.keeperhub_client import (
    ExecutionStatus,
    KeeperHubClientError,
    KeeperHubExecution,
    _request,
    execute_contract_call,
    execute_verdict,
    get_execution_logs,
    keeperhub_configured,
    poll_execution_status,
)


class TestKeeperHubConfigured(unittest.TestCase):
    """Test keeperhub_configured() based on env vars."""

    @patch.dict(os.environ, {}, clear=True)
    def test_not_configured_without_api_key(self):
        """Returns False when KEEPERHUB_API_KEY is not set."""
        os.environ.pop("KEEPERHUB_API_KEY", None)
        self.assertFalse(keeperhub_configured())

    @patch.dict(os.environ, {"KEEPERHUB_API_KEY": "kh_test123"})
    def test_configured_with_api_key(self):
        """Returns True when KEEPERHUB_API_KEY is set."""
        self.assertTrue(keeperhub_configured())

    @patch.dict(os.environ, {"KEEPERHUB_API_KEY": ""})
    def test_not_configured_with_empty_api_key(self):
        """Returns False when KEEPERHUB_API_KEY is empty string."""
        self.assertFalse(keeperhub_configured())

    @patch.dict(os.environ, {"KEEPERHUB_API_KEY": "kh_test123", "KEEPERHUB_ENABLED": "0"})
    def test_disabled_with_enabled_zero(self):
        """Returns False when KEEPERHUB_ENABLED=0 even with API key set."""
        self.assertFalse(keeperhub_configured())

    @patch.dict(os.environ, {"KEEPERHUB_API_KEY": "kh_test123", "KEEPERHUB_ENABLED": "1"})
    def test_enabled_with_enabled_one(self):
        """Returns True when KEEPERHUB_ENABLED=1 with API key set."""
        self.assertTrue(keeperhub_configured())


class TestKeeperHubExecution(unittest.TestCase):
    """Test the KeeperHubExecution dataclass."""

    def test_confirmed_execution(self):
        """Confirmed execution has correct fields."""
        ex = KeeperHubExecution(
            execution_id="exec-1",
            tx_hash="0xabc123",
            status=ExecutionStatus.CONFIRMED,
            explorer_url="https://explorer/tx/0xabc123",
        )
        self.assertEqual(ex.execution_id, "exec-1")
        self.assertEqual(ex.tx_hash, "0xabc123")
        self.assertEqual(ex.status, ExecutionStatus.CONFIRMED)
        self.assertIsNone(ex.error)

    def test_failed_execution(self):
        """Failed execution includes error message."""
        ex = KeeperHubExecution(
            execution_id="exec-2",
            tx_hash=None,
            status=ExecutionStatus.FAILED,
            explorer_url=None,
            error="out of gas",
        )
        self.assertEqual(ex.status, ExecutionStatus.FAILED)
        self.assertEqual(ex.error, "out of gas")

    def test_execution_status_enum_values(self):
        """ExecutionStatus enum has expected values."""
        self.assertEqual(ExecutionStatus.PENDING.value, "pending")
        self.assertEqual(ExecutionStatus.CONFIRMED.value, "confirmed")
        self.assertEqual(ExecutionStatus.FAILED.value, "failed")
        self.assertEqual(ExecutionStatus.UNKNOWN.value, "unknown")


class TestExecuteContractCall(unittest.TestCase):
    """Test execute_contract_call() with mocked API."""

    @patch.dict(os.environ, {"KEEPERHUB_API_KEY": "kh_test", "KEEPERHUB_API_URL": "https://mock.keeperhub.com"})
    @patch("agent.lib.keeperhub_client._request")
    def test_successful_contract_call(self, mock_request):
        """Submits contract call and returns execution with ID."""
        mock_request.return_value = {
            "executionId": "exec-123",
            "status": "pending",
            "txHash": None,
            "explorerUrl": None,
        }

        result = execute_contract_call(
            contract_address="0xWeftContract",
            function_signature="submitVerdict(bytes32,bool,bytes32)",
            args=["0xhash", "true", "0xevidence"],
        )

        self.assertEqual(result.execution_id, "exec-123")
        self.assertEqual(result.status, ExecutionStatus.PENDING)
        self.assertIsNone(result.tx_hash)
        mock_request.assert_called_once()

        # Verify the request payload
        call_args = mock_request.call_args
        self.assertEqual(call_args[0][0], "POST")
        self.assertEqual(call_args[0][1], "executions/contract-call")
        body = call_args[1]["body"]
        self.assertEqual(body["contractAddress"], "0xWeftContract")
        self.assertEqual(body["functionSignature"], "submitVerdict(bytes32,bool,bytes32)")
        self.assertEqual(body["args"], ["0xhash", "true", "0xevidence"])

    @patch.dict(os.environ, {"KEEPERHUB_API_KEY": "kh_test"})
    @patch("agent.lib.keeperhub_client._request")
    def test_contract_call_with_chain_id(self, mock_request):
        """Passes chainId in the request body for correct network routing."""
        mock_request.return_value = {
            "executionId": "exec-chain",
            "status": "pending",
        }

        execute_contract_call(
            contract_address="0xWeft",
            function_signature="submitVerdict(bytes32,bool,bytes32)",
            args=["0xa", "true", "0xb"],
            chain_id=16600,
        )

        body = mock_request.call_args[1]["body"]
        self.assertEqual(body["chainId"], 16600)

    @patch.dict(os.environ, {"KEEPERHUB_API_KEY": "kh_test"})
    @patch("agent.lib.keeperhub_client._request")
    def test_contract_call_omits_chain_id_when_none(self, mock_request):
        """Omits chainId from body when not provided."""
        mock_request.return_value = {
            "executionId": "exec-nochain",
            "status": "pending",
        }

        execute_contract_call(
            contract_address="0xWeft",
            function_signature="submitVerdict(bytes32,bool,bytes32)",
            args=["0xa", "true", "0xb"],
        )

        body = mock_request.call_args[1]["body"]
        self.assertNotIn("chainId", body)

    @patch.dict(os.environ, {"KEEPERHUB_API_KEY": "kh_test"})
    @patch("agent.lib.keeperhub_client._request")
    def test_contract_call_with_optional_params(self, mock_request):
        """Passes optional gas and chain params when provided."""
        mock_request.return_value = {
            "executionId": "exec-456",
            "status": "pending",
        }

        execute_contract_call(
            contract_address="0xWeft",
            function_signature="submitVerdict(bytes32,bool,bytes32)",
            args=["0xa", "false", "0xb"],
            chain_id=80085,
            gas_limit=500000,
        )

        body = mock_request.call_args[1]["body"]
        self.assertEqual(body["chainId"], 80085)
        self.assertEqual(body["gasLimit"], 500000)

    @patch.dict(os.environ, {"KEEPERHUB_API_KEY": "kh_test"})
    @patch("agent.lib.keeperhub_client._request")
    def test_contract_call_api_error(self, mock_request):
        """Raises RuntimeError when API returns error."""
        mock_request.side_effect = RuntimeError("KeeperHub API error (401): Unauthorized")

        with self.assertRaises(RuntimeError):
            execute_contract_call(
                contract_address="0xWeft",
                function_signature="submitVerdict(bytes32,bool,bytes32)",
                args=["0xa", "true", "0xb"],
            )

    @patch.dict(os.environ, {"KEEPERHUB_API_KEY": "kh_test"})
    @patch("agent.lib.keeperhub_client._request")
    def test_contract_call_unwraps_data_envelope(self, mock_request):
        """Correctly reads fields from {"data": {...}} envelope."""
        mock_request.return_value = {
            "executionId": "exec-envelope",
            "status": "confirmed",
            "txHash": "0xenveloped",
            "txExplorerUrl": "https://explorer/tx/0xenveloped",
        }

        result = execute_contract_call(
            contract_address="0xWeft",
            function_signature="submitVerdict(bytes32,bool,bytes32)",
            args=["0xa", "true", "0xb"],
        )

        self.assertEqual(result.execution_id, "exec-envelope")
        self.assertEqual(result.status, ExecutionStatus.CONFIRMED)
        self.assertEqual(result.tx_hash, "0xenveloped")

    @patch.dict(os.environ, {"KEEPERHUB_API_KEY": "kh_test"})
    @patch("agent.lib.keeperhub_client._request")
    def test_already_confirmed_sync_path(self, mock_request):
        """Returns immediately if API returns confirmed status (sync path)."""
        mock_request.return_value = {
            "executionId": "exec-789",
            "status": "confirmed",
            "txHash": "0xsynced",
            "txExplorerUrl": "https://explorer/tx/0xsynced",
        }

        result = execute_contract_call(
            contract_address="0xWeft",
            function_signature="submitVerdict(bytes32,bool,bytes32)",
            args=["0xa", "true", "0xb"],
        )

        self.assertEqual(result.status, ExecutionStatus.CONFIRMED)
        self.assertEqual(result.tx_hash, "0xsynced")
        self.assertEqual(result.explorer_url, "https://explorer/tx/0xsynced")


class TestPollExecutionStatus(unittest.TestCase):
    """Test poll_execution_status() with mocked API."""

    @patch.dict(os.environ, {"KEEPERHUB_API_KEY": "kh_test"})
    @patch("agent.lib.keeperhub_client._request")
    def test_immediate_confirmation(self, mock_request):
        """Returns confirmed when first poll returns confirmed."""
        mock_request.return_value = {
            "status": "confirmed",
            "txHash": "0xpolltx",
            "explorerUrl": "https://explorer/tx/0xpolltx",
        }

        result = poll_execution_status("exec-1", timeout=10, poll_interval=0)

        self.assertEqual(result.status, ExecutionStatus.CONFIRMED)
        self.assertEqual(result.tx_hash, "0xpolltx")

    @patch.dict(os.environ, {"KEEPERHUB_API_KEY": "kh_test"})
    @patch("agent.lib.keeperhub_client._request")
    def test_failure_detection(self, mock_request):
        """Returns failed when poll returns failed status."""
        mock_request.return_value = {
            "status": "failed",
            "error": "reverted",
            "txHash": None,
        }

        result = poll_execution_status("exec-2", timeout=10, poll_interval=0)

        self.assertEqual(result.status, ExecutionStatus.FAILED)
        self.assertEqual(result.error, "reverted")

    @patch.dict(os.environ, {"KEEPERHUB_API_KEY": "kh_test", "KEEPERHUB_TIMEOUT": "1"})
    @patch("agent.lib.keeperhub_client._request")
    def test_timeout_returns_pending(self, mock_request):
        """Returns pending with timeout error when polling exceeds deadline."""
        # Always return pending — simulate timeout
        mock_request.return_value = {"status": "pending"}

        result = poll_execution_status("exec-3", timeout=1, poll_interval=0)

        self.assertEqual(result.status, ExecutionStatus.PENDING)
        self.assertIn("timed out", result.error or "")

    @patch.dict(os.environ, {"KEEPERHUB_API_KEY": "kh_test"})
    @patch("agent.lib.keeperhub_client._request")
    def test_4xx_error_fails_fast(self, mock_request):
        """Returns FAILED immediately on 4xx errors instead of retrying."""
        mock_request.side_effect = KeeperHubClientError(
            "KeeperHub API error (401): Unauthorized", status_code=401
        )

        result = poll_execution_status("exec-auth", timeout=10, poll_interval=0)

        self.assertEqual(result.status, ExecutionStatus.FAILED)
        self.assertIn("Fatal API error", result.error or "")
        self.assertIn("401", result.error or "")

    @patch.dict(os.environ, {"KEEPERHUB_API_KEY": "kh_test"})
    @patch("agent.lib.keeperhub_client.time.sleep")
    @patch("agent.lib.keeperhub_client._request")
    def test_429_rate_limit_keeps_polling(self, mock_request, mock_sleep):
        """Keeps polling on 429 rate-limit (backs off instead of fail-fast)."""
        mock_request.side_effect = [
            KeeperHubClientError("Rate limited", status_code=429),
            {"status": "confirmed", "txHash": "0xpost429"},
        ]

        result = poll_execution_status("exec-ratelimit", timeout=10, poll_interval=0)

        self.assertEqual(result.status, ExecutionStatus.CONFIRMED)
        self.assertEqual(result.tx_hash, "0xpost429")
        # Verify the rate-limit backoff sleep was called (60s)
        mock_sleep.assert_called()

    @patch.dict(os.environ, {"KEEPERHUB_API_KEY": "kh_test"})
    @patch("agent.lib.keeperhub_client._request")
    def test_5xx_error_keeps_polling(self, mock_request):
        """Keeps polling on 5xx errors (transient server errors)."""
        mock_request.side_effect = [
            RuntimeError("KeeperHub API error (503): Service Unavailable"),
            {"status": "confirmed", "txHash": "0xrecovered"},
        ]

        result = poll_execution_status("exec-5xx", timeout=10, poll_interval=0)

        self.assertEqual(result.status, ExecutionStatus.CONFIRMED)
        self.assertEqual(result.tx_hash, "0xrecovered")

    @patch.dict(os.environ, {"KEEPERHUB_API_KEY": "kh_test"})
    @patch("agent.lib.keeperhub_client._request")
    def test_transient_api_error_keeps_polling(self, mock_request):
        """Continues polling after transient API error."""
        # First call raises, second returns confirmed
        mock_request.side_effect = [
            RuntimeError("connection error"),
            {"status": "confirmed", "txHash": "0xrecovered"},
        ]

        result = poll_execution_status("exec-4", timeout=10, poll_interval=0)

        self.assertEqual(result.status, ExecutionStatus.CONFIRMED)
        self.assertEqual(result.tx_hash, "0xrecovered")


class TestGetExecutionLogs(unittest.TestCase):
    """Test get_execution_logs() with mocked API."""

    @patch.dict(os.environ, {"KEEPERHUB_API_KEY": "kh_test"})
    @patch("agent.lib.keeperhub_client._request")
    def test_returns_log_entries(self, mock_request):
        """Returns parsed log entries."""
        mock_request.return_value = {
            "logs": [
                {"timestamp": "2025-01-01T00:00:00Z", "level": "info", "message": "submitted"},
                {"timestamp": "2025-01-01T00:00:05Z", "level": "info", "message": "confirmed"},
            ]
        }

        logs = get_execution_logs("exec-1")

        self.assertEqual(len(logs), 2)
        self.assertEqual(logs[0]["message"], "submitted")

    @patch.dict(os.environ, {"KEEPERHUB_API_KEY": "kh_test"})
    @patch("agent.lib.keeperhub_client._request")
    def test_returns_empty_when_no_logs(self, mock_request):
        """Returns empty list when response has no logs key."""
        mock_request.return_value = {}

        logs = get_execution_logs("exec-2")

        self.assertEqual(logs, [])


class TestExecuteVerdict(unittest.TestCase):
    """Test the high-level execute_verdict() convenience function."""

    @patch.dict(os.environ, {}, clear=True)
    def test_returns_none_when_not_configured(self):
        """Returns None when KeeperHub is not configured (no API key)."""
        os.environ.pop("KEEPERHUB_API_KEY", None)
        result = execute_verdict(
            contract_address="0xWeft",
            function_name="submitVerdict(bytes32,bool,bytes32)",
            args=["0xa", "true", "0xb"],
        )
        self.assertIsNone(result)

    @patch.dict(os.environ, {"KEEPERHUB_API_KEY": "kh_test"})
    @patch("agent.lib.keeperhub_client.poll_execution_status")
    @patch("agent.lib.keeperhub_client.execute_contract_call")
    def test_successful_verdict(self, mock_call, mock_poll):
        """Submits verdict and polls for confirmation."""
        mock_call.return_value = KeeperHubExecution(
            execution_id="exec-v1",
            tx_hash=None,
            status=ExecutionStatus.PENDING,
            explorer_url=None,
        )
        mock_poll.return_value = KeeperHubExecution(
            execution_id="exec-v1",
            tx_hash="0xverdictx",
            status=ExecutionStatus.CONFIRMED,
            explorer_url="https://explorer/tx/0xverdictx",
        )

        result = execute_verdict(
            contract_address="0xWeft",
            function_name="submitVerdict(bytes32,bool,bytes32)",
            args=["0xhash", "true", "0xevidence"],
            chain_id=16600,
            timeout=60,
        )

        self.assertIsNotNone(result)
        self.assertEqual(result.status, ExecutionStatus.CONFIRMED)
        self.assertEqual(result.tx_hash, "0xverdictx")
        # Verify chain_id was passed to execute_contract_call
        mock_call.assert_called_once_with(
            contract_address="0xWeft",
            function_signature="submitVerdict(bytes32,bool,bytes32)",
            args=["0xhash", "true", "0xevidence"],
            chain_id=16600,
        )
        mock_poll.assert_called_once_with("exec-v1", timeout=60)

    @patch.dict(os.environ, {"KEEPERHUB_API_KEY": "kh_test"})
    @patch("agent.lib.keeperhub_client.execute_contract_call")
    def test_submission_failure_returns_none(self, mock_call):
        """Returns None when contract call submission fails."""
        mock_call.side_effect = RuntimeError("API error (500): internal")

        result = execute_verdict(
            contract_address="0xWeft",
            function_name="submitVerdict(bytes32,bool,bytes32)",
            args=["0xa", "true", "0xb"],
        )

        self.assertIsNone(result)

    @patch.dict(os.environ, {"KEEPERHUB_API_KEY": "kh_test"})
    @patch("agent.lib.keeperhub_client.execute_contract_call")
    def test_no_execution_id_returns_none(self, mock_call):
        """Returns None when API returns no execution ID."""
        mock_call.return_value = KeeperHubExecution(
            execution_id="",
            tx_hash=None,
            status=ExecutionStatus.UNKNOWN,
            explorer_url=None,
        )

        result = execute_verdict(
            contract_address="0xWeft",
            function_name="submitVerdict(bytes32,bool,bytes32)",
            args=["0xa", "true", "0xb"],
        )

        self.assertIsNone(result)

    @patch.dict(os.environ, {"KEEPERHUB_API_KEY": "kh_test"})
    @patch("agent.lib.keeperhub_client.get_execution_logs")
    @patch("agent.lib.keeperhub_client.poll_execution_status")
    @patch("agent.lib.keeperhub_client.execute_contract_call")
    def test_audit_logs_fetched_on_success(self, mock_call, mock_poll, mock_logs):
        """Fetches audit logs when execution succeeds."""
        mock_call.return_value = KeeperHubExecution(
            execution_id="exec-v2",
            tx_hash=None,
            status=ExecutionStatus.PENDING,
            explorer_url=None,
        )
        mock_poll.return_value = KeeperHubExecution(
            execution_id="exec-v2",
            tx_hash="0xaudio",
            status=ExecutionStatus.CONFIRMED,
            explorer_url=None,
        )
        mock_logs.return_value = [
            {"message": "tx submitted"},
            {"message": "tx confirmed"},
        ]

        result = execute_verdict(
            contract_address="0xWeft",
            function_name="submitVerdict(bytes32,bool,bytes32)",
            args=["0xa", "true", "0xb"],
        )

        self.assertEqual(result.status, ExecutionStatus.CONFIRMED)
        mock_logs.assert_called_once_with("exec-v2")

    @patch.dict(os.environ, {"KEEPERHUB_API_KEY": "kh_test"})
    @patch("agent.lib.keeperhub_client.execute_contract_call")
    def test_already_confirmed_no_poll(self, mock_call):
        """Returns immediately without polling when call returns confirmed."""
        mock_call.return_value = KeeperHubExecution(
            execution_id="exec-sync",
            tx_hash="0xsync",
            status=ExecutionStatus.CONFIRMED,
            explorer_url=None,
        )

        # execute_verdict should NOT call poll_execution_status in this case
        with patch("agent.lib.keeperhub_client.poll_execution_status") as mock_poll:
            result = execute_verdict(
                contract_address="0xWeft",
                function_name="submitVerdict(bytes32,bool,bytes32)",
                args=["0xa", "true", "0xb"],
            )

            self.assertEqual(result.status, ExecutionStatus.CONFIRMED)
            mock_poll.assert_not_called()

    @patch.dict(os.environ, {"KEEPERHUB_API_KEY": "kh_test"})
    @patch("agent.lib.keeperhub_client.get_execution_logs")
    @patch("agent.lib.keeperhub_client.poll_execution_status")
    @patch("agent.lib.keeperhub_client.execute_contract_call")
    def test_audit_log_persisted_to_out_dir(self, mock_call, mock_poll, mock_logs):
        """Writes keeperhub_audit.json to out_dir when provided."""
        mock_call.return_value = KeeperHubExecution(
            execution_id="exec-audit",
            tx_hash=None,
            status=ExecutionStatus.PENDING,
            explorer_url=None,
        )
        mock_poll.return_value = KeeperHubExecution(
            execution_id="exec-audit",
            tx_hash="0xauditx",
            status=ExecutionStatus.CONFIRMED,
            explorer_url="https://explorer/tx/0xauditx",
        )
        mock_logs.return_value = [{"message": "tx confirmed", "level": "info"}]

        with tempfile.TemporaryDirectory() as tmp:
            result = execute_verdict(
                contract_address="0xWeft",
                function_name="submitVerdict(bytes32,bool,bytes32)",
                args=["0xa", "true", "0xb"],
                out_dir=tmp,
            )

            self.assertEqual(result.status, ExecutionStatus.CONFIRMED)

            audit_path = os.path.join(tmp, "keeperhub_audit.json")
            self.assertTrue(os.path.exists(audit_path), "keeperhub_audit.json not written")

            with open(audit_path) as f:
                audit = json.load(f)

            self.assertEqual(audit["execution_id"], "exec-audit")
            self.assertEqual(audit["status"], "confirmed")
            self.assertEqual(audit["tx_hash"], "0xauditx")
            self.assertEqual(len(audit["logs"]), 1)
            self.assertEqual(audit["logs"][0]["message"], "tx confirmed")


class TestRequestFunction(unittest.TestCase):
    """Test _request() HTTP layer: envelope unwrapping and error parsing."""

    def _make_response(self, payload: dict) -> io.BytesIO:
        """Return a file-like object that urlopen would return."""
        body = json.dumps(payload).encode("utf-8")
        resp = io.BytesIO(body)
        resp.read = resp.read  # already has .read()
        return resp

    @patch.dict(os.environ, {"KEEPERHUB_API_KEY": "kh_test", "KEEPERHUB_API_URL": "https://mock.keeperhub.com"})
    @patch("urllib.request.urlopen")
    def test_unwraps_data_envelope(self, mock_urlopen):
        """Returns the inner dict when response is wrapped in {\"data\": {...}}."""
        inner = {"executionId": "exec-wrapped", "status": "pending"}
        mock_urlopen.return_value.__enter__ = lambda s: s
        mock_urlopen.return_value.__exit__ = lambda s, *a: False
        mock_urlopen.return_value.read = lambda: json.dumps({"data": inner}).encode("utf-8")

        result = _request("GET", "executions/exec-wrapped/status")

        self.assertEqual(result["executionId"], "exec-wrapped")
        self.assertEqual(result["status"], "pending")

    @patch.dict(os.environ, {"KEEPERHUB_API_KEY": "kh_test", "KEEPERHUB_API_URL": "https://mock.keeperhub.com"})
    @patch("urllib.request.urlopen")
    def test_falls_back_to_raw_when_no_envelope(self, mock_urlopen):
        """Returns raw dict when response has no {\"data\": ...} wrapper."""
        raw = {"executionId": "exec-raw", "status": "confirmed"}
        mock_urlopen.return_value.__enter__ = lambda s: s
        mock_urlopen.return_value.__exit__ = lambda s, *a: False
        mock_urlopen.return_value.read = lambda: json.dumps(raw).encode("utf-8")

        result = _request("GET", "executions/exec-raw/status")

        self.assertEqual(result["executionId"], "exec-raw")
        self.assertEqual(result["status"], "confirmed")

    @patch.dict(os.environ, {"KEEPERHUB_API_KEY": "kh_test", "KEEPERHUB_API_URL": "https://mock.keeperhub.com"})
    @patch("urllib.request.urlopen")
    def test_nested_error_envelope_message(self, mock_urlopen):
        """Extracts message from nested {\"error\": {\"message\": \"...\"}} error body."""
        err_body = json.dumps({"error": {"code": "UNAUTHORIZED", "message": "Invalid API key"}}).encode("utf-8")
        http_err = urllib.error.HTTPError(
            url="https://mock.keeperhub.com/api/v1/executions/x/status",
            code=401,
            msg="Unauthorized",
            hdrs=None,  # type: ignore[arg-type]
            fp=io.BytesIO(err_body),
        )
        mock_urlopen.side_effect = http_err

        with self.assertRaises(RuntimeError) as ctx:
            _request("GET", "executions/x/status")

        self.assertIn("401", str(ctx.exception))
        self.assertIn("Invalid API key", str(ctx.exception))

    @patch.dict(os.environ, {"KEEPERHUB_API_KEY": "kh_test", "KEEPERHUB_API_URL": "https://mock.keeperhub.com"})
    @patch("urllib.request.urlopen")
    def test_error_falls_back_to_code_when_no_message(self, mock_urlopen):
        """Falls back to error.code when error.message is absent."""
        err_body = json.dumps({"error": {"code": "NOT_FOUND"}}).encode("utf-8")
        http_err = urllib.error.HTTPError(
            url="https://mock.keeperhub.com/api/v1/executions/y/status",
            code=404,
            msg="Not Found",
            hdrs=None,  # type: ignore[arg-type]
            fp=io.BytesIO(err_body),
        )
        mock_urlopen.side_effect = http_err

        with self.assertRaises(RuntimeError) as ctx:
            _request("GET", "executions/y/status")

        self.assertIn("404", str(ctx.exception))
        self.assertIn("NOT_FOUND", str(ctx.exception))


if __name__ == "__main__":
    unittest.main()
