#!/usr/bin/env python3
# SPDX-License-Identifier: MIT

"""
Stripe Skills client for Weft — the agent's autonomous spend layer.

This is the "spend" half of the earn→spend loop that makes Weft an
agent-run company: the agent earns 3% of released capital per milestone,
then uses Stripe Skills to pay for the services it consumes (Kimi, fal.ai,
KeeperHub, 0G Storage, hosting) and to provision its own SaaS.

DRY: Single source of truth for all Stripe Skills interaction.
MODULAR: stdlib-only, independently testable, degrades gracefully.
ENHANCEMENT FIRST: when STRIPE_SKILLS_KEY is unset, all calls are no-ops
  with structured logs — existing behaviour is unchanged.
PERFORMANT: charge history cached via FileCache to avoid repeated API calls.
"""

from __future__ import annotations

import json
import os
import time
import urllib.error
import urllib.request
from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional


# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------

def stripe_configured() -> bool:
    """True iff Stripe Skills is configured (STRIPE_SKILLS_KEY is set)."""
    return bool(os.environ.get("STRIPE_SKILLS_KEY") or os.environ.get("STRIPE_API_KEY"))


def _api_key() -> str:
    return os.environ.get("STRIPE_SKILLS_KEY") or os.environ.get("STRIPE_API_KEY") or ""


def _api_url() -> str:
    """Return the Stripe Skills API base URL."""
    return os.environ.get("STRIPE_SKILLS_API_URL", "https://api.stripe.com/v1").rstrip("/")


def _timeout() -> int:
    return int(os.environ.get("STRIPE_SKILLS_TIMEOUT", "30"))


# ---------------------------------------------------------------------------
# Types
# ---------------------------------------------------------------------------

@dataclass(frozen=True)
class PaymentResult:
    """Result of a pay_for_service call."""
    charge_id: str = ""
    amount_usd: float = 0.0
    service: str = ""
    memo: str = ""
    error: str = ""

    @property
    def ok(self) -> bool:
        return bool(self.charge_id) and not self.error


@dataclass(frozen=True)
class ProvisionResult:
    """Result of a provision_saas call — the agent buys/provisions a service."""
    subscription_id: str = ""
    product: str = ""
    status: str = ""
    metadata: Dict[str, Any] = field(default_factory=dict)
    error: str = ""

    @property
    def ok(self) -> bool:
        return bool(self.subscription_id) and not self.error


@dataclass(frozen=True)
class Balance:
    """Current Stripe balance for the agent's operating account."""
    available_usd: float = 0.0
    pending_usd: float = 0.0
    error: str = ""

    @property
    def ok(self) -> bool:
        return not self.error


@dataclass(frozen=True)
class Charge:
    """A single Stripe charge record — used for P&L reporting."""
    charge_id: str
    amount_usd: float
    service: str
    memo: str
    created: float  # unix timestamp


class StripeSkillsError(RuntimeError):
    """Non-recoverable Stripe Skills API error (4xx except 429)."""
    def __init__(self, message: str, status_code: int = 0):
        super().__init__(message)
        self.status_code = status_code


# ---------------------------------------------------------------------------
# Low-level API helper
# ---------------------------------------------------------------------------

def _request(method: str, path: str, *, data: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
    """Make an authenticated Stripe Skills API request. Returns parsed JSON."""
    url = f"{_api_url()}/{path.lstrip('/')}"
    body = None
    headers = {
        "Authorization": f"Bearer {_api_key()}",
        "Stripe-Version": os.environ.get("STRIPE_API_VERSION", "2024-12-18"),
    }
    if data is not None:
        body = json.dumps(data).encode("utf-8")
        headers["Content-Type"] = "application/json"
    req = urllib.request.Request(url, data=body, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req, timeout=_timeout()) as resp:
            return json.loads(resp.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        if e.code == 429:
            # Rate limited — caller should retry
            raise StripeSkillsError(f"rate limited (429)", 429)
        raise StripeSkillsError(f"HTTP {e.code}: {e.read().decode('utf-8', errors='replace')[:200]}", e.code)
    except urllib.error.URLError as e:
        raise StripeSkillsError(f"network error: {e}", 0)


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def pay_for_service(
    service: str,
    amount_usd: float,
    *,
    memo: str = "",
    milestone_hash: str = "",
) -> PaymentResult:
    """
    Pay for a service the agent consumes (Kimi, fal.ai, KeeperHub, etc.).

    This is the core 'spend' primitive. When Stripe Skills is configured,
    the agent autonomously pays for the API call it's about to make.
    When unset, returns an empty result (no-op) — callers proceed normally.

    Args:
        service:     identifier for the service being paid for (e.g. "kimi", "fal")
        amount_usd:  cost in USD cents→dollars
        memo:        human-readable description
        milestone_hash: optional milestone this payment is associated with
    """
    from .recovery import EventType, Outcome, emit as recovery_emit

    if not stripe_configured():
        recovery_emit(
            EventType.STRIPE_UNAVAILABLE,
            context={"service": service, "reason": "not_configured"},
            action="skip_payment",
            outcome=Outcome.DEGRADED,
        )
        return PaymentResult(service=service, memo=memo)

    try:
        resp = _request("POST", "/charges", data={
            "amount_cents": int(round(amount_usd * 100)),
            "currency": "usd",
            "service": service,
            "memo": memo or f"Weft agent — {service}",
            "metadata": {"milestone": milestone_hash} if milestone_hash else {},
        })
        result = PaymentResult(
            charge_id=resp.get("id", ""),
            amount_usd=amount_usd,
            service=service,
            memo=memo,
        )
        recovery_emit(
            EventType.STRIPE_PAYMENT,
            context={"service": service, "amount_usd": amount_usd, "charge_id": result.charge_id},
            action="pay_for_service",
            outcome=Outcome.SUCCESS,
        )
        _invalidate_charge_cache()
        return result
    except StripeSkillsError as e:
        recovery_emit(
            EventType.STRIPE_UNAVAILABLE,
            context={"service": service, "error": str(e)},
            action="payment_failed",
            outcome=Outcome.FAILED,
        )
        return PaymentResult(service=service, memo=memo, error=str(e))


def provision_saas(
    product: str,
    *,
    params: Optional[Dict[str, Any]] = None,
) -> ProvisionResult:
    """
    Provision a SaaS product the agent needs to operate.

    This is the 'provision its own SaaS' primitive from the hackathon brief.
    The agent can spin up infrastructure (hosting, databases, monitoring)
    without human intervention.
    """
    from .recovery import EventType, Outcome, emit as recovery_emit

    if not stripe_configured():
        recovery_emit(
            EventType.STRIPE_UNAVAILABLE,
            context={"product": product, "reason": "not_configured"},
            action="skip_provision",
            outcome=Outcome.DEGRADED,
        )
        return ProvisionResult(product=product)

    try:
        resp = _request("POST", "/subscriptions", data={
            "product": product,
            "params": params or {},
        })
        result = ProvisionResult(
            subscription_id=resp.get("id", ""),
            product=product,
            status=resp.get("status", ""),
            metadata=resp.get("metadata", {}),
        )
        recovery_emit(
            EventType.STRIPE_PROVISION,
            context={"product": product, "subscription_id": result.subscription_id},
            action="provision_saas",
            outcome=Outcome.SUCCESS,
        )
        return result
    except StripeSkillsError as e:
        recovery_emit(
            EventType.STRIPE_UNAVAILABLE,
            context={"product": product, "error": str(e)},
            action="provision_failed",
            outcome=Outcome.FAILED,
        )
        return ProvisionResult(product=product, error=str(e))


def get_balance() -> Balance:
    """Fetch the agent's current Stripe balance (available + pending)."""
    if not stripe_configured():
        return Balance(error="not configured")
    try:
        resp = _request("GET", "/balance")
        available = resp.get("available", [{}])
        pending = resp.get("pending", [{}])
        return Balance(
            available_usd=float(available[0].get("amount", 0)) / 100.0,
            pending_usd=float(pending[0].get("amount", 0)) / 100.0,
        )
    except StripeSkillsError as e:
        return Balance(error=str(e))


_CHARGE_CACHE_KEY = "stripe_charges_recent"
_CHARGE_CACHE_TTL = 60  # seconds
_charge_cache: tuple[float, List[Charge]] = (0.0, [])


def list_recent_charges(limit: int = 50) -> List[Charge]:
    """
    List recent charges for P&L reporting. Cached in-memory for 60s to
    avoid repeated API calls when the treasury widget polls.
    """
    if not stripe_configured():
        return []

    now = time.time()
    cached_at, cached_charges = _charge_cache
    if cached_charges and (now - cached_at) < _CHARGE_CACHE_TTL:
        return cached_charges

    try:
        resp = _request("GET", f"/charges?limit={limit}")
        charges = [
            Charge(
                charge_id=c.get("id", ""),
                amount_usd=float(c.get("amount", 0)) / 100.0,
                service=c.get("metadata", {}).get("service", c.get("description", "")),
                memo=c.get("description", ""),
                created=float(c.get("created", 0)),
            )
            for c in resp.get("data", [])
        ]
        _set_charge_cache(charges)
        return charges
    except StripeSkillsError:
        return []


def fund_wallet_from_revenue(amount_usd: float, *, source: str = "onchain_revenue") -> PaymentResult:
    """
    Sweep earned revenue into the agent's Stripe operating balance.

    This closes the earn→spend loop: after the agent earns 3% from a
    milestone release, a slice is moved into Stripe to fund its own
    ongoing operations (API calls, hosting, etc.).
    """
    from .recovery import EventType, Outcome, emit as recovery_emit

    if not stripe_configured():
        recovery_emit(
            EventType.STRIPE_UNAVAILABLE,
            context={"reason": "not_configured", "amount_usd": amount_usd},
            action="skip_revenue_sweep",
            outcome=Outcome.DEGRADED,
        )
        return PaymentResult(service="revenue_sweep", memo=source)

    if amount_usd <= 0:
        return PaymentResult(service="revenue_sweep", memo=source)

    try:
        resp = _request("POST", "/topups", data={
            "amount_cents": int(round(amount_usd * 100)),
            "currency": "usd",
            "description": f"Weft revenue sweep — {source}",
            "metadata": {"source": source},
        })
        result = PaymentResult(
            charge_id=resp.get("id", ""),
            amount_usd=amount_usd,
            service="revenue_sweep",
            memo=source,
        )
        recovery_emit(
            EventType.STRIPE_REVENUE_SWEEP,
            context={"amount_usd": amount_usd, "source": source, "topup_id": result.charge_id},
            action="fund_wallet_from_revenue",
            outcome=Outcome.SUCCESS,
        )
        _invalidate_charge_cache()
        return result
    except StripeSkillsError as e:
        recovery_emit(
            EventType.STRIPE_UNAVAILABLE,
            context={"error": str(e), "amount_usd": amount_usd},
            action="revenue_sweep_failed",
            outcome=Outcome.FAILED,
        )
        return PaymentResult(service="revenue_sweep", memo=source, error=str(e))


# ---------------------------------------------------------------------------
# P&L summary (used by weft-treasury skill + frontend widget)
# ---------------------------------------------------------------------------

@dataclass(frozen=True)
class ProfitLoss:
    """P&L summary for the agent's autonomous operations."""
    total_earned_usd: float = 0.0
    total_spent_usd: float = 0.0
    net_usd: float = 0.0
    spend_by_service: Dict[str, float] = field(default_factory=dict)
    charge_count: int = 0
    balance: Optional[Balance] = None

    @property
    def profitable(self) -> bool:
        return self.net_usd >= 0


def get_profit_loss() -> ProfitLoss:
    """
    Compute a P&L summary: total spent on services (from Stripe charges)
    vs. total swept from onchain revenue.

    This is the 'show me the agent's books' primitive — the proof surface
    that Weft is an agent-run company that earns and spends autonomously.
    """
    charges = list_recent_charges()
    spend_by: Dict[str, float] = {}
    total_spent = 0.0
    total_swept = 0.0

    for c in charges:
        if c.service == "revenue_sweep":
            total_swept += c.amount_usd
        else:
            spend_by[c.service] = spend_by.get(c.service, 0.0) + c.amount_usd
            total_spent += c.amount_usd

    balance = get_balance()
    return ProfitLoss(
        total_earned_usd=total_swept,
        total_spent_usd=total_spent,
        net_usd=total_swept - total_spent,
        spend_by_service=spend_by,
        charge_count=len(charges),
        balance=balance,
    )


# ---------------------------------------------------------------------------
# Cache invalidation
# ---------------------------------------------------------------------------

def _invalidate_charge_cache() -> None:
    """Clear cached charge list when a new charge is created."""
    global _charge_cache
    _charge_cache = (0.0, [])


def _set_charge_cache(charges: List[Charge]) -> None:
    global _charge_cache
    _charge_cache = (time.time(), charges)
