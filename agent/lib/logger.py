"""
Structured logging for Weft agent scripts.

Usage:
    from agent.lib.logger import get_logger
    log = get_logger("daemon")
    log.info("milestone processed", milestone_hash="0x...", verified=True)

Env vars:
    WEFT_LOG_LEVEL   — DEBUG|INFO|WARNING|ERROR (default: INFO)
    WEFT_LOG_FORMAT  — "json" or "text" (default: json in production, text for local dev)
"""

import json
import logging
import os
import sys
import time


class JsonFormatter(logging.Formatter):
    """Emits one JSON object per line (NDJSON) — easy to parse with jq, ingest into any log system."""

    def format(self, record: logging.LogRecord) -> str:
        entry = {
            "ts": time.strftime("%Y-%m-%dT%H:%M:%S", time.gmtime(record.created)),
            "level": record.levelname.lower(),
            "logger": record.name,
            "msg": record.getMessage(),
        }
        # Merge any extra fields passed via `extra={}`
        if hasattr(record, "extra_fields"):
            entry.update(record.extra_fields)
        if record.exc_info and record.exc_info[0] is not None:
            entry["exception"] = self.formatException(record.exc_info)
        return json.dumps(entry, ensure_ascii=False, separators=(",", ":"))


class TextFormatter(logging.Formatter):
    """Human-readable format for local development."""

    def format(self, record: logging.LogRecord) -> str:
        ts = time.strftime("%H:%M:%S", time.gmtime(record.created))
        msg = f"{ts} [{record.levelname.lower()}] {record.name}: {record.getMessage()}"
        if hasattr(record, "extra_fields"):
            for k, v in record.extra_fields.items():
                msg += f"  {k}={v}"
        if record.exc_info and record.exc_info[0] is not None:
            msg += "\n" + self.formatException(record.exc_info)
        return msg


class StructuredLogger(logging.LoggerAdapter):
    """Logger adapter that accepts keyword arguments as structured fields."""

    def __init__(self, logger: logging.Logger):
        super().__init__(logger, extra={})

    def _log_with_fields(self, level: int, msg: str, args, kwargs):
        extra_fields = {}
        remaining = {}
        for k, v in kwargs.items():
            if k in ("exc_info", "stack_info", "stacklevel"):
                remaining[k] = v
            else:
                extra_fields[k] = v

        if self.isEnabledFor(level):
            record = self.logger.makeRecord(
                self.logger.name,
                level,
                "(structured)",
                0,
                msg,
                args,
                None,
                **remaining,
            )
            record.extra_fields = extra_fields
            self.logger.handle(record)

    def debug(self, msg, *args, **kwargs):
        self._log_with_fields(logging.DEBUG, msg, args, kwargs)

    def info(self, msg, *args, **kwargs):
        self._log_with_fields(logging.INFO, msg, args, kwargs)

    def warning(self, msg, *args, **kwargs):
        self._log_with_fields(logging.WARNING, msg, args, kwargs)

    def error(self, msg, *args, **kwargs):
        self._log_with_fields(logging.ERROR, msg, args, kwargs)

    def critical(self, msg, *args, **kwargs):
        self._log_with_fields(logging.CRITICAL, msg, args, kwargs)


_configured = False


def get_logger(name: str) -> StructuredLogger:
    """Get a structured logger for the given module name.

    Call once per module: `log = get_logger("daemon")`
    """
    global _configured
    if not _configured:
        _configure_root()
        _configured = True

    logger = logging.getLogger(f"weft.{name}")
    return StructuredLogger(logger)


def _configure_root():
    level_name = os.environ.get("WEFT_LOG_LEVEL", "INFO").upper()
    level = getattr(logging, level_name, logging.INFO)

    fmt = os.environ.get("WEFT_LOG_FORMAT", "").lower()
    if not fmt:
        # Auto-detect: json in production (when stdout is not a tty)
        fmt = "json" if not sys.stdout.isatty() else "text"

    handler = logging.StreamHandler(sys.stderr)
    handler.setFormatter(JsonFormatter() if fmt == "json" else TextFormatter())

    root = logging.getLogger("weft")
    root.setLevel(level)
    root.addHandler(handler)
