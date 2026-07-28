#!/usr/bin/env python3
# SPDX-License-Identifier: MIT

"""
Research / report verification template for Weft.

Deterministic rules for verifying a research agent delivered a report:
  - Deliverable exists (e.g., PDF/Notion/IPFS hash)
  - Word count >= required threshold
  - Citation count >= required threshold
  - Source count >= required threshold
  - Plagiarism score <= max allowed
"""

from __future__ import annotations

from dataclasses import asdict, dataclass
from typing import Any, Dict

from ..verification_templates import VerificationTemplate, Verdict, register


@dataclass(frozen=True)
class ResearchReportEvidence:
    """Evidence collected for a research/report milestone."""

    deliverable_hash: str = ""
    word_count: int = 0
    citation_count: int = 0
    source_count: int = 0
    plagiarism_score: int = 0  # 0-100; 0 = clean

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


class ResearchReportTemplate(VerificationTemplate):
    """Verification template for research and report deliverables."""

    @property
    def template_id(self) -> str:
        return "research.report.v1"

    def collect_evidence(self, inputs: Dict[str, Any]) -> ResearchReportEvidence:
        return ResearchReportEvidence(
            deliverable_hash=inputs.get("deliverable_hash", inputs.get("deliverableHash", "")),
            word_count=int(inputs.get("word_count", inputs.get("wordCount", 0))),
            citation_count=int(inputs.get("citation_count", inputs.get("citationCount", 0))),
            source_count=int(inputs.get("source_count", inputs.get("sourceCount", 0))),
            plagiarism_score=int(inputs.get("plagiarism_score", inputs.get("plagiarismScore", 0))),
        )

    def evaluate(self, evidence: ResearchReportEvidence, inputs: Dict[str, Any]) -> Verdict:
        required_words = int(inputs.get("required_words", 0))
        required_citations = int(inputs.get("required_citations", 0))
        required_sources = int(inputs.get("required_sources", 0))
        max_plagiarism = int(inputs.get("max_plagiarism", 100))
        require_deliverable = bool(inputs.get("require_deliverable", True))

        zero_hash = "0x" + "00" * 32
        has_deliverable = bool(evidence.deliverable_hash) and evidence.deliverable_hash.lower() != zero_hash
        meets_word_count = evidence.word_count >= required_words
        meets_citations = evidence.citation_count >= required_citations
        meets_sources = evidence.source_count >= required_sources
        plagiarism_ok = evidence.plagiarism_score <= max_plagiarism

        verified = (
            (has_deliverable or not require_deliverable)
            and meets_word_count
            and meets_citations
            and meets_sources
            and plagiarism_ok
        )

        reasons = []
        if not has_deliverable and require_deliverable:
            reasons.append("missing deliverable hash")
        if not meets_word_count:
            reasons.append(f"word count {evidence.word_count} < {required_words}")
        if not meets_citations:
            reasons.append(f"citations {evidence.citation_count} < {required_citations}")
        if not meets_sources:
            reasons.append(f"sources {evidence.source_count} < {required_sources}")
        if not plagiarism_ok:
            reasons.append(f"plagiarism {evidence.plagiarism_score}% > {max_plagiarism}%")

        reason = "report criteria met" if verified else "; ".join(reasons)

        return Verdict(
            verified=verified,
            reason=reason,
            evidence_data=evidence.to_dict(),
            template_id=self.template_id,
            confidence=100 if verified else max(0, 100 - len(reasons) * 20),
        )


# Register on import so the research template is available via the global registry.
register(ResearchReportTemplate())
