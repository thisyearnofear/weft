#!/usr/bin/env python3
# SPDX-License-Identifier: MIT

"""
KeeperHub MCP HTTP client (stdlib only).

Mirrors the official keeperhub-mcp Python client:
https://github.com/KeeperHub/mcp/tree/main/python

Used when KEEPERHUB_TRANSPORT=mcp so the daemon executes onchain writes
through KeeperHub's hosted MCP tools (execute_contract_call,
get_direct_execution_status) instead of the REST /api/v1 path.
"""

from __future__ import annotations

import json
import os
import threading
import urllib.error
import urllib.request
import uuid
from typing import Any, Dict, List, Optional, Tuple

MCP_PROTOCOL_VERSION = "2024-11-05"
DEFAULT_MCP_URL = "https://app.keeperhub.com/mcp"
DEFAULT_CLIENT_NAME = "weft-daemon"
DEFAULT_CLIENT_VERSION = "1.0.0"
USER_AGENT = f"{DEFAULT_CLIENT_NAME}/{DEFAULT_CLIENT_VERSION} (Weft; +https://github.com/thisyearnofear/weft)"


class KeeperHubMcpError(RuntimeError):
    """MCP session or tool invocation failed."""


def _mcp_url() -> str:
    base = os.environ.get("KEEPERHUB_API_URL", DEFAULT_MCP_URL).rstrip("/")
    if base.endswith("/mcp"):
        return base
    return f"{base}/mcp"


def _api_key() -> str:
    return os.environ.get("KEEPERHUB_API_KEY", "").strip()


def _headers_base() -> Dict[str, str]:
    return {
        "Content-Type": "application/json",
        "Accept": "application/json, text/event-stream",
        "Authorization": f"Bearer {_api_key()}",
        "User-Agent": USER_AGENT,
    }


def _read_json_response(resp) -> Dict[str, Any]:
    raw = resp.read().decode("utf-8")
    if not raw.strip():
        return {}
    payload = json.loads(raw)
    if payload.get("error"):
        err = payload["error"]
        msg = err.get("message") if isinstance(err, dict) else str(err)
        raise KeeperHubMcpError(f"KeeperHub RPC error: {msg}")
    return payload.get("result") or {}


def _session_header(resp) -> Optional[str]:
    get = getattr(resp.headers, "get", None)
    if callable(get):
        sid = get("mcp-session-id") or get("Mcp-Session-Id")
        if sid:
            return sid
    for key, value in resp.headers.items():
        if key.lower() == "mcp-session-id":
            return value
    return None


class KeeperHubMcpClient:
    """One MCP session per instance; lazy init; re-init on 401 / session 404."""

    __slots__ = (
        "_lock",
        "_session_id",
        "_request_id",
        "client_name",
        "client_version",
    )

    def __init__(
        self,
        *,
        client_name: str = DEFAULT_CLIENT_NAME,
        client_version: str = DEFAULT_CLIENT_VERSION,
    ) -> None:
        key = _api_key()
        if not key:
            raise KeeperHubMcpError("KEEPERHUB_API_KEY is required for MCP transport")
        if not key.startswith("kh_"):
            raise KeeperHubMcpError(
                "MCP requires an organization API key (kh_) from "
                "Settings → API Keys → Organisation — not a wfb_ webhook key."
            )
        self.client_name = client_name
        self.client_version = client_version
        self._lock = threading.RLock()
        self._session_id: Optional[str] = None
        self._request_id = 0

    def reset_session(self) -> None:
        self._session_id = None

    def _post(self, body: Dict[str, Any], *, attempt: int = 0) -> Dict[str, Any]:
        headers = dict(_headers_base())
        if self._session_id:
            headers["mcp-session-id"] = self._session_id
        method = body.get("method", "")
        if method == "tools/call":
            params = body.get("params") or {}
            headers["Mcp-Method"] = method
            if params.get("name"):
                headers["Mcp-Name"] = str(params["name"])
        req = urllib.request.Request(
            _mcp_url(),
            data=json.dumps(body).encode("utf-8"),
            headers=headers,
            method="POST",
        )
        try:
            with urllib.request.urlopen(req, timeout=120) as resp:
                return _read_json_response(resp)
        except urllib.error.HTTPError as e:
            text = e.read().decode("utf-8", errors="replace")
            if e.code == 401 and attempt < 1:
                self._session_id = None
                self._ensure_session_unlocked()
                return self._post(body, attempt=attempt + 1)
            if e.code == 404 and "session" in text.lower() and attempt < 1:
                self._session_id = None
                self._ensure_session_unlocked()
                return self._post(body, attempt=attempt + 1)
            raise KeeperHubMcpError(f"KeeperHub MCP error ({e.code}): {text}") from e
        except urllib.error.URLError as e:
            raise KeeperHubMcpError(f"KeeperHub MCP connection error: {e}") from e

    def _ensure_session_unlocked(self) -> None:
        if self._session_id is not None:
            return
        self._request_id += 1
        body = {
            "jsonrpc": "2.0",
            "id": self._request_id,
            "method": "initialize",
            "params": {
                "protocolVersion": MCP_PROTOCOL_VERSION,
                "capabilities": {},
                "clientInfo": {
                    "name": self.client_name,
                    "version": self.client_version,
                },
            },
        }
        req = urllib.request.Request(
            _mcp_url(),
            data=json.dumps(body).encode("utf-8"),
            headers=_headers_base(),
            method="POST",
        )
        try:
            with urllib.request.urlopen(req, timeout=30) as resp:
                sid = _session_header(resp)
                resp.read()
                # Bearer-only mode: newer KeeperHub may omit session id for kh_ keys.
                self._session_id = sid or ""
        except urllib.error.HTTPError as e:
            text = e.read().decode("utf-8", errors="replace")
            raise KeeperHubMcpError(f"KeeperHub initialize failed ({e.code}): {text}") from e

    def call_tool(self, name: str, arguments: Optional[Dict[str, Any]] = None) -> Any:
        args = arguments if arguments is not None else {}
        with self._lock:
            self._ensure_session_unlocked()
            self._request_id += 1
            body = {
                "jsonrpc": "2.0",
                "id": self._request_id,
                "method": "tools/call",
                "params": {"name": name, "arguments": args},
            }
            result = self._post(body)

        if isinstance(result, dict) and result.get("isError"):
            msg = "Unknown KeeperHub error"
            content = result.get("content")
            if isinstance(content, list) and content:
                block = content[0]
                if isinstance(block, dict) and isinstance(block.get("text"), str):
                    msg = block["text"]
            raise KeeperHubMcpError(f"KeeperHub tool error ({name}): {msg}")

        content = result.get("content") if isinstance(result, dict) else None
        if isinstance(content, list) and content:
            block = content[0]
            if isinstance(block, dict):
                txt = block.get("text")
                if isinstance(txt, str):
                    try:
                        return json.loads(txt)
                    except json.JSONDecodeError:
                        return txt
        return result


_cached_client: Optional[KeeperHubMcpClient] = None
_cached_key: Optional[str] = None


def get_mcp_client() -> KeeperHubMcpClient:
    global _cached_client, _cached_key
    key = _api_key()
    if _cached_client is None or _cached_key != key:
        _cached_client = KeeperHubMcpClient()
        _cached_key = key
    return _cached_client


def reset_mcp_client_for_tests() -> None:
    global _cached_client, _cached_key
    _cached_client = None
    _cached_key = None


def _network_for_chain(chain_id: Optional[int]) -> str:
    if chain_id is not None:
        return str(chain_id)
    env_chain = os.environ.get("CHAIN_ID", "").strip()
    if env_chain:
        return env_chain
    return "16602"  # 0G Galileo testnet default


def _parse_tool_result(data: Any) -> Dict[str, Any]:
    if isinstance(data, dict):
        return data
    if isinstance(data, str):
        try:
            parsed = json.loads(data)
            if isinstance(parsed, dict):
                return parsed
        except json.JSONDecodeError:
            pass
    return {}


def _status_from_payload(payload: Dict[str, Any]) -> str:
    status = (payload.get("status") or "unknown").lower()
    if status in ("confirmed", "completed", "success"):
        return "confirmed"
    if status in ("failed", "error"):
        return "failed"
    if status in ("pending", "processing", "submitted"):
        return "pending"
    if payload.get("success") is True and payload.get("executionId"):
        return "pending"
    return status


def _load_weft_abi() -> Optional[str]:
    path = os.environ.get(
        "WEFT_MILESTONE_ABI_PATH",
        os.path.join(os.path.dirname(__file__), "..", "..", "contracts", "abi", "WeftMilestone.json"),
    )
    if not os.path.isfile(path):
        return None
    with open(path, encoding="utf-8") as f:
        return f.read()


def mcp_execute_contract_call(
    *,
    contract_address: str,
    function_signature: str,
    args: List[str],
    chain_id: Optional[int] = None,
    simulate_first: bool = True,
    idempotency_key: Optional[str] = None,
    abi: Optional[str] = None,
) -> Tuple[str, str, Optional[str], Optional[str]]:
    """Submit a contract call via MCP execute_contract_call.

    Returns (execution_id, status, tx_hash, explorer_url).
    status is one of: pending, confirmed, failed.
    """
    client = get_mcp_client()
    chain = _network_for_chain(chain_id)
    tool_args: Dict[str, Any] = {
        "contract_address": contract_address,
        "chain_id": chain,
        "function_name": function_signature,
        "function_args": json.dumps(args),
    }
    abi_json = abi or _load_weft_abi()
    if abi_json:
        tool_args["abi"] = abi_json

    if simulate_first:
        sim = client.call_tool("execute_contract_call", {**tool_args, "simulate": True})
        sim_payload = _parse_tool_result(sim)
        if sim_payload.get("wouldRevert") or sim_payload.get("success") is False:
            reason = (
                sim_payload.get("error")
                or sim_payload.get("revertReason")
                or "simulation failed"
            )
            raise KeeperHubMcpError(f"KeeperHub simulation rejected call: {reason}")

    idem = idempotency_key or str(uuid.uuid4())
    write = client.call_tool(
        "execute_contract_call",
        {**tool_args, "idempotency_key": idem},
    )
    payload = _parse_tool_result(write)
    execution_id = (
        payload.get("executionId")
        or payload.get("execution_id")
        or payload.get("id")
        or ""
    )
    status = _status_from_payload(payload)
    tx_hash = (
        payload.get("txHash")
        or payload.get("transactionHash")
        or (payload.get("result") or {}).get("transactionHash")
        or (payload.get("receipts") or [{}])[0].get("hash")
    )
    explorer_url = (
        payload.get("explorerUrl")
        or payload.get("transactionLink")
        or (payload.get("result") or {}).get("transactionLink")
    )
    return execution_id, status, tx_hash, explorer_url


def mcp_poll_direct_execution(
    execution_id: str,
    *,
    timeout: int = 120,
    poll_interval: int = 2,
) -> Tuple[str, Optional[str], Optional[str], Optional[str]]:
    """Poll get_direct_execution_status until terminal state.

    Returns (status, tx_hash, explorer_url, error).
    """
    import time

    client = get_mcp_client()
    deadline = time.time() + timeout

    while time.time() < deadline:
        raw = client.call_tool(
            "get_direct_execution_status",
            {"execution_id": execution_id},
        )
        payload = _parse_tool_result(raw)
        status = _status_from_payload(payload)
        tx_hash = (
            payload.get("txHash")
            or payload.get("transactionHash")
            or (payload.get("result") or {}).get("transactionHash")
            or (payload.get("receipts") or [{}])[0].get("hash")
        )
        explorer_url = (
            payload.get("explorerUrl")
            or payload.get("transactionLink")
            or (payload.get("result") or {}).get("transactionLink")
        )
        error = payload.get("error") or payload.get("errorMessage")

        if status == "confirmed":
            return status, tx_hash, explorer_url, None
        if status == "failed":
            return status, tx_hash, explorer_url, error

        hint = payload.get("pollIntervalHint") or payload.get("poll_interval_hint")
        sleep_for = poll_interval
        if isinstance(hint, (int, float)) and hint > 0:
            sleep_for = int(hint)
        time.sleep(sleep_for)

    return "pending", None, None, f"Polling timed out after {timeout}s"


def mcp_get_execution_logs(execution_id: str) -> List[Dict[str, Any]]:
    """Fetch combined status + step logs via MCP get_execution."""
    client = get_mcp_client()
    raw = client.call_tool("get_execution", {"execution_id": execution_id})
    payload = _parse_tool_result(raw)
    logs = payload.get("logs") or payload.get("entries") or payload.get("steps") or []
    return logs if isinstance(logs, list) else []
