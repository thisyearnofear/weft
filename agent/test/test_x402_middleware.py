"""Tests for agent.lib.x402_middleware."""

import base64
import json
import unittest

from agent.lib.x402_middleware import (
    PaymentRequired,
    PaymentSignature,
    ToolPricing,
    TrustVerifier,
    X402Middleware,
)


class TestX402Middleware(unittest.TestCase):
    def setUp(self):
        self.pricing = {
            "verify": ToolPricing(amount="10000", currency="USDC", network="eip155:84532"),
            "narrate": ToolPricing(amount="50000", currency="USDC", network="eip155:84532"),
        }
        self.mw = X402Middleware(
            recipient="0xRecipient",
            pricing=self.pricing,
            verifier=TrustVerifier(),
            free_tools={"status"},
        )

    def _build_signature(self, required: PaymentRequired) -> str:
        sig = PaymentSignature(
            scheme=required.scheme,
            network=required.network,
            amount=required.amount,
            currency=required.currency,
            recipient=required.recipient,
            signature="0x" + "a" * 128,
        )
        return sig.to_header()

    def test_free_tool_passes_without_payment(self):
        body, status, headers = self.mw.handle("status", {"milestoneHash": "0xabc"}, {})
        self.assertEqual(status, 200)
        self.assertTrue(body["ok"])
        self.assertFalse(body["paid"])

    def test_paid_tool_without_payment_returns_402(self):
        body, status, headers = self.mw.handle("verify", {"milestoneHash": "0xabc"}, {})
        self.assertEqual(status, 402)
        self.assertEqual(body["error"], "x402_payment_required")
        self.assertIn("PAYMENT-REQUIRED", headers)
        decoded = json.loads(base64.b64decode(headers["PAYMENT-REQUIRED"]))
        self.assertEqual(decoded["amount"], "10000")
        self.assertEqual(decoded["currency"], "USDC")

    def test_paid_tool_with_valid_payment_succeeds(self):
        required = PaymentRequired(
            amount="10000",
            currency="USDC",
            network="eip155:84532",
            recipient="0xRecipient",
        )
        sig_header = self._build_signature(required)
        body, status, headers = self.mw.handle("verify", {"milestoneHash": "0xabc"}, {"PAYMENT-SIGNATURE": sig_header})
        self.assertEqual(status, 200)
        self.assertTrue(body["paid"])
        self.assertIn("PAYMENT-RESPONSE", headers)

    def test_paid_tool_with_mismatched_amount_fails(self):
        sig = PaymentSignature(
            scheme="exact",
            network="eip155:84532",
            amount="20000",
            currency="USDC",
            recipient="0xRecipient",
            signature="0x" + "a" * 128,
        )
        body, status, _ = self.mw.handle("verify", {"milestoneHash": "0xabc"}, {"PAYMENT-SIGNATURE": sig.to_header()})
        self.assertEqual(status, 403)

    def test_unknown_tool_returns_404(self):
        body, status, _ = self.mw.handle("unknown", {}, {})
        self.assertEqual(status, 404)


class TestPaymentRequired(unittest.TestCase):
    def test_round_trip(self):
        original = PaymentRequired(
            amount="10000",
            currency="USDC",
            network="eip155:84532",
            recipient="0xRecipient",
            metadata={"tool": "verify"},
        )
        decoded = PaymentRequired.from_header(original.to_header())
        self.assertEqual(decoded.amount, original.amount)
        self.assertEqual(decoded.currency, original.currency)
        self.assertEqual(decoded.network, original.network)
        self.assertEqual(decoded.recipient, original.recipient)
        self.assertEqual(decoded.metadata["tool"], "verify")


if __name__ == "__main__":
    unittest.main()
