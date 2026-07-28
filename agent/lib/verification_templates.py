#!/usr/bin/env python3
# SPDX-License-Identifier: MIT

"""
Generic verification template interface and registry.

Weft started with two hardcoded templates:
  - EVM deployment + usage (agent/lib/mvp_verifier)
  - Canton institutional checklist (agent/lib/domain/templates)

This module turns those into pluggable ``VerificationTemplate`` implementations
and provides a ``TemplateRegistry`` so new templates (marketing, research,
data scraping, content creation, etc.) can be added without touching the core
verification loop.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Dict, Optional, Protocol, runtime_checkable

from .domain.templates import (
    InstitutionalChecklistEvidence,
    evaluate_institutional_checklist,
)


@dataclass(frozen=True)
class Verdict:
    """Deterministic outcome of a verification template."""

    verified: bool
    reason: str
    evidence_data: Dict[str, Any] = field(default_factory=dict)
    template_id: str = ""
    confidence: int = 100

    def to_dict(self) -> Dict[str, Any]:
        return {
            "verified": self.verified,
            "reason": self.reason,
            "evidence": self.evidence_data,
            "templateId": self.template_id,
            "confidence": self.confidence,
        }


@runtime_checkable
class VerificationTemplate(Protocol):
    """A pluggable template that collects evidence and returns a verdict."""

    @property
    def template_id(self) -> str:
        ...

    def collect_evidence(self, inputs: Dict[str, Any]) -> Any:
        """Fetch or shape evidence from external sources based on ``inputs``."""
        ...

    def evaluate(self, evidence: Any, inputs: Dict[str, Any]) -> Verdict:
        """Apply deterministic rules to ``evidence`` and return a verdict."""
        ...


class TemplateRegistry:
    """Central registry for verification templates."""

    def __init__(self) -> None:
        self._templates: Dict[str, VerificationTemplate] = {}

    def register(self, template: VerificationTemplate) -> None:
        self._templates[template.template_id] = template

    def get(self, template_id: str) -> VerificationTemplate:
        if template_id not in self._templates:
            raise KeyError(f"Verification template '{template_id}' not found")
        return self._templates[template_id]

    def template_ids(self) -> list[str]:
        return list(self._templates.keys())

    def verify(self, template_id: str, inputs: Dict[str, Any]) -> Verdict:
        template = self.get(template_id)
        evidence = template.collect_evidence(inputs)
        return template.evaluate(evidence, inputs)


# ---------------------------------------------------------------------------
# Built-in templates (backward-compatible)
# ---------------------------------------------------------------------------

class EvmDeploymentUsageTemplate:
    """Template: contract deployed + unique callers >= threshold."""

    @property
    def template_id(self) -> str:
        return "evm.deployment_usage.v1"

    def collect_evidence(self, inputs: Dict[str, Any]) -> Dict[str, Any]:
        """
        Accept already-collected evidence in ``inputs`` or return a skeleton.

        Expected keys in ``inputs`` when pre-collected evidence is supplied:
          - deployment: dict with codeHash, contractAddress, blockNumber
          - usage: dict with windowStart, windowEnd, uniqueCallerCount
        """
        return {
            "deployment": inputs.get("deployment", {}),
            "usage": inputs.get("usage", {}),
        }

    def evaluate(self, evidence: Dict[str, Any], inputs: Dict[str, Any]) -> Verdict:
        deployment = evidence.get("deployment") or {}
        usage = evidence.get("usage") or {}
        code_hash = (deployment.get("codeHash") or deployment.get("code_hash") or "").lower()
        unique_callers = int(usage.get("uniqueCallerCount") or usage.get("unique_callers") or 0)
        threshold = int(inputs.get("unique_caller_threshold", inputs.get("uniqueCallerThreshold", 0)))

        zero_hash = "0x" + "00" * 32
        deployed = bool(code_hash) and code_hash != zero_hash
        threshold_met = unique_callers >= threshold
        verified = deployed and threshold_met

        if verified:
            reason = f"contract deployed and {unique_callers} unique callers >= threshold {threshold}"
        elif not deployed:
            reason = "contract not deployed or empty code hash"
        else:
            reason = f"unique callers {unique_callers} below threshold {threshold}"

        return Verdict(
            verified=verified,
            reason=reason,
            evidence_data={"deployment": deployment, "usage": usage},
            template_id=self.template_id,
        )


class InstitutionalChecklistTemplate:
    """Template: off-ledger institutional checklist."""

    @property
    def template_id(self) -> str:
        return "canton.institutional_checklist.v1"

    def collect_evidence(self, inputs: Dict[str, Any]) -> InstitutionalChecklistEvidence:
        return InstitutionalChecklistEvidence(
            document_hash=inputs.get("document_hash", ""),
            delivery_confirmed=bool(inputs.get("delivery_confirmed", False)),
            invoice_settled=bool(inputs.get("invoice_settled", False)),
            checklist_items_passed=int(inputs.get("checklist_items_passed", 0)),
            checklist_items_required=int(inputs.get("checklist_items_required", 0)),
            notes=inputs.get("notes", ""),
        )

    def evaluate(self, evidence: InstitutionalChecklistEvidence, inputs: Dict[str, Any]) -> Verdict:
        result = evaluate_institutional_checklist(evidence)
        return Verdict(
            verified=result["verdict"]["verified"],
            reason=result["verdict"]["reason"],
            evidence_data=result["evidence"],
            template_id=self.template_id,
        )


# ---------------------------------------------------------------------------
# Default global registry
# ---------------------------------------------------------------------------

_registry = TemplateRegistry()
register = _registry.register
get_template = _registry.get
list_templates = _registry.template_ids
verify = _registry.verify


def infer_template_id(template_id_hex: str) -> str:
    """
    Decode an on-chain bytes32 template ID into a human-readable string.

    Weft stores template IDs as bytes32. When the bytes encode an ASCII string
    padded with nulls, this returns the original string. Otherwise it returns
    the hex unchanged so callers can fall back to the EVM default or a CLI
    override.
    """
    try:
        raw = bytes.fromhex(template_id_hex.replace("0x", ""))
        decoded = raw.rstrip(b"\x00").decode("ascii")
        if decoded and decoded in _registry.template_ids():
            return decoded
    except Exception:
        pass
    return template_id_hex


def build_attestation_envelope(
    *,
    project_id: str,
    milestone_hash: str,
    template_id: str,
    inputs: Dict[str, Any],
    verdict: Verdict,
    node_address: str,
    attested_at: int,
    schema_version: int = 1,
) -> Dict[str, Any]:
    """
    Build the standard Weft attestation dict from a generic Verdict.

    Mirrors the shape produced by mvp_verifier.build_attestation and
    domain/templates.build_institutional_attestation.
    """
    return {
        "schemaVersion": schema_version,
        "weft": {
            "projectId": project_id,
            "milestoneHash": milestone_hash,
            "templateId": template_id,
        },
        "inputs": inputs,
        "evidence": verdict.evidence_data,
        "verdict": {
            "verified": verdict.verified,
            "reason": verdict.reason,
            "confidence": verdict.confidence,
            "templateId": verdict.template_id or template_id,
        },
        "narrative": {"summary": ""},
        "verifier": {
            "nodeAddress": node_address,
            "signature": "",
        },
        "timestamps": {"attestedAt": attested_at},
    }


def _register_builtins() -> None:
    register(EvmDeploymentUsageTemplate())
    register(InstitutionalChecklistTemplate())


_register_builtins()
