# SPDX-License-Identifier: MIT
"""Tests for stripe_skills_client — the autonomous spend layer."""

import json
import os
import pytest
from unittest.mock import patch, MagicMock
from io import BytesIO
from urllib.error import HTTPError, URLError

from agent.lib.stripe_skills_client import (
    Balance,
    Charge,
    PaymentResult,
    ProfitLoss,
    ProvisionResult,
    StripeSkillsError,
    fund_wallet_from_revenue,
    get_balance,
    get_profit_loss,
    list_recent_charges,
    pay_for_service,
    provision_saas,
    stripe_configured,
    _invalidate_charge_cache,
    _set_charge_cache,
)


class TestConfiguration:
    def test_not_configured_when_key_missing(self, monkeypatch):
        monkeypatch.delenv("STRIPE_SKILLS_KEY", raising=False)
        monkeypatch.delenv("STRIPE_API_KEY", raising=False)
        assert stripe_configured() is False

    def test_configured_when_key_set(self, monkeypatch):
        monkeypatch.setenv("STRIPE_SKILLS_KEY", "sk_test_123")
        assert stripe_configured() is True

    def test_configured_via_legacy_env(self, monkeypatch):
        monkeypatch.delenv("STRIPE_SKILLS_KEY", raising=False)
        monkeypatch.setenv("STRIPE_API_KEY", "sk_legacy_456")
        assert stripe_configured() is True


class TestPayForService:
    def test_noop_when_not_configured(self, monkeypatch):
        monkeypatch.delenv("STRIPE_SKILLS_KEY", raising=False)
        monkeypatch.delenv("STRIPE_API_KEY", raising=False)
        result = pay_for_service("kimi", 0.01)
        assert result.ok is False
        assert result.service == "kimi"
        assert result.error == ""

    def test_success_when_configured(self, monkeypatch):
        monkeypatch.setenv("STRIPE_SKILLS_KEY", "sk_test_123")
        mock_resp = MagicMock()
        mock_resp.__enter__ = MagicMock(return_value=mock_resp)
        mock_resp.__exit__ = MagicMock(return_value=False)
        mock_resp.read.return_value = json.dumps({"id": "ch_test_001"}).encode()
        with patch("agent.lib.stripe_skills_client.urllib.request.urlopen", return_value=mock_resp):
            result = pay_for_service("kimi", 0.01, memo="test narrative")
        assert result.ok is True
        assert result.charge_id == "ch_test_001"
        assert result.amount_usd == 0.01
        assert result.service == "kimi"

    def test_failure_on_api_error(self, monkeypatch):
        monkeypatch.setenv("STRIPE_SKILLS_KEY", "sk_test_123")
        error = HTTPError("url", 500, "Server Error", {}, BytesIO(b'{"error": "oops"}'))
        with patch("agent.lib.stripe_skills_client.urllib.request.urlopen", side_effect=error):
            result = pay_for_service("kimi", 0.01)
        assert result.ok is False
        assert "500" in result.error


class TestFundWalletFromRevenue:
    def test_noop_when_not_configured(self, monkeypatch):
        monkeypatch.delenv("STRIPE_SKILLS_KEY", raising=False)
        result = fund_wallet_from_revenue(100.0)
        assert result.ok is False
        assert result.service == "revenue_sweep"

    def test_zero_amount_noop(self, monkeypatch):
        monkeypatch.setenv("STRIPE_SKILLS_KEY", "sk_test_123")
        result = fund_wallet_from_revenue(0.0)
        assert result.ok is False
        assert result.charge_id == ""

    def test_success_sweep(self, monkeypatch):
        monkeypatch.setenv("STRIPE_SKILLS_KEY", "sk_test_123")
        mock_resp = MagicMock()
        mock_resp.__enter__ = MagicMock(return_value=mock_resp)
        mock_resp.__exit__ = MagicMock(return_value=False)
        mock_resp.read.return_value = json.dumps({"id": "topup_001"}).encode()
        with patch("agent.lib.stripe_skills_client.urllib.request.urlopen", return_value=mock_resp):
            result = fund_wallet_from_revenue(50.0, source="milestone 0xabc")
        assert result.ok is True
        assert result.charge_id == "topup_001"
        assert result.amount_usd == 50.0


class TestGetBalance:
    def test_not_configured_returns_error(self, monkeypatch):
        monkeypatch.delenv("STRIPE_SKILLS_KEY", raising=False)
        bal = get_balance()
        assert bal.ok is False
        assert "not configured" in bal.error

    def test_returns_balance_when_configured(self, monkeypatch):
        monkeypatch.setenv("STRIPE_SKILLS_KEY", "sk_test_123")
        mock_resp = MagicMock()
        mock_resp.__enter__ = MagicMock(return_value=mock_resp)
        mock_resp.__exit__ = MagicMock(return_value=False)
        mock_resp.read.return_value = json.dumps({
            "available": [{"amount": 75000}],  # $750.00 in cents
            "pending": [{"amount": 1000}],     # $10.00 in cents
        }).encode()
        with patch("agent.lib.stripe_skills_client.urllib.request.urlopen", return_value=mock_resp):
            bal = get_balance()
        assert bal.ok is True
        assert bal.available_usd == 750.0
        assert bal.pending_usd == 10.0


class TestListRecentCharges:
    def test_not_configured_returns_empty(self, monkeypatch):
        monkeypatch.delenv("STRIPE_SKILLS_KEY", raising=False)
        assert list_recent_charges() == []

    def test_returns_charges_when_configured(self, monkeypatch):
        monkeypatch.setenv("STRIPE_SKILLS_KEY", "sk_test_123")
        _invalidate_charge_cache()  # ensure clean cache
        mock_resp = MagicMock()
        mock_resp.__enter__ = MagicMock(return_value=mock_resp)
        mock_resp.__exit__ = MagicMock(return_value=False)
        mock_resp.read.return_value = json.dumps({
            "data": [
                {"id": "ch_1", "amount": 100, "description": "kimi narrative", "metadata": {"service": "kimi"}, "created": 1700000000},
                {"id": "ch_2", "amount": 500, "description": "fal image", "metadata": {"service": "fal"}, "created": 1700000100},
            ]
        }).encode()
        with patch("agent.lib.stripe_skills_client.urllib.request.urlopen", return_value=mock_resp):
            charges = list_recent_charges()
        assert len(charges) == 2
        assert charges[0].service == "kimi"
        assert charges[0].amount_usd == 1.0
        assert charges[1].service == "fal"
        assert charges[1].amount_usd == 5.0

    def test_cache_returns_same_results(self, monkeypatch):
        monkeypatch.setenv("STRIPE_SKILLS_KEY", "sk_test_123")
        _invalidate_charge_cache()
        cached_charges = [Charge(charge_id="ch_cached", amount_usd=1.0, service="kimi", memo="cached", created=1700000000)]
        _set_charge_cache(cached_charges)
        # Should return cached without making API call
        with patch("agent.lib.stripe_skills_client.urllib.request.urlopen") as mock_urlopen:
            charges = list_recent_charges()
            mock_urlopen.assert_not_called()
        assert len(charges) == 1
        assert charges[0].charge_id == "ch_cached"
        _invalidate_charge_cache()


class TestGetProfitLoss:
    def test_empty_charges(self, monkeypatch):
        monkeypatch.delenv("STRIPE_SKILLS_KEY", raising=False)
        pnl = get_profit_loss()
        assert pnl.total_earned_usd == 0.0
        assert pnl.total_spent_usd == 0.0
        assert pnl.net_usd == 0.0
        assert pnl.profitable is True  # 0 >= 0

    def test_with_charges(self, monkeypatch):
        monkeypatch.setenv("STRIPE_SKILLS_KEY", "sk_test_123")
        _invalidate_charge_cache()
        cached_charges = [
            Charge(charge_id="ch_1", amount_usd=100.0, service="revenue_sweep", memo="milestone 0xabc", created=1700000000),
            Charge(charge_id="ch_2", amount_usd=0.01, service="kimi", memo="narrative", created=1700000100),
            Charge(charge_id="ch_3", amount_usd=0.05, service="fal", memo="image", created=1700000200),
            Charge(charge_id="ch_4", amount_usd=0.10, service="keeperhub", memo="verdict", created=1700000300),
        ]
        _set_charge_cache(cached_charges)
        pnl = get_profit_loss()
        assert pnl.total_earned_usd == 100.0
        assert pnl.total_spent_usd == 0.16
        assert pnl.net_usd == pytest.approx(99.84)
        assert pnl.profitable is True
        assert pnl.spend_by_service["kimi"] == 0.01
        assert pnl.spend_by_service["fal"] == 0.05
        assert pnl.spend_by_service["keeperhub"] == 0.10
        _invalidate_charge_cache()


class TestProvisionSaas:
    def test_noop_when_not_configured(self, monkeypatch):
        monkeypatch.delenv("STRIPE_SKILLS_KEY", raising=False)
        result = provision_saas("hosting")
        assert result.ok is False
        assert result.product == "hosting"

    def test_success(self, monkeypatch):
        monkeypatch.setenv("STRIPE_SKILLS_KEY", "sk_test_123")
        mock_resp = MagicMock()
        mock_resp.__enter__ = MagicMock(return_value=mock_resp)
        mock_resp.__exit__ = MagicMock(return_value=False)
        mock_resp.read.return_value = json.dumps({
            "id": "sub_001",
            "status": "active",
            "metadata": {"plan": "pro"},
        }).encode()
        with patch("agent.lib.stripe_skills_client.urllib.request.urlopen", return_value=mock_resp):
            result = provision_saas("hosting", params={"plan": "pro"})
        assert result.ok is True
        assert result.subscription_id == "sub_001"
        assert result.status == "active"
