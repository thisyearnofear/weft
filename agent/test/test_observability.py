# SPDX-License-Identifier: MIT
"""The optional SigNoz bridge must not affect default verifier operation."""

from __future__ import annotations

import importlib


def test_helpers_are_noops_without_observability(monkeypatch):
    monkeypatch.delenv("WEFT_OBSERVABILITY", raising=False)

    import agent.lib.observability as observability

    observability = importlib.reload(observability)
    with observability.span("weft.test", milestone_hash="0xabc") as current:
        assert current is None
    observability.set_span_attrs(verified=True)
    observability.record_counter("weft_test_total", outcome="success")
    observability.record_histogram("weft_test_duration_ms", 10, rail="evm")
    observability.emit_log_event("weft.test.event", outcome="success")


def test_enabled_helpers_degrade_without_optional_packages(monkeypatch):
    monkeypatch.setenv("WEFT_OBSERVABILITY", "signoz")

    import agent.lib.observability as observability

    observability = importlib.reload(observability)
    with observability.span("weft.test.enabled"):
        pass
    observability.record_counter("weft_test_total", outcome="success")


def test_resource_attributes_parse_standard_env(monkeypatch):
    monkeypatch.setenv("OTEL_RESOURCE_ATTRIBUTES", "service.version=abc123,deployment.environment=demo")
    monkeypatch.setenv("OTEL_SERVICE_NAME", "weft-test")

    import agent.lib.observability as observability

    observability = importlib.reload(observability)
    assert observability._resource_attributes() == {
        "service.name": "weft-test",
        "service.version": "abc123",
        "deployment.environment": "demo",
    }


def test_export_timeout_defaults_safely(monkeypatch):
    monkeypatch.setenv("WEFT_OTEL_EXPORT_TIMEOUT", "not-a-number")

    import agent.lib.observability as observability

    observability = importlib.reload(observability)
    assert observability._export_timeout_seconds() == 3.0


def test_llm_token_estimate_is_stable():
    import agent.lib.llm_backend as llm_backend

    assert llm_backend._estimate_tokens("") == 0
    assert llm_backend._estimate_tokens("abcd") == 1
    assert llm_backend._estimate_tokens("a" * 40) == 10
