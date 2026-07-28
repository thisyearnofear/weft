"""Tests for the generic verification template registry and built-in templates."""

import unittest

# Import collectors to ensure marketing templates self-register before tests run.
import agent.lib.collectors  # noqa: F401
from agent.lib.verification_templates import (
    EvmDeploymentUsageTemplate,
    InstitutionalChecklistTemplate,
    TemplateRegistry,
    Verdict,
    VerificationTemplate,
    list_templates,
    verify,
)


class TestTemplateRegistry(unittest.TestCase):
    def test_built_in_templates_are_registered(self):
        templates = list_templates()
        self.assertIn("evm.deployment_usage.v1", templates)
        self.assertIn("canton.institutional_checklist.v1", templates)
        self.assertIn("marketing.campaign.v1", templates)

    def test_verify_unknown_template_raises(self):
        with self.assertRaises(KeyError):
            verify("does.not.exist", {})

    def test_registry_can_be_instantiated_independently(self):
        registry = TemplateRegistry()
        self.assertEqual(registry.template_ids(), [])
        registry.register(EvmDeploymentUsageTemplate())
        self.assertEqual(registry.template_ids(), ["evm.deployment_usage.v1"])


class TestEvmDeploymentUsageTemplate(unittest.TestCase):
    def setUp(self):
        self.template = EvmDeploymentUsageTemplate()

    def _evidence(self, code_hash: str, unique_callers: int):
        return {
            "deployment": {"contractAddress": "0xabc", "codeHash": code_hash, "blockNumber": 123},
            "usage": {"windowStart": 1, "windowEnd": 2, "uniqueCallerCount": unique_callers},
        }

    def test_threshold_met(self):
        evidence = self._evidence("0x" + "aa" * 32, 10)
        verdict = self.template.evaluate(evidence, {"unique_caller_threshold": 5})
        self.assertTrue(verdict.verified)
        self.assertIn("10 unique callers", verdict.reason)

    def test_threshold_not_met(self):
        evidence = self._evidence("0x" + "aa" * 32, 2)
        verdict = self.template.evaluate(evidence, {"unique_caller_threshold": 5})
        self.assertFalse(verdict.verified)
        self.assertIn("below threshold", verdict.reason)

    def test_contract_not_deployed(self):
        evidence = self._evidence("0x" + "00" * 32, 100)
        verdict = self.template.evaluate(evidence, {"unique_caller_threshold": 5})
        self.assertFalse(verdict.verified)
        self.assertIn("not deployed", verdict.reason)


class TestInstitutionalChecklistTemplate(unittest.TestCase):
    def setUp(self):
        self.template = InstitutionalChecklistTemplate()

    def test_checklist_passes(self):
        inputs = {
            "document_hash": "0x" + "aa" * 32,
            "delivery_confirmed": True,
            "invoice_settled": True,
            "checklist_items_passed": 5,
            "checklist_items_required": 4,
        }
        verdict = self.template.evaluate(self.template.collect_evidence(inputs), inputs)
        self.assertTrue(verdict.verified)
        self.assertIn("checklist passed", verdict.reason)

    def test_checklist_fails_missing_document(self):
        inputs = {
            "document_hash": "0x" + "00" * 32,
            "delivery_confirmed": True,
            "invoice_settled": True,
            "checklist_items_passed": 5,
            "checklist_items_required": 4,
        }
        verdict = self.template.evaluate(self.template.collect_evidence(inputs), inputs)
        self.assertFalse(verdict.verified)


class TestMarketingCampaignTemplate(unittest.TestCase):
    def setUp(self):
        from agent.lib.collectors.marketing_collector import MarketingCampaignTemplate

        self.template = MarketingCampaignTemplate()

    def test_marketing_kpis_met(self):
        evidence = self.template.collect_evidence(
            {
                "deliverable_hash": "0x" + "aa" * 32,
                "twitter_impressions": 5000,
                "ga_pageviews": 1500,
                "ga_clicks": 120,
            }
        )
        verdict = self.template.evaluate(
            evidence,
            {"required_impressions": 1000, "required_pageviews": 1000, "required_clicks": 100},
        )
        self.assertTrue(verdict.verified)
        self.assertEqual(verdict.template_id, "marketing.campaign.v1")

    def test_marketing_impressions_too_low(self):
        evidence = self.template.collect_evidence(
            {
                "deliverable_hash": "0x" + "aa" * 32,
                "twitter_impressions": 100,
                "ga_pageviews": 1500,
                "ga_clicks": 120,
            }
        )
        verdict = self.template.evaluate(
            evidence,
            {"required_impressions": 1000, "required_pageviews": 1000, "required_clicks": 100},
        )
        self.assertFalse(verdict.verified)
        self.assertIn("impressions", verdict.reason)


if __name__ == "__main__":
    unittest.main()
