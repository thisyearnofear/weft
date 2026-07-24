"""Optional OpenTelemetry export for Weft verifier operations.

The verifier must remain usable without an observability backend.  This module
therefore initializes lazily and turns every helper into a no-op when
``WEFT_OBSERVABILITY`` is not set to ``signoz`` (or when optional OTel packages
are unavailable).
"""

from __future__ import annotations

import os
from contextlib import contextmanager, nullcontext
from typing import Any, Iterator


_initialized = False
_available = False
_tracer: Any = None
_meter: Any = None
_logger: Any = None
_counters: dict[str, Any] = {}
_histograms: dict[str, Any] = {}


def _enabled() -> bool:
    return os.environ.get("WEFT_OBSERVABILITY", "").strip().lower() in {"1", "otel", "signoz"}


def _attributes(values: dict[str, Any]) -> dict[str, Any]:
    """Return OpenTelemetry-compatible attributes and omit absent values."""
    result: dict[str, Any] = {}
    for key, value in values.items():
        if value is None:
            continue
        if isinstance(value, (str, bool, int, float)):
            result[key] = value
        else:
            result[key] = str(value)
    return result


def _resource_attributes() -> dict[str, str]:
    """Parse standard OTEL_RESOURCE_ATTRIBUTES entries."""
    values: dict[str, str] = {}
    for item in os.environ.get("OTEL_RESOURCE_ATTRIBUTES", "").split(","):
        if not item.strip() or "=" not in item:
            continue
        key, value = item.split("=", 1)
        key = key.strip()
        value = value.strip()
        if key:
            values[key] = value
    values["service.name"] = os.environ.get("OTEL_SERVICE_NAME") or values.get("service.name") or "weft-daemon"
    return values


def _export_timeout_seconds() -> float:
    try:
        return float(os.environ.get("WEFT_OTEL_EXPORT_TIMEOUT", "3"))
    except ValueError:
        return 3.0


def _initialize() -> bool:
    """Configure OTLP exporters once, without making them a runtime dependency."""
    global _available, _initialized, _logger, _meter, _tracer
    if _initialized:
        return _available
    _initialized = True
    if not _enabled():
        return False

    try:
        from opentelemetry import _logs, metrics, trace
        from opentelemetry.exporter.otlp.proto.http._log_exporter import OTLPLogExporter
        from opentelemetry.exporter.otlp.proto.http.metric_exporter import OTLPMetricExporter
        from opentelemetry.exporter.otlp.proto.http.trace_exporter import OTLPSpanExporter
        from opentelemetry.sdk._logs import LoggerProvider
        from opentelemetry.sdk._logs.export import BatchLogRecordProcessor
        from opentelemetry.sdk.metrics import MeterProvider
        from opentelemetry.sdk.metrics.export import PeriodicExportingMetricReader
        from opentelemetry.sdk.resources import Resource
        from opentelemetry.sdk.trace import TracerProvider
        from opentelemetry.sdk.trace.export import BatchSpanProcessor
    except ImportError:
        return False

    try:
        resource = Resource.create(_resource_attributes())
        timeout = _export_timeout_seconds()

        tracer_provider = TracerProvider(resource=resource)
        tracer_provider.add_span_processor(BatchSpanProcessor(OTLPSpanExporter(timeout=timeout)))
        trace.set_tracer_provider(tracer_provider)

        metric_reader = PeriodicExportingMetricReader(OTLPMetricExporter(timeout=timeout))
        metrics.set_meter_provider(MeterProvider(resource=resource, metric_readers=[metric_reader]))

        logger_provider = LoggerProvider(resource=resource)
        logger_provider.add_log_record_processor(BatchLogRecordProcessor(OTLPLogExporter(timeout=timeout)))
        _logs.set_logger_provider(logger_provider)

        _tracer = trace.get_tracer("weft.observability")
        _meter = metrics.get_meter("weft.observability")
        _logger = _logs.get_logger("weft.observability")
        _available = True
    except Exception:
        # Observability is strictly best-effort: never interrupt a verdict.
        _available = False
    return _available


@contextmanager
def span(name: str, **attrs: Any) -> Iterator[Any]:
    """Create a span when SigNoz is configured; otherwise yield a no-op span."""
    if not _initialize():
        with nullcontext(None) as current:
            yield current
        return
    with _tracer.start_as_current_span(name, attributes=_attributes(attrs)) as current:
        yield current


def set_span_attrs(**attrs: Any) -> None:
    if not _initialize():
        return
    try:
        from opentelemetry import trace

        trace.get_current_span().set_attributes(_attributes(attrs))
    except Exception:
        pass


def record_counter(name: str, value: int = 1, **attrs: Any) -> None:
    if not _initialize():
        return
    try:
        counter = _counters.setdefault(name, _meter.create_counter(name))
        counter.add(value, _attributes(attrs))
    except Exception:
        pass


def record_histogram(name: str, value: float, **attrs: Any) -> None:
    if not _initialize():
        return
    try:
        histogram = _histograms.setdefault(name, _meter.create_histogram(name, unit="ms"))
        histogram.record(value, _attributes(attrs))
    except Exception:
        pass


def emit_log_event(name: str, **attrs: Any) -> None:
    """Export a structured OTel log event, correlated with the active span."""
    if not _initialize():
        return
    try:
        from opentelemetry._logs import LogRecord, SeverityNumber

        _logger.emit(LogRecord(body=name, severity_number=SeverityNumber.INFO, attributes=_attributes(attrs)))
    except Exception:
        pass


def force_flush(timeout_millis: int = 5000) -> None:
    """Flush OTel providers for short-lived demo commands."""
    if not _initialize():
        return
    try:
        from opentelemetry import _logs, metrics, trace

        for provider in (
            trace.get_tracer_provider(),
            metrics.get_meter_provider(),
            _logs.get_logger_provider(),
        ):
            flush = getattr(provider, "force_flush", None)
            if flush is not None:
                flush(timeout_millis=timeout_millis)
    except Exception:
        pass
