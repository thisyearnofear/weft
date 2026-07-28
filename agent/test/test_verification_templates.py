"""Tests for the generic verification template registry and built-in templates."""

import unittest

# Import collectors to ensure templates self-register before tests run.
import agent.lib.collectors  # noqa: F401
from agent.lib.verification_templates import (
    TemplateRegistry,
    VerificationTemplate,
    Verdict,
    EvmDeploymentUsageTemplate,
    InstitutionalChecklistTemplate,
    build_attestation_envelope,
    infer_template_id,
    list_templates,
    verify,
)
from agent.lib.collectors.research_collector import ResearchReportTemplate


class TestTemplateRegistry(unittest.TestCase):
    def test_built_in_templates_are_registered(self):
        templates = list_templates()
        self.assertIn("evm.deployment_usage.v1", templates)
        self.assertIn("canton.institutional_checklist.v1", templates)
        self.assertIn("marketing.campaign.v1", templates)
        self.assertIn("research.report.v1", templates)

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


class TestResearchReportTemplate(unittest.TestCase):
    def setUp(self):
        self.template = ResearchReportTemplate()

    def test_report_meets_all_criteria(self):
        inputs = {
            "deliverable_hash": "0x" + "aa" * 32,
            "word_count": 2500,
            "citation_count": 20,
            "source_count": 10,
            "plagiarism_score": 5,
            "required_words": 1500,
            "required_citations": 10,
            "required_sources": 5,
            "max_plagiarism": 10,
        }
        verdict = self.template.evaluate(self.template.collect_evidence(inputs), inputs)
        self.assertTrue(verdict.verified)
        self.assertEqual(verdict.template_id, "research.report.v1")
        self.assertIn("criteria met", verdict.reason)

    def test_report_fails_word_count(self):
        inputs = {
            "deliverable_hash": "0x" + "aa" * 32,
            "word_count": 500,
            "citation_count": 20,
            "source_count": 10,
            "plagiarism_score": 5,
            "required_words": 1500,
            "required_citations": 10,
            "required_sources": 5,
            "max_plagiarism": 10,
        }
        verdict = self.template.evaluate(self.template.collect_evidence(inputs), inputs)
        self.assertFalse(verdict.verified)
        self.assertIn("word count", verdict.reason)


class TestHelpers(unittest.TestCase):
    def test_infer_template_id_decodes_ascii(self):
        encoded = "research.report.v1".encode("ascii").ljust(32, b"\x00")
        hex_id = "0x" + encoded.hex()
        self.assertEqual(infer_template_id(hex_id), "research.report.v1")

    def test_infer_template_id_returns_unknown_hex(self):
        unknown = "0x" + "00" * 32
        self.assertEqual(infer_template_id(unknown), unknown)

    def test_build_attestation_envelope_shape(self):
        verdict = Verdict(
            verified=True,
            reason="test",
            evidence_data={"foo": "bar"},
            template_id="research.report.v1",
        )
        envelope = build_attestation_envelope(
            project_id="project1",
            milestone_hash="0xabc",
            template_id="research.report.v1",
            inputs={"a": 1},
            verdict=verdict,
            node_address="0xnode",
            attested_at=123,
        )
        self.assertEqual(envelope["schemaVersion"], 1)
        self.assertEqual(envelope["weft"]["projectId"], "project1")
        self.assertEqual(envelope["verdict"]["verified"], True)
        self.assertEqual(envelope["evidence"]["foo"], "bar")
        self.assertEqual(envelope["verdict"]["confidence"], 100)
        self.assertEqual(envelope["verdict"]["templateId"], "research.report.v1")


if __name__ == "__main__":
    unittest.main()
