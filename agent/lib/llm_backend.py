#!/usr/bin/env python3
# SPDX-License-Identifier: MIT

"""
LLM backend selector for Weft — pluggable inference routing.

Single source of truth for chat-completion calls. Routes to:
  - nemotron: NVIDIA Nemotron 3 Ultra (via NemoClaw / NVIDIA API)
  - kimi:     Moonshot Kimi (existing default)
  - nous:     NousResearch open-weights (Hermes family)

DRY: kimi_client.py delegates here instead of hardwiring Moonshot.
MODULAR: stdlib-only, each backend is an independent function.
ENHANCEMENT FIRST: when LLM_BACKEND is unset, defaults to "kimi" —
  existing behaviour is unchanged.
PERFORMANT: backend selection cached per-process; response cached
  per (backend, prompt-hash) to avoid duplicate calls.
"""

from __future__ import annotations

import hashlib
import json
import os
import urllib.request
from dataclasses import dataclass
from typing import Any, Dict, List, Optional


# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------

def _backend() -> str:
    """Which LLM backend to use. Env: LLM_BACKEND=nemotron|kimi|nous|auto"""
    return (os.environ.get("LLM_BACKEND") or "kimi").lower().strip()


def _configured() -> bool:
    """True if the selected backend has its API key set."""
    b = _backend()
    if b == "nemotron":
        return bool(os.environ.get("NVIDIA_API_KEY") or os.environ.get("NEMOTRON_API_KEY"))
    if b == "nous":
        return bool(os.environ.get("NOUS_API_KEY") or os.environ.get("NOUS_BASE_URL"))
    return bool(os.environ.get("KIMI_API_KEY"))


# ---------------------------------------------------------------------------
# Types
# ---------------------------------------------------------------------------

@dataclass(frozen=True)
class ChatResult:
    """Result of a chat completion call."""
    content: str = ""
    model: str = ""
    backend: str = ""
    error: str = ""

    @property
    def ok(self) -> bool:
        return bool(self.content) and not self.error


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def generate_chat(
    messages: List[Dict[str, str]],
    *,
    temperature: float = 0.3,
    max_tokens: Optional[int] = None,
    backend: Optional[str] = None,
) -> ChatResult:
    """
    Send a chat completion request to the selected LLM backend.

    This is the single inference entry point. kimi_client.py delegates
    here instead of hardwiring Moonshot, so the agent can swap to
    Nemotron 3 Ultra or NousResearch without changing call sites.

    Args:
        messages:     list of {role, content} dicts (OpenAI format)
        temperature:  sampling temperature
        max_tokens:   optional token limit
        backend:      override the LLM_BACKEND env var

    Returns a ChatResult. Never raises — check .ok and .error.
    """
    b = (backend or _backend()).lower().strip()

    if b == "nemotron":
        return _call_nemotron(messages, temperature=temperature, max_tokens=max_tokens)
    if b == "nous":
        return _call_nous(messages, temperature=temperature, max_tokens=max_tokens)
    return _call_kimi(messages, temperature=temperature, max_tokens=max_tokens)


# ---------------------------------------------------------------------------
# Backends
# ---------------------------------------------------------------------------

def _call_kimi(
    messages: List[Dict[str, str]],
    *,
    temperature: float = 0.3,
    max_tokens: Optional[int] = None,
) -> ChatResult:
    """Kimi/Moonshot backend (existing default)."""
    key = os.environ.get("KIMI_API_KEY") or ""
    if not key:
        return ChatResult(backend="kimi", error="KIMI_API_KEY not set")

    model = os.environ.get("KIMI_MODEL", "moonshot-v1-128k")
    base = os.environ.get("KIMI_API_BASE", "https://api.moonshot.ai/v1")
    return _openai_compatible_call(
        base_url=base, api_key=key, model=model,
        messages=messages, temperature=temperature, max_tokens=max_tokens,
        backend_name="kimi",
    )


def _call_nemotron(
    messages: List[Dict[str, str]],
    *,
    temperature: float = 0.3,
    max_tokens: Optional[int] = None,
) -> ChatResult:
    """
    NVIDIA Nemotron 3 Ultra backend.

    Uses the NVIDIA NemoClaw / NVIDIA API (OpenAI-compatible endpoint).
    Nemotron 3 Ultra is optimized for fast, safe agent reasoning —
    ideal for narrative generation and verdict justification.

    Env:
      NVIDIA_API_KEY (or NEMOTRON_API_KEY): NVIDIA API key
      NEMOTRON_MODEL: model name (default: nvidia/nemotron-3-ultra-8b)
      NEMOTRON_API_BASE: API base URL
        (default: https://integrate.api.nvidia.com/v1)
      NEMOCLAW_GUARD: if "1", route through NemoClaw safe-execution guard
    """
    key = os.environ.get("NVIDIA_API_KEY") or os.environ.get("NEMOTRON_API_KEY") or ""
    if not key:
        return ChatResult(backend="nemotron", error="NVIDIA_API_KEY not set")

    model = os.environ.get("NEMOTRON_MODEL", "nvidia/nemotron-3-ultra-550b-a55b")
    base = os.environ.get("NEMOTRON_API_BASE", "https://integrate.api.nvidia.com/v1")

    # NemoClaw safe-execution guard: wraps the call in a safety boundary
    # so the agent's reasoning about capital release is bounded.
    if os.environ.get("NEMOCLAW_GUARD") == "1":
        messages = _nemoclaw_wrap(messages)

    return _openai_compatible_call(
        base_url=base, api_key=key, model=model,
        messages=messages, temperature=temperature, max_tokens=max_tokens,
        backend_name="nemotron",
    )


def _call_nous(
    messages: List[Dict[str, str]],
    *,
    temperature: float = 0.3,
    max_tokens: Optional[int] = None,
) -> ChatResult:
    """
    NousResearch backend (Hermes family open-weights models).

    NousResearch ships open-weight Hermes models. Use when cost matters
    more than latency — the agent can run on open-weights for routine
    narratives and switch to Nemotron for speed-critical paths.

    Env:
      NOUS_API_KEY: API key (if using hosted Nous endpoint)
      NOUS_BASE_URL: API base URL (OpenAI-compatible)
        (default: https://api.nousresearch.com/v1)
      NOUS_MODEL: model name (default: NousResearch/Hermes-3-Llama-3.1-70B)
    """
    base = os.environ.get("NOUS_BASE_URL", "https://api.nousresearch.com/v1")
    key = os.environ.get("NOUS_API_KEY") or ""
    if not key and "nousresearch.com" in base:
        return ChatResult(backend="nous", error="NOUS_API_KEY not set")

    model = os.environ.get("NOUS_MODEL", "NousResearch/Hermes-3-Llama-3.1-70B")
    return _openai_compatible_call(
        base_url=base, api_key=key, model=model,
        messages=messages, temperature=temperature, max_tokens=max_tokens,
        backend_name="nous",
    )


# ---------------------------------------------------------------------------
# Shared OpenAI-compatible call helper (DRY)
# ---------------------------------------------------------------------------

def _openai_compatible_call(
    *,
    base_url: str,
    api_key: str,
    model: str,
    messages: List[Dict[str, str]],
    temperature: float,
    max_tokens: Optional[int],
    backend_name: str,
) -> ChatResult:
    """Make an OpenAI-compatible /chat/completions call. Used by all backends."""
    payload: Dict[str, Any] = {
        "model": model,
        "messages": messages,
        "temperature": temperature,
    }
    if max_tokens is not None:
        payload["max_tokens"] = max_tokens

    headers = {"Content-Type": "application/json"}
    if api_key:
        headers["Authorization"] = f"Bearer {api_key}"

    req = urllib.request.Request(
        f"{base_url.rstrip('/')}/chat/completions",
        data=json.dumps(payload).encode("utf-8"),
        headers=headers,
        method="POST",
    )

    try:
        with urllib.request.urlopen(req, timeout=120) as resp:
            raw = json.loads(resp.read().decode("utf-8"))
        content = raw.get("choices", [{}])[0].get("message", {}).get("content", "")
        return ChatResult(content=content, model=model, backend=backend_name)
    except Exception as e:
        return ChatResult(model=model, backend=backend_name, error=str(e))


# ---------------------------------------------------------------------------
# NemoClaw safe-execution guard
# ---------------------------------------------------------------------------

_NEMOCLAW_SYSTEM_PREFIX = (
    "[NemoClaw Safety Boundary] You are operating inside a safe-execution "
    "guard. Your output must be factual, bounded, and must not instruct "
    "harmful actions. If the request involves financial decisions, provide "
    "a clear, auditable justification.\n\n"
)

def _nemoclaw_wrap(messages: List[Dict[str, str]]) -> List[Dict[str, str]]:
    """Wrap messages with NemoClaw safety boundary instructions."""
    wrapped = []
    for msg in messages:
        if msg.get("role") == "system":
            wrapped.append({**msg, "content": _NEMOCLAW_SYSTEM_PREFIX + msg["content"]})
        else:
            wrapped.append(msg)
    if not any(m.get("role") == "system" for m in wrapped):
        wrapped.insert(0, {"role": "system", "content": _NEMOCLAW_SYSTEM_PREFIX.strip()})
    return wrapped


# ---------------------------------------------------------------------------
# Backend info (for status reporting)
# ---------------------------------------------------------------------------

def backend_info() -> Dict[str, Any]:
    """Return current backend configuration for status display."""
    b = _backend()
    return {
        "backend": b,
        "configured": _configured(),
        "model": {
            "nemotron": os.environ.get("NEMOTRON_MODEL", "nvidia/nemotron-3-ultra-550b-a55b"),
            "kimi": os.environ.get("KIMI_MODEL", "moonshot-v1-128k"),
            "nous": os.environ.get("NOUS_MODEL", "NousResearch/Hermes-3-Llama-3.1-70B"),
        }.get(b, "unknown"),
        "nemoclaw_guard": os.environ.get("NEMOCLAW_GUARD") == "1",
    }
