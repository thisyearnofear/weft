# SPDX-License-Identifier: MIT
"""Pluggable evidence collectors for Weft verification templates."""

# Import built-in collectors so they self-register with the global template registry.
from .marketing_collector import (  # noqa: F401
    MarketingCampaignEvidence,
    MarketingCampaignTemplate,
)

__all__ = ["MarketingCampaignEvidence", "MarketingCampaignTemplate"]
