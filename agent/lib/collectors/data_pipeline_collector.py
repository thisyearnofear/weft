#!/usr/bin/env python3
# SPDX-License-Identifier: MIT

"""
Data-pipeline verification template for Weft.

Deterministic rules for verifying a data pipeline produced a fresh, valid
output artifact (e.g., S3/GCS object, Parquet file, CSV dump, BigQuery export):
  - Deliverable exists (content-addressed hash or object URI)
  - Row / record count >= required threshold
  - Last update / freshness timestamp is within the allowed window
  - Optional schema / column-set checksum matches expectation
"""

from __future__ import annotations

import time
from dataclasses import asdict, dataclass
from typing import Any, Dict

from ..verification_templates import VerificationTemplate, Verdict, register


@dataclass(frozen=True)
class DataPipelineEvidence:
    """Evidence collected for a data-pipeline milestone."""

    file_hash: str = ""  # content-addressed hash of the output artifact
    row_count: int = 0
    freshness_timestamp: int = 0  # unix seconds of last successful pipeline run
    schema_hash: str = ""  # optional hash of expected column/schema fingerprint

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


class DataPipelineTemplate(VerificationTemplate):
    """Verification template for generic data-pipeline deliverables."""

    @property
    def template_id(self) -> str:
        return "data.pipeline.v1"

    def collect_evidence(self, inputs: Dict[str, Any]) -> DataPipelineEvidence:
        return DataPipelineEvidence(
            file_hash=inputs.get("file_hash", inputs.get("fileHash", "")),
            row_count=int(inputs.get("row_count", inputs.get("rowCount", 0))),
            freshness_timestamp=int(inputs.get("freshness_timestamp", inputs.get("freshnessTimestamp", 0))),
            schema_hash=inputs.get("schema_hash", inputs.get("schemaHash", "")),
        )

    def evaluate(self, evidence: DataPipelineEvidence, inputs: Dict[str, Any]) -> Verdict:
        required_row_count = int(inputs.get("required_row_count", 0))
        required_freshness_seconds = int(inputs.get("required_freshness_seconds", 0))
        require_file_hash = bool(inputs.get("require_file_hash", True))
        require_schema = bool(inputs.get("require_schema", False))
        expected_schema_hash = inputs.get("expected_schema_hash", "")

        # Determine reference time. The caller may pass an explicit "now" (useful
        # for testing); otherwise use the current wall-clock time.
        now = int(inputs.get("now") or time.time())

        zero_hash = "0x" + "00" * 32
        has_file = bool(evidence.file_hash) and evidence.file_hash.lower() != zero_hash
        meets_row_count = evidence.row_count >= required_row_count
        age_seconds = now - evidence.freshness_timestamp if evidence.freshness_timestamp > 0 else float("inf")
        freshness_ok = 0 <= age_seconds <= required_freshness_seconds

        verified = (has_file or not require_file_hash) and meets_row_count and freshness_ok

        reasons = []
        if not has_file and require_file_hash:
            reasons.append("missing output file hash")
        if not meets_row_count:
            reasons.append(f"row count {evidence.row_count} < {required_row_count}")
        if not freshness_ok:
            reasons.append(f"freshness age {int(age_seconds)}s > {required_freshness_seconds}s")

        if require_schema:
            if not expected_schema_hash:
                reasons.append("expected_schema_hash required when require_schema is true")
                verified = False
            else:
                schema_ok = bool(evidence.schema_hash) and evidence.schema_hash == expected_schema_hash
                if not schema_ok:
                    reasons.append(f"schema mismatch (expected {expected_schema_hash}, got {evidence.schema_hash})")
                verified = verified and schema_ok

        reason = "pipeline output meets criteria" if verified else "; ".join(reasons)

        return Verdict(
            verified=verified,
            reason=reason,
            evidence_data=evidence.to_dict(),
            template_id=self.template_id,
            confidence=100 if verified else max(0, 100 - len(reasons) * 25),
        )


# Register on import so the data-pipeline template is available via the global registry.
register(DataPipelineTemplate())
