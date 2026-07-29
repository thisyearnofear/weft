# SPDX-License-Identifier: MIT
"""Tests for metadata_reader.py."""

import os
import sys
import unittest

REPO_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
if REPO_ROOT not in sys.path:
    sys.path.insert(0, REPO_ROOT)

from agent.lib.metadata_reader import MetadataError, _validate_metadata_dict


class TestValidateMetadataDict(unittest.TestCase):
    def test_legacy_evm_metadata(self):
        raw = {
            "templateId": "DEPLOYED_AND_100_UNIQUE_CALLERS_7D",
            "chainId": 16600,
            "contractAddress": "0x" + "ab" * 20,
            "deadline": 1712345678,
            "measurementWindowSeconds": 604800,
            "uniqueCallerThreshold": 100,
            "notes": "legacy evm",
        }
        meta, err = _validate_metadata_dict(raw)
        self.assertEqual(err, "")
        self.assertEqual(meta.templateId, "evm.deployment_usage.v1")
        self.assertEqual(meta.contractAddress, raw["contractAddress"])
        self.assertEqual(meta.measurementWindowSeconds, 604800)
        self.assertEqual(meta.uniqueCallerThreshold, 100)

    def test_generic_research_metadata(self):
        raw = {
            "templateId": "research.report.v1",
            "chainId": 16600,
            "deadline": 1712345678,
            "templateInputs": {
                "deliverable_hash": "0x" + "aa" * 32,
                "word_count": 2500,
                "required_words": 1500,
            },
            "notes": "research report",
        }
        meta, err = _validate_metadata_dict(raw)
        self.assertEqual(err, "")
        self.assertEqual(meta.templateId, "research.report.v1")
        self.assertEqual(meta.templateInputs["word_count"], 2500)
        self.assertEqual(meta.contractAddress, "")
        self.assertEqual(meta.measurementWindowSeconds, 0)

    def test_missing_template_id(self):
        raw = {
            "chainId": 16600,
            "deadline": 1712345678,
        }
        _, err = _validate_metadata_dict(raw)
        self.assertIn("templateId", err)

    def test_generic_metadata_requires_template_inputs(self):
        raw = {
            "templateId": "research.report.v1",
            "chainId": 16600,
            "deadline": 1712345678,
        }
        _, err = _validate_metadata_dict(raw)
        self.assertIn("templateInputs", err)

    def test_missing_chain_id(self):
        raw = {
            "templateId": "evm.deployment_usage.v1",
            "deadline": 1712345678,
        }
        _, err = _validate_metadata_dict(raw)
        self.assertIn("chainId", err)


if __name__ == "__main__":
    unittest.main()
