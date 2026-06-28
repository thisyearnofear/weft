# SPDX-License-Identifier: MIT
"""Tests for llm_backend — pluggable LLM selector (Nemotron/Kimi/Nous)."""

import json
import os
import pytest
from unittest.mock import patch, MagicMock

from agent.lib.llm_backend import (
    ChatResult,
    backend_info,
    generate_chat,
    _backend,
    _configured,
    _nemoclaw_wrap,
)


class TestBackendSelection:
    def test_defaults_to_kimi(self, monkeypatch):
        monkeypatch.delenv("LLM_BACKEND", raising=False)
        assert _backend() == "kimi"

    def test_nemotron_when_set(self, monkeypatch):
        monkeypatch.setenv("LLM_BACKEND", "nemotron")
        assert _backend() == "nemotron"

    def test_nous_when_set(self, monkeypatch):
        monkeypatch.setenv("LLM_BACKEND", "nous")
        assert _backend() == "nous"

    def test_case_insensitive(self, monkeypatch):
        monkeypatch.setenv("LLM_BACKEND", "NEMOTRON")
        assert _backend() == "nemotron"


class TestConfigured:
    def test_kimi_configured(self, monkeypatch):
        monkeypatch.setenv("LLM_BACKEND", "kimi")
        monkeypatch.setenv("KIMI_API_KEY", "kimi_123")
        assert _configured() is True

    def test_nemotron_configured(self, monkeypatch):
        monkeypatch.setenv("LLM_BACKEND", "nemotron")
        monkeypatch.setenv("NVIDIA_API_KEY", "nv_123")
        assert _configured() is True

    def test_nemotron_configured_via_alias(self, monkeypatch):
        monkeypatch.setenv("LLM_BACKEND", "nemotron")
        monkeypatch.delenv("NVIDIA_API_KEY", raising=False)
        monkeypatch.setenv("NEMOTRON_API_KEY", "nemotron_123")
        assert _configured() is True

    def test_nous_configured(self, monkeypatch):
        monkeypatch.setenv("LLM_BACKEND", "nous")
        monkeypatch.setenv("NOUS_API_KEY", "nous_123")
        assert _configured() is True

    def test_not_configured(self, monkeypatch):
        monkeypatch.setenv("LLM_BACKEND", "kimi")
        monkeypatch.delenv("KIMI_API_KEY", raising=False)
        assert _configured() is False


def _mock_chat_response(content="test narrative"):
    """Create a mock urlopen response that works as a context manager."""
    mock_resp = MagicMock()
    mock_resp.__enter__ = MagicMock(return_value=mock_resp)
    mock_resp.__exit__ = MagicMock(return_value=False)
    mock_resp.read.return_value = json.dumps({
        "choices": [{"message": {"content": content}}]
    }).encode()
    return mock_resp


class TestGenerateChat:
    def test_kimi_backend_routes_correctly(self, monkeypatch):
        monkeypatch.setenv("LLM_BACKEND", "kimi")
        monkeypatch.setenv("KIMI_API_KEY", "kimi_123")
        mock_resp = _mock_chat_response("test narrative")
        with patch("agent.lib.llm_backend.urllib.request.urlopen", return_value=mock_resp):
            result = generate_chat([{"role": "user", "content": "hi"}])
        assert result.ok is True
        assert result.content == "test narrative"
        assert result.backend == "kimi"

    def test_nemotron_backend_routes_correctly(self, monkeypatch):
        monkeypatch.setenv("LLM_BACKEND", "nemotron")
        monkeypatch.setenv("NVIDIA_API_KEY", "nv_123")
        mock_resp = _mock_chat_response("nemotron narrative")
        with patch("agent.lib.llm_backend.urllib.request.urlopen", return_value=mock_resp) as mock_open:
            result = generate_chat([{"role": "user", "content": "hi"}])
            # Verify it hit the NVIDIA API URL
            called_url = mock_open.call_args[0][0].get_full_url()
            assert "nvidia.com" in called_url
        assert result.ok is True
        assert result.backend == "nemotron"

    def test_nous_backend_routes_correctly(self, monkeypatch):
        monkeypatch.setenv("LLM_BACKEND", "nous")
        monkeypatch.setenv("NOUS_API_KEY", "nous_123")
        mock_resp = _mock_chat_response("nous narrative")
        with patch("agent.lib.llm_backend.urllib.request.urlopen", return_value=mock_resp) as mock_open:
            result = generate_chat([{"role": "user", "content": "hi"}])
            called_url = mock_open.call_args[0][0].get_full_url()
            assert "nousresearch.com" in called_url
        assert result.ok is True
        assert result.backend == "nous"

    def test_returns_error_when_key_missing(self, monkeypatch):
        monkeypatch.setenv("LLM_BACKEND", "kimi")
        monkeypatch.delenv("KIMI_API_KEY", raising=False)
        result = generate_chat([{"role": "user", "content": "hi"}])
        assert result.ok is False
        assert "KIMI_API_KEY" in result.error

    def test_explicit_backend_override(self, monkeypatch):
        monkeypatch.setenv("LLM_BACKEND", "kimi")
        monkeypatch.setenv("KIMI_API_KEY", "kimi_123")
        monkeypatch.setenv("NVIDIA_API_KEY", "nv_123")
        mock_resp = _mock_chat_response("nemotron via override")
        with patch("agent.lib.llm_backend.urllib.request.urlopen", return_value=mock_resp):
            result = generate_chat([{"role": "user", "content": "hi"}], backend="nemotron")
        assert result.backend == "nemotron"


class TestNemoClawGuard:
    def test_wraps_system_message(self):
        messages = [{"role": "system", "content": "You are Weft."}]
        wrapped = _nemoclaw_wrap(messages)
        assert "NemoClaw Safety Boundary" in wrapped[0]["content"]
        assert "You are Weft." in wrapped[0]["content"]

    def test_inserts_system_when_missing(self):
        messages = [{"role": "user", "content": "hi"}]
        wrapped = _nemoclaw_wrap(messages)
        assert wrapped[0]["role"] == "system"
        assert "NemoClaw Safety Boundary" in wrapped[0]["content"]
        assert wrapped[1]["role"] == "user"

    def test_preserves_user_messages(self):
        messages = [
            {"role": "system", "content": "You are Weft."},
            {"role": "user", "content": "verify milestone 0xabc"},
        ]
        wrapped = _nemoclaw_wrap(messages)
        assert wrapped[1]["content"] == "verify milestone 0xabc"


class TestBackendInfo:
    def test_returns_current_config(self, monkeypatch):
        monkeypatch.setenv("LLM_BACKEND", "nemotron")
        monkeypatch.setenv("NVIDIA_API_KEY", "nv_123")
        monkeypatch.setenv("NEMOCLAW_GUARD", "1")
        info = backend_info()
        assert info["backend"] == "nemotron"
        assert info["configured"] is True
        assert info["nemoclaw_guard"] is True
        assert "nemotron" in info["model"].lower()

    def test_kimi_info(self, monkeypatch):
        monkeypatch.setenv("LLM_BACKEND", "kimi")
        monkeypatch.delenv("KIMI_API_KEY", raising=False)
        info = backend_info()
        assert info["backend"] == "kimi"
        assert info["configured"] is False
        assert info["nemoclaw_guard"] is False
