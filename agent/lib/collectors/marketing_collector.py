#!/usr/bin/env python3
# SPDX-License-Identifier: MIT

"""
Marketing campaign verification template for Weft.

Deterministic rules for verifying a marketing agent delivered on a campaign:
  - Deliverable exists (e.g., Notion page hash, Figma file hash)
  - Twitter/X impressions >= threshold
  - Google Analytics pageviews >= threshold (via UTM tag)
  - Optional: click-throughs / conversions >= threshold
"""

from __future__ import annotations

from dataclasses import asdict, dataclass
from typing import Any, Dict

from ..verification_templates import VerificationTemplate, Verdict, register


@dataclass(frozen=True)
class MarketingCampaignEvidence:
    """Evidence collected for a marketing campaign milestone."""

    deliverable_hash: str = ""
    twitter_impressions: int = 0
    ga_pageviews: int = 0
    ga_clicks: int = 0
    utm_campaign: str = ""

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


class MarketingCampaignCollector:
    """
    Collector for marketing campaign signals.

    This is a prototype implementation. Real integrations would call the
    Twitter/X API, Google Analytics Data API, and Notion/Contentful export
    endpoints. For determinism and offline testing, the collector accepts
    explicit values in ``inputs`` and only falls back to defaults when a key
    is missing.
    """

    def __init__(self, inputs: Dict[str, Any]) -> None:
        self.inputs = inputs

    def collect(self) -> MarketingCampaignEvidence:
        return MarketingCampaignEvidence(
            deliverable_hash=self.inputs.get("deliverable_hash", self.inputs.get("deliverableHash", "")),
            twitter_impressions=int(self.inputs.get("twitter_impressions", self.inputs.get("twitterImpressions", 0))),
            ga_pageviews=int(self.inputs.get("ga_pageviews", self.inputs.get("gaPageviews", 0))),
            ga_clicks=int(self.inputs.get("ga_clicks", self.inputs.get("gaClicks", 0))),
            utm_campaign=self.inputs.get("utm_campaign", self.inputs.get("utmCampaign", "")),
        )


class MarketingCampaignTemplate(VerificationTemplate):
    """Verification template for generic marketing agent campaigns."""

    @property
    def template_id(self) -> str:
        return "marketing.campaign.v1"

    def collect_evidence(self, inputs: Dict[str, Any]) -> MarketingCampaignEvidence:
        return MarketingCampaignCollector(inputs).collect()

    def evaluate(self, evidence: MarketingCampaignEvidence, inputs: Dict[str, Any]) -> Verdict:
        required_impressions = int(inputs.get("required_impressions", 0))
        required_pageviews = int(inputs.get("required_pageviews", 0))
        required_clicks = int(inputs.get("required_clicks", 0))
        require_deliverable = bool(inputs.get("require_deliverable", True))

        zero_hash = "0x" + "00" * 32
        has_deliverable = bool(evidence.deliverable_hash) and evidence.deliverable_hash.lower() != zero_hash
        met_impressions = evidence.twitter_impressions >= required_impressions
        met_pageviews = evidence.ga_pageviews >= required_pageviews
        met_clicks = evidence.ga_clicks >= required_clicks

        if require_deliverable:
            verified = has_deliverable and met_impressions and met_pageviews and met_clicks
        else:
            verified = met_impressions and met_pageviews and met_clicks

        reasons = []
        if not has_deliverable and require_deliverable:
            reasons.append("missing deliverable hash")
        if not met_impressions:
            reasons.append(f"impressions {evidence.twitter_impressions} < {required_impressions}")
        if not met_pageviews:
            reasons.append(f"pageviews {evidence.ga_pageviews} < {required_pageviews}")
        if not met_clicks:
            reasons.append(f"clicks {evidence.ga_clicks} < {required_clicks}")

        reason = "KPIs met" if verified else "; ".join(reasons)

        return Verdict(
            verified=verified,
            reason=reason,
            evidence_data=evidence.to_dict(),
            template_id=self.template_id,
            confidence=100 if verified else max(0, 100 - len(reasons) * 25),
        )


# Register on import so the marketing template is available via the global registry.
register(MarketingCampaignTemplate())
