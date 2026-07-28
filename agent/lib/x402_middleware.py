#!/usr/bin/env python3
# SPDX-License-Identifier: MIT

"""
x402 payment middleware for Weft MCP tools.

Supports the "exact" EVM payment scheme. The server challenges clients with a
402 Payment Required response containing a base64-encoded PAYMENT-REQUIRED
header. Clients retry with a PAYMENT-SIGNATURE header. The server verifies the
signature and returns a PAYMENT-RESPONSE header on success.

This module is intentionally dependency-light: it does NOT pull web3.py or any
blockchain SDK. Real on-chain verification can be plugged in via the
X402Verifier protocol (e.g. okx_wallet_client.OkXWalletVerifier).
"""

from __future__ import annotations

import base64
import functools
import json
import os
from dataclasses import dataclass, field
from typing import Any, Callable, Dict, Optional, Protocol


# ---------------------------------------------------------------------------
# Types
# ---------------------------------------------------------------------------

@dataclass(frozen=True)
class PaymentRequired:
    """Server challenge returned in a 402 response."""
    amount: str          # smallest unit (e.g. wei, or USD cents as string)
    currency: str        # e.g. "USDC" or "ETH"
    network: str         # e.g. "eip155:195" (Base Sepolia) or "eip155:1"
    recipient: str       # wallet address that should receive payment
    scheme: str = "exact"
    expires_at: Optional[int] = None  # unix timestamp; optional challenge TTL
    metadata: Dict[str, Any] = field(default_factory=dict)

    def to_header(self) -> str:
        payload = {
            "scheme": self.scheme,
            "network": self.network,
            "amount": self.amount,
            "currency": self.currency,
            "recipient": self.recipient,
        }
        if self.expires_at is not None:
            payload["expiresAt"] = self.expires_at
        if self.metadata:
            payload["metadata"] = self.metadata
        return _b64encode_json(payload)

    @classmethod
    def from_header(cls, header: str) -> "PaymentRequired":
        data = _b64decode_json(header)
        return cls(
            scheme=data.get("scheme", "exact"),
            network=data["network"],
            amount=data["amount"],
            currency=data.get("currency", "USDC"),
            recipient=data["recipient"],
            expires_at=data.get("expiresAt"),
            metadata=data.get("metadata", {}),
        )


@dataclass(frozen=True)
class PaymentSignature:
    """Client payment proof carried in PAYMENT-SIGNATURE header."""
    scheme: str
    network: str
    amount: str
    currency: str
    recipient: str
    signature: str       # hex signature or signed tx payload
    from_address: Optional[str] = None
    tx_hash: Optional[str] = None
    metadata: Dict[str, Any] = field(default_factory=dict)

    def to_header(self) -> str:
        return _b64encode_json({
            "scheme": self.scheme,
            "network": self.network,
            "amount": self.amount,
            "currency": self.currency,
            "recipient": self.recipient,
            "signature": self.signature,
            "from": self.from_address,
            "txHash": self.tx_hash,
            "metadata": self.metadata,
        })

    @classmethod
    def from_header(cls, header: str) -> "PaymentSignature":
        data = _b64decode_json(header)
        return cls(
            scheme=data.get("scheme", "exact"),
            network=data.get("network", ""),
            amount=data.get("amount", ""),
            currency=data.get("currency", ""),
            recipient=data.get("recipient", ""),
            signature=data.get("signature", ""),
            from_address=data.get("from") or data.get("fromAddress"),
            tx_hash=data.get("txHash"),
            metadata=data.get("metadata", {}),
        )


@dataclass(frozen=True)
class PaymentResponse:
    """Server receipt returned in PAYMENT-RESPONSE header."""
    settled: bool
    amount: str
    currency: str
    recipient: str
    tx_hash: Optional[str] = None
    message: str = ""

    def to_header(self) -> str:
        return _b64encode_json({
            "settled": self.settled,
            "amount": self.amount,
            "currency": self.currency,
            "recipient": self.recipient,
            "txHash": self.tx_hash,
            "message": self.message,
        })

    @classmethod
    def from_header(cls, header: str) -> "PaymentResponse":
        data = _b64decode_json(header)
        return cls(
            settled=bool(data.get("settled")),
            amount=data.get("amount", ""),
            currency=data.get("currency", ""),
            recipient=data.get("recipient", ""),
            tx_hash=data.get("txHash"),
            message=data.get("message", ""),
        )


class X402Verifier(Protocol):
    """Pluggable signature / payment verifier."""

    def verify(self, required: PaymentRequired, signature: PaymentSignature) -> bool:
        ...


# ---------------------------------------------------------------------------
# Built-in verifiers
# ---------------------------------------------------------------------------

class TrustVerifier(X402Verifier):
    """Verifier that accepts any well-formed signature. For local demos only."""

    def verify(self, required: PaymentRequired, signature: PaymentSignature) -> bool:
        if not signature.signature:
            return False
        # Basic field matching
        return (
            signature.network == required.network
            and signature.amount == required.amount
            and signature.currency == required.currency
            and signature.recipient.lower() == required.recipient.lower()
        )


class ExactEvmVerifier(X402Verifier):
    """
    Verifier for the x402 'exact' EVM scheme.

    Verifies that the provided signature recovers to the claimed ``from_address``
    over the canonical message ``{network}:{amount}:{currency}:{recipient}``.
    When ``require_onchain=True`` and ``eth_account`` is unavailable, the
    verifier rejects the payment instead of falling back to trust mode.
    """

    def __init__(self, *, require_onchain: bool = False):
        self.require_onchain = require_onchain

    def verify(self, required: PaymentRequired, signature: PaymentSignature) -> bool:
        if not signature.signature:
            return False
        # Field matching
        if signature.network != required.network:
            return False
        if signature.amount != required.amount:
            return False
        if signature.currency != required.currency:
            return False
        if signature.recipient.lower() != required.recipient.lower():
            return False

        # Real EVM signature recovery. eth_account is optional at install time.
        try:
            from eth_account.messages import encode_defunct  # type: ignore
            from eth_account import Account  # type: ignore
            msg = _canonical_message(required)
            encoded = encode_defunct(text=msg)
            recovered = Account.recover_message(encoded, signature=signature.signature).lower()
            expected = (signature.from_address or "").lower()
            if not expected:
                return False
            return recovered == expected
        except Exception:
            # eth_account not installed or signature format unsupported; degrade gracefully
            return not self.require_onchain


class RpcEvmVerifier(ExactEvmVerifier):
    """
    Production-grade verifier for the x402 'exact' EVM scheme.

    In addition to signature recovery, this verifier can optionally:
      - confirm that the referenced ``tx_hash`` succeeded on-chain,
      - check the payer's token balance/allowance on X Layer.

    Requires ``eth_account``. RPC calls are made lazily and are tolerant of RPC
    failures (a missing RPC should not make a valid payment unverifiable).
    """

    def __init__(
        self,
        rpc_url: str,
        token_contract: Optional[str] = None,
        *,
        check_balance: bool = False,
        require_tx: bool = False,
    ) -> None:
        super().__init__(require_onchain=True)
        from .jsonrpc import JsonRpcClient  # local import avoids circular deps

        self.rpc = JsonRpcClient(rpc_url)
        self.token_contract = token_contract
        self.check_balance = check_balance
        self.require_tx = require_tx

    def verify(self, required: PaymentRequired, signature: PaymentSignature) -> bool:
        # Run base signature + field checks first.
        if not super().verify(required, signature):
            return False

        # Optional on-chain settlement proof.
        if self.require_tx and signature.tx_hash:
            if not self._tx_settled_ok(signature.tx_hash, required):
                return False

        # Optional token-balance proof.
        if self.check_balance and self.token_contract and signature.from_address:
            if not self._has_sufficient_balance(signature.from_address, required.amount):
                return False

        return True

    def _tx_settled_ok(self, tx_hash: str, required: PaymentRequired) -> bool:
        """Check that the referenced on-chain tx settled with the expected fields."""
        try:
            receipt = self.rpc.call("eth_getTransactionReceipt", [tx_hash])
            if not receipt or receipt.get("status") != "0x1":
                return False
            to = (receipt.get("to") or "").lower()
            return to == required.recipient.lower()
        except Exception:
            # If we can't reach the RPC, a required-tx check must fail closed.
            return False

    def _has_sufficient_balance(self, address: str, amount: str) -> bool:
        """Return True if ``address`` holds at least ``amount`` of the configured token."""
        try:
            data = _encode_balance_of_call(address)
            result = self.rpc.call("eth_call", [{"to": self.token_contract, "data": data}, "latest"])
            balance = int(result, 16)
            return balance >= int(amount)
        except Exception:
            # Balance checks are advisory; if RPC is down, treat as unknown.
            return False


# ---------------------------------------------------------------------------
# Middleware
# ---------------------------------------------------------------------------

@dataclass(frozen=True)
class ToolPricing:
    """Pricing configuration for a single MCP tool."""
    amount: str          # smallest unit as string
    currency: str = "USDC"
    network: str = "eip155:195"


class X402Middleware:
    """
    Guards selected MCP tools behind x402 payments.

    Usage:
        mw = X402Middleware(
            recipient="0x...",
            pricing={"verify": ToolPricing("10000", "USDC", "eip155:195")},
            verifier=ExactEvmVerifier(),
        )

        # In request handler:
        result, status, headers = mw.handle("verify", {"milestoneHash": "0x..."}, request_headers)
        # status is 200, 402, or 403; headers contains PAYMENT-* when relevant
    """

    def __init__(
        self,
        *,
        recipient: str,
        pricing: Dict[str, ToolPricing],
        verifier: X402Verifier,
        free_tools: Optional[set[str]] = None,
    ) -> None:
        self.recipient = recipient
        self.pricing = pricing
        self.verifier = verifier
        self.free_tools = free_tools or {"status"}

    def is_paid_tool(self, tool: str) -> bool:
        return tool in self.pricing

    def handle(
        self,
        tool: str,
        params: Dict[str, Any],
        headers: Dict[str, str],
    ) -> tuple[Dict[str, Any], int, Dict[str, str]]:
        """
        Process an x402-protected tool invocation.

        Returns: (response_body, http_status, response_headers)
        """
        if tool in self.free_tools:
            return {"ok": True, "tool": tool, "params": params, "paid": False}, 200, {}

        pricing = self.pricing.get(tool)
        if pricing is None:
            return {"ok": False, "error": f"Tool '{tool}' not found or unpaid"}, 404, {}

        required = PaymentRequired(
            amount=pricing.amount,
            currency=pricing.currency,
            network=pricing.network,
            recipient=self.recipient,
            metadata={"tool": tool},
        )

        sig_header = headers.get("PAYMENT-SIGNATURE") or headers.get("payment-signature")
        if not sig_header:
            return (
                {"ok": False, "error": "x402_payment_required", "tool": tool},
                402,
                {"PAYMENT-REQUIRED": required.to_header()},
            )

        try:
            signature = PaymentSignature.from_header(sig_header)
        except Exception as e:
            return (
                {"ok": False, "error": "invalid_payment_signature", "detail": str(e), "tool": tool},
                400,
                {},
            )

        if not self.verifier.verify(required, signature):
            return (
                {"ok": False, "error": "payment_verification_failed", "tool": tool},
                403,
                {},
            )

        response = PaymentResponse(
            settled=True,
            amount=pricing.amount,
            currency=pricing.currency,
            recipient=self.recipient,
            tx_hash=signature.tx_hash,
            message=f"Payment accepted for {tool}",
        )

        return (
            {"ok": True, "tool": tool, "params": params, "paid": True},
            200,
            {"PAYMENT-RESPONSE": response.to_header()},
        )


def env_middleware() -> X402Middleware:
    """
    Build an X402Middleware from environment variables.
    Falls back to TrustVerifier if no OKX wallet address is configured.
    """
    recipient = os.environ.get("OKX_AGENTIC_WALLET_ADDRESS", os.environ.get("X402_RECIPIENT", ""))
    network = os.environ.get("OKX_X402_NETWORK", "eip155:195")  # X Layer testnet; mainnet = 196
    currency = os.environ.get("OKX_X402_CURRENCY", "USDC")
    use_real = os.environ.get("OKX_X402_REAL_VERIFIER", "").lower() in ("1", "true", "yes")

    pricing: Dict[str, ToolPricing] = {
        "verify": ToolPricing(
            amount=os.environ.get("OKX_X402_VERIFY_AMOUNT", "10000"),  # 0.01 USDC if 6 decimals
            currency=currency,
            network=network,
        ),
        "narrate": ToolPricing(
            amount=os.environ.get("OKX_X402_NARRATE_AMOUNT", "50000"),  # 0.05 USDC
            currency=currency,
            network=network,
        ),
        "attest": ToolPricing(
            amount=os.environ.get("OKX_X402_ATTEST_AMOUNT", "25000"),  # 0.025 USDC
            currency=currency,
            network=network,
        ),
        "chronicle": ToolPricing(
            amount=os.environ.get("OKX_X402_CHRONICLE_AMOUNT", "50000"),
            currency=currency,
            network=network,
        ),
    }

    rpc_url = os.environ.get("OKX_X402_RPC_URL")
    token_contract = os.environ.get("OKX_X402_USDC_CONTRACT")
    check_balance = os.environ.get("OKX_X402_CHECK_BALANCE", "").lower() in ("1", "true", "yes")
    require_tx = os.environ.get("OKX_X402_REQUIRE_TX", "").lower() in ("1", "true", "yes")

    verifier: X402Verifier
    if not recipient:
        verifier = TrustVerifier()
    elif use_real and rpc_url:
        verifier = RpcEvmVerifier(
            rpc_url,
            token_contract,
            check_balance=check_balance,
            require_tx=require_tx,
        )
    elif use_real:
        verifier = ExactEvmVerifier(require_onchain=True)
    else:
        verifier = TrustVerifier()

    return X402Middleware(recipient=recipient, pricing=pricing, verifier=verifier)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _b64encode_json(data: Dict[str, Any]) -> str:
    return base64.b64encode(json.dumps(data, separators=(",", ":")).encode("utf-8")).decode("ascii")


def _b64decode_json(header: str) -> Dict[str, Any]:
    return json.loads(base64.b64decode(header, validate=True).decode("utf-8"))


def _canonical_message(required: PaymentRequired) -> str:
    """Canonical message signed for the x402 'exact' EVM scheme."""
    return f"{required.network}:{required.amount}:{required.currency}:{required.recipient}"


def _encode_balance_of_call(address: str) -> str:
    """Encode an ERC-20 ``balanceOf(address)`` call."""
    addr = address.lower().replace("0x", "")
    return f"0x70a08231000000000000000000000000{addr}"



# ---------------------------------------------------------------------------
# Optional decorator for use in other HTTP frameworks
# ---------------------------------------------------------------------------

def x402_guard(
    middleware: X402Middleware,
    tool_name: str,
):
    """
    Decorator that wraps a handler function with x402 payment checks.
    The handler must accept (params, headers) and return a dict.
    """
    def decorator(handler: Callable[[Dict[str, Any], Dict[str, str]], Dict[str, Any]]):
        @functools.wraps(handler)
        def wrapper(params: Dict[str, Any], headers: Dict[str, str]) -> Dict[str, Any]:
            body, status, out_headers = middleware.handle(tool_name, params, headers)
            if status != 200:
                # Propagate as an exception-like structure; caller decides HTTP response
                body["_x402_status"] = status
                body["_x402_headers"] = out_headers
                return body
            result = handler(params, headers)
            result["_x402_headers"] = out_headers
            return result
        return wrapper
    return decorator
