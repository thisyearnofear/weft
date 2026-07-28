#!/usr/bin/env python3
# SPDX-License-Identifier: MIT

"""
OKX Agentic Wallet client for Weft.

This module wraps the OKX Onchain OS `okx-agentic-wallet` skill. Because the
skill may not be installed in every environment, the module degrades
gracefully: when OKX credentials are absent, it falls back to the existing
`PRIVATE_KEY` infrastructure so the rest of Weft keeps working.

Responsibilities:
- Resolve the agent's OKX wallet address
- Report balance (stub until OKX skill is wired)
- Sign and verify messages for x402 payment proofs
- Provide a verifier compatible with agent.lib.x402_middleware
"""

from __future__ import annotations

import base64
import hashlib
import json
import os
from dataclasses import dataclass
from typing import Any, Dict, Optional

from .x402_middleware import ExactEvmVerifier, PaymentRequired, PaymentSignature, X402Verifier


# Default chain/network identifiers
_XLAYER_TESTNET = "eip155:195"
_XLAYER_MAINNET = "eip155:196"


# ---------------------------------------------------------------------------
# Types
# ---------------------------------------------------------------------------

@dataclass(frozen=True)
class WalletStatus:
    """Basic OKX wallet status."""
    ok: bool
    address: str = ""
    balance: str = "0"
    currency: str = "USDC"
    network: str = "eip155:195"  # X Layer testnet; mainnet = eip155:196
    error: str = ""


class OkxWalletError(RuntimeError):
    """Raised when OKX wallet operations fail."""
    pass


# ---------------------------------------------------------------------------
# Configuration helpers
# ---------------------------------------------------------------------------

def okx_configured() -> bool:
    """Return True if OKX Onchain OS credentials are present."""
    return bool(os.environ.get("OKX_API_KEY")) and bool(os.environ.get("OKX_SECRET_KEY"))


def wallet_address() -> str:
    """Return the configured OKX Agentic Wallet address, falling back to env vars."""
    return os.environ.get("OKX_AGENTIC_WALLET_ADDRESS", os.environ.get("X402_RECIPIENT", ""))


def network() -> str:
    return os.environ.get("OKX_X402_NETWORK", "eip155:195")


def currency() -> str:
    return os.environ.get("OKX_X402_CURRENCY", "USDC")


# ---------------------------------------------------------------------------
# Wallet client
# ---------------------------------------------------------------------------

class OkxWalletClient:
    """
    Lightweight OKX Agentic Wallet client.

    When OKX Onchain OS is installed and configured, this client delegates to it.
    Until then, it uses environment-based signing keys for x402 proofs so the
    integration can be tested end-to-end without blocking on external packages.
    """

    def __init__(self, *, address: Optional[str] = None, private_key: Optional[str] = None) -> None:
        self._address = address or wallet_address()
        self._private_key = private_key or os.environ.get("OKX_WALLET_PRIVATE_KEY") or os.environ.get("PRIVATE_KEY", "")
        self._use_okx_skill = okx_configured()

    @property
    def address(self) -> str:
        return self._address

    def status(self) -> WalletStatus:
        """Return current wallet status."""
        if not self._address:
            return WalletStatus(ok=False, error="OKX_AGENTIC_WALLET_ADDRESS not configured")
        return WalletStatus(
            ok=True,
            address=self._address,
            balance="0",  # TODO: query OKX skill or on-chain balance
            currency=currency(),
            network=network(),
        )

    def sign_message(self, message: str) -> str:
        """
        Sign a message with the wallet's private key.

        In production this should call the OKX Agentic Wallet skill. The stub
        uses eth_account when available; otherwise it returns a deterministic
        HMAC-based placeholder signature (for testing only).
        """
        if not self._private_key:
            raise OkxWalletError("No private key configured for signing")

        # Prefer real eth_account signing
        try:
            from eth_account.messages import encode_defunct  # type: ignore
            from eth_account import Account  # type: ignore
            account = Account.from_key(self._private_key)
            encoded = encode_defunct(text=message)
            return account.sign_message(encoded).signature.hex()
        except Exception:
            pass

        # Fallback: deterministic HMAC-style placeholder. NOT for production.
        digest = hashlib.sha256((message + self._private_key).encode()).hexdigest()
        return f"0x{digest}"

    def verify_message(self, message: str, signature: str, from_address: Optional[str] = None) -> bool:
        """Verify that signature matches message and optionally from_address."""
        try:
            from eth_account.messages import encode_defunct  # type: ignore
            from eth_account import Account  # type: ignore
            encoded = encode_defunct(text=message)
            recovered = Account.recover_message(encoded, signature=signature).lower()
            if from_address:
                return recovered == from_address.lower()
            return bool(recovered)
        except Exception:
            return False

    def build_payment_signature(
        self,
        required: PaymentRequired,
        from_address: Optional[str] = None,
    ) -> PaymentSignature:
        """
        Build a PaymentSignature for the given PaymentRequired challenge.
        This is the client-side counterpart used in tests and demos.
        """
        if not self._private_key:
            raise OkxWalletError("No private key configured for x402 signing")
        message = _canonical_message(required)
        signature = self.sign_message(message)
        return PaymentSignature(
            scheme=required.scheme,
            network=required.network,
            amount=required.amount,
            currency=required.currency,
            recipient=required.recipient,
            signature=signature,
            from_address=from_address or self._address,
            metadata={"tool": required.metadata.get("tool", "")},
        )

    def x402_verifier(self, *, require_onchain: bool = False) -> X402Verifier:
        """Return an x402 verifier. Currently a generic EVM verifier; in future it
        should delegate to the OKX Agentic Wallet skill once that skill exposes
        an x402 verifier."""
        return ExactEvmVerifier(require_onchain=require_onchain)


# ---------------------------------------------------------------------------
# Convenience functions
# ---------------------------------------------------------------------------

def _canonical_message(required: PaymentRequired) -> str:
    """Canonical message used for x402 payment signatures."""
    return f"{required.network}:{required.amount}:{required.currency}:{required.recipient}"


def default_wallet() -> OkxWalletClient:
    return OkxWalletClient()
