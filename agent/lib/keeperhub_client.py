#!/usr/bin/env python3
# SPDX-License-Identifier: MIT

"""
KeeperHub execution client for Weft.

Provides reliable onchain execution with retry logic, gas optimization,
and audit trails via the KeeperHub API.

DRY: Single source of truth for all KeeperHub interaction.
MODULAR: Independent, testable module with no external dependencies.
ENHANCEMENT FIRST: Replaces raw `cast send` with KeeperHub execution
  when configured; falls back to cast send otherwise.
"""

from __future__ import annotations

import json
import os
import time
import urllib.error
import urllib.request
from dataclasses import dataclass
from enum import Enum
from typing import Any, Dict, List, Optional


# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------

def keeperhub_configured() -> bool:
    """Return True if KeeperHub is available (API key set and not explicitly disabled)."""
    if os.environ.get("KEEPERHUB_ENABLED", "1") == "0":
        return False
    return bool(os.environ.get("KEEPERHUB_API_KEY", ""))


def _api_url() -> str:
    """Return the KeeperHub API base URL."""
    return os.environ.get("KEEPERHUB_API_URL", "https://app.keeperhub.com").rstrip("/")


def _api_key() -> str:
    """Return the KeeperHub API key."""
    return os.environ.get("KEEPERHUB_API_KEY", "")


def _timeout() -> int:
    """Return the timeout in seconds for polling execution status."""
    return int(os.environ.get("KEEPERHUB_TIMEOUT", "120"))


# KeeperHub rate limit: 100 requests/minute for authenticated users.
# At poll_interval=2s we use ~30 req/min per execution — fine for a single
# execution, but concurrent milestones can push us over the limit.
# We detect 429 responses and back off automatically (see poll_execution_status).
_RATE_LIMIT_BACKOFF = 60  # seconds to wait after a 429


# ---------------------------------------------------------------------------
# Types
# ---------------------------------------------------------------------------

class ExecutionStatus(Enum):
    """Status of a KeeperHub execution."""
    PENDING = "pending"
    CONFIRMED = "confirmed"
    FAILED = "failed"
    UNKNOWN = "unknown"


_VALID_STATUSES = {s.value for s in ExecutionStatus}


@dataclass(frozen=True)
class KeeperHubExecution:
    """Result of a KeeperHub contract-call execution."""
    execution_id: str
    tx_hash: Optional[str]
    status: ExecutionStatus
    explorer_url: Optional[str]
    error: Optional[str] = None


class KeeperHubClientError(RuntimeError):
    """4xx client error from KeeperHub API — should not be retried.

    Raised for 400–499 HTTP status codes (except 429 which gets backoff).
    Callers can use isinstance() to distinguish fatal vs transient errors.
    """
    def __init__(self, message: str, status_code: int = 0):
        super().__init__(message)
        self.status_code = status_code


# ---------------------------------------------------------------------------
# Low-level API helpers
# ---------------------------------------------------------------------------

def _request(
    method: str,
    path: str,
    *,
    body: Optional[Dict[str, Any]] = None,
    http_timeout: int = 30,
) -> Dict[str, Any]:
    """Make an authenticated request to the KeeperHub REST API.

    Returns the unwrapped response data as a dict.
    Raises KeeperHubClientError on 4xx, RuntimeError on 5xx/connection errors.
    """
    url = f"{_api_url()}/api/v1/{path.lstrip('/')}"
    headers = {
        "Authorization": f"Bearer {_api_key()}",
        "Content-Type": "application/json",
        "Accept": "application/json",
    }
    data = json.dumps(body).encode("utf-8") if body else None

    req = urllib.request.Request(url, data=data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req, timeout=http_timeout) as resp:
            raw = json.loads(resp.read().decode("utf-8"))
            # KeeperHub wraps success responses in {"data": {...}} — unwrap defensively.
            # If the envelope is absent (non-standard path), fall back to raw dict.
            return raw.get("data", raw)
    except urllib.error.HTTPError as e:
        # Try to parse error body for a useful message.
        # Error responses are nested: {"error": {"message": "...", "code": "..."}}
        try:
            err_body = json.loads(e.read().decode("utf-8"))
            err_obj = err_body.get("error", {})
            if isinstance(err_obj, dict):
                msg = err_obj.get("message") or err_obj.get("code") or str(e)
            else:
                msg = err_obj or err_body.get("message") or str(e)
        except Exception:
            msg = str(e)
        if 400 <= e.code < 500:
            raise KeeperHubClientError(
                f"KeeperHub API error ({e.code}): {msg}", status_code=e.code
            ) from e
        raise RuntimeError(f"KeeperHub API error ({e.code}): {msg}") from e
    except urllib.error.URLError as e:
        raise RuntimeError(f"KeeperHub API connection error: {e}") from e


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def execute_contract_call(
    *,
    contract_address: str,
    function_signature: str,
    args: List[str],
    chain_id: Optional[int] = None,
    gas_limit: Optional[int] = None,
    max_fee_per_gas: Optional[str] = None,
    max_priority_fee_per_gas: Optional[str] = None,
    wallet_id: Optional[str] = None,
) -> KeeperHubExecution:
    """Submit a contract call to KeeperHub for reliable execution.

    This is the primary integration point: replaces `cast send` with
    KeeperHub execution (automatic retry, gas optimization, audit trail).

    Args:
        contract_address: Target smart contract address.
        function_signature: Solidity function signature, e.g.
            "submitVerdict(bytes32,bool,bytes32)".
        args: List of string arguments for the function call.
        chain_id: Chain ID for correct network routing (e.g. 16600 for 0G).
            If not provided, KeeperHub uses the wallet's default chain.
        gas_limit: Optional gas limit override.
        max_fee_per_gas: Optional max fee per gas (wei, as string).
        max_priority_fee_per_gas: Optional max priority fee per gas (wei, as string).
        wallet_id: Optional KeeperHub wallet ID to use for signing.

    Returns:
        KeeperHubExecution with execution_id and initial status.
    """
    body: Dict[str, Any] = {
        "contractAddress": contract_address,
        "functionSignature": function_signature,
        "args": args,
    }
    if chain_id is not None:
        body["chainId"] = chain_id
    if gas_limit is not None:
        body["gasLimit"] = gas_limit
    if max_fee_per_gas is not None:
        body["maxFeePerGas"] = max_fee_per_gas
    if max_priority_fee_per_gas is not None:
        body["maxPriorityFeePerGas"] = max_priority_fee_per_gas
    if wallet_id is not None:
        body["walletId"] = wallet_id

    resp = _request("POST", "executions/contract-call", body=body)

    execution_id = resp.get("executionId") or resp.get("id") or ""
    status_str = resp.get("status", "pending").lower()
    tx_hash = resp.get("txHash") or resp.get("transactionHash")
    explorer_url = resp.get("explorerUrl") or resp.get("txExplorerUrl")

    return KeeperHubExecution(
        execution_id=execution_id,
        tx_hash=tx_hash,
        status=ExecutionStatus(status_str) if status_str in _VALID_STATUSES else ExecutionStatus.UNKNOWN,
        explorer_url=explorer_url,
    )


def poll_execution_status(
    execution_id: str,
    *,
    timeout: Optional[int] = None,
    poll_interval: int = 2,
) -> KeeperHubExecution:
    """Poll KeeperHub for execution status until confirmed, failed, or timeout.

    Args:
        execution_id: The execution ID returned by execute_contract_call.
        timeout: Maximum seconds to wait (default: KEEPERHUB_TIMEOUT env or 120).
        poll_interval: Seconds between status checks.

    Returns:
        Final KeeperHubExecution with tx_hash on success or error on failure.
    """
    deadline = time.time() + (timeout or _timeout())

    while time.time() < deadline:
        try:
            resp = _request("GET", f"executions/{execution_id}/status", http_timeout=10)
        except KeeperHubClientError as e:
            # 429 rate-limit: back off and keep polling.
            if e.status_code == 429:
                print(f"keeperhub: rate-limited (429); backing off {_RATE_LIMIT_BACKOFF}s")
                time.sleep(_RATE_LIMIT_BACKOFF)
                continue
            # Other 4xx errors (auth, not-found, bad-request) — fail fast.
            return KeeperHubExecution(
                execution_id=execution_id,
                tx_hash=None,
                status=ExecutionStatus.FAILED,
                explorer_url=None,
                error=f"Fatal API error ({e.status_code}): {e}",
            )
        except RuntimeError:
            # 5xx / connection errors — transient, keep polling.
            time.sleep(poll_interval)
            continue

        status_str = (resp.get("status") or "unknown").lower()
        tx_hash = resp.get("txHash") or resp.get("transactionHash")
        explorer_url = resp.get("explorerUrl") or resp.get("txExplorerUrl")
        error = resp.get("error") or resp.get("errorMessage")

        if status_str == "confirmed":
            return KeeperHubExecution(
                execution_id=execution_id,
                tx_hash=tx_hash,
                status=ExecutionStatus.CONFIRMED,
                explorer_url=explorer_url,
            )
        elif status_str == "failed":
            return KeeperHubExecution(
                execution_id=execution_id,
                tx_hash=tx_hash,
                status=ExecutionStatus.FAILED,
                explorer_url=explorer_url,
                error=error,
            )
        # Still pending — keep polling
        time.sleep(poll_interval)

    # Timeout
    return KeeperHubExecution(
        execution_id=execution_id,
        tx_hash=None,
        status=ExecutionStatus.PENDING,
        explorer_url=None,
        error=f"Polling timed out after {timeout or _timeout()}s",
    )


def get_execution_logs(execution_id: str) -> List[Dict[str, Any]]:
    """Retrieve audit trail logs for a KeeperHub execution.

    Returns:
        List of log entry dicts with timestamp, level, message, etc.
    """
    resp = _request("GET", f"executions/{execution_id}/logs")
    return resp.get("logs") or resp.get("entries") or []


def execute_verdict(
    *,
    contract_address: str,
    function_name: str,
    args: List[str],
    chain_id: Optional[int] = None,
    timeout: Optional[int] = None,
    out_dir: Optional[str] = None,
) -> Optional[KeeperHubExecution]:
    """High-level helper: submit submitVerdict() via KeeperHub and poll for result.

    This is the convenience function that weft_daemon.py calls.
    It submits the contract call, polls for confirmation, and returns
    the final execution result.

    If KeeperHub is not configured (no API key or KEEPERHUB_ENABLED=0),
    returns None so the caller can fall back to `cast send`.

    Args:
        contract_address: WeftMilestone contract address.
        function_name: Function signature (e.g. "submitVerdict(bytes32,bool,bytes32)").
        args: [milestone_hash, verified, evidence_root] as strings.
        chain_id: Chain ID for correct network routing (e.g. 16600 for 0G).
            If not provided, KeeperHub uses the wallet's default chain.
        timeout: Optional override for polling timeout in seconds.
        out_dir: Optional directory path to write keeperhub_audit.json
            (execution details + logs for provenance).

    Returns:
        KeeperHubExecution on success/failure, or None if KeeperHub not configured.
    """
    if not keeperhub_configured():
        return None

    try:
        exec_result = execute_contract_call(
            contract_address=contract_address,
            function_signature=function_name,
            args=args,
            chain_id=chain_id,
        )
    except KeeperHubClientError as e:
        print(f"keeperhub: contract-call rejected ({e.status_code}): {e}")
        return None
    except RuntimeError as e:
        print(f"keeperhub: contract-call submission failed: {e}")
        return None

    if not exec_result.execution_id:
        print(f"keeperhub: no execution ID returned; cannot poll")
        return None

    # If already confirmed (synchronous path on some configs)
    if exec_result.status == ExecutionStatus.CONFIRMED:
        return exec_result

    # Poll for completion
    final = poll_execution_status(exec_result.execution_id, timeout=timeout)

    # Retrieve audit logs for provenance (cache to avoid duplicate fetch)
    logs = None
    if final.status == ExecutionStatus.CONFIRMED:
        try:
            logs = get_execution_logs(exec_result.execution_id)
            if logs:
                print(f"keeperhub: audit trail entries={len(logs)} execution_id={exec_result.execution_id}")
        except RuntimeError:
            pass  # audit log fetch is best-effort

    # Persist audit trail to disk if out_dir provided
    if out_dir and final.status in (ExecutionStatus.CONFIRMED, ExecutionStatus.FAILED):
        try:
            audit = {
                "execution_id": final.execution_id,
                "status": final.status.value,
                "tx_hash": final.tx_hash,
                "explorer_url": final.explorer_url,
                "error": final.error,
            }
            # Fetch logs if not already retrieved (e.g. failed execution)
            if logs is None:
                try:
                    logs = get_execution_logs(final.execution_id)
                except RuntimeError:
                    logs = []
            audit["logs"] = logs or []
            audit_path = os.path.join(out_dir, "keeperhub_audit.json")
            with open(audit_path, "w", encoding="utf-8") as f:
                json.dump(audit, f, indent=2, sort_keys=True)
                f.write("\n")
        except Exception:
            pass  # audit persistence is best-effort

    return final
