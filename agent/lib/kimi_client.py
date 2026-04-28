#!/usr/bin/env python3
# SPDX-License-Identifier: MIT

"""
Kimi API client for milestone narrative generation.
Generates human-readable attestation summaries from structured evidence.
"""

from __future__ import annotations

import json
import os
import urllib.request
from dataclasses import dataclass
from typing import Any, Dict, Optional


@dataclass(frozen=True)
class Narrative:
    summary: str
    confidence: float
    raw: Optional[Dict[str, Any]] = None


def generate_narrative(
    project_id: str,
    milestone_hash: str,
    evidence: Dict[str, Any],
    *,
    api_key: Optional[str] = None,
    model: str = "moonshot-v1-128k",
) -> Narrative:
    """
    Call Kimi API to synthesize evidence into a human-readable narrative.

    Args:
        project_id:     project ID from contract
        milestone_hash: milestone hash
        evidence:      structured dict with deployment, usage, github keys
        api_key:       Kimi API key (or set KIMI_API_KEY env var)
        model:        Kimi model name

    Returns a Narrative dataclass.
    Falls back to empty strings if KIMI_API_KEY is not set.
    """
    key = api_key or os.environ.get("KIMI_API_KEY") or ""
    if not key:
        return Narrative(summary="", confidence=0.0)

    deployment = evidence.get("deployment", {})
    usage = evidence.get("usage", {})
    github = evidence.get("github", {})

    prompt = build_prompt(project_id, milestone_hash, deployment, usage, github)

    payload = {
        "model": model,
        "messages": [
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": prompt},
        ],
        "temperature": 0.3,
    }

    req = urllib.request.Request(
        "https://api.moonshot.cn/v1/chat/completions",
        data=json.dumps(payload).encode("utf-8"),
        headers={
            "Content-Type": "application/json",
            "Authorization": f"Bearer {key}",
        },
        method="POST",
    )

    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            raw = json.loads(resp.read().decode("utf-8"))
    except Exception:
        return Narrative(summary="", confidence=0.0)

    try:
        content = raw["choices"][0]["message"]["content"]
        parsed = json.loads(content)
        return Narrative(
            summary=parsed.get("summary", ""),
            confidence=float(parsed.get("confidence", 0.0)),
            raw=parsed,
        )
    except Exception:
        return Narrative(summary=raw.get("choices", [{}])[0].get("message", {}).get("content", ""), confidence=0.0)


SYSTEM_PROMPT = (
    "You are a Weft milestone verifier. Given structured evidence about a milestone, "
    "produce a JSON object with keys: summary (string, 1-2 sentences), confidence (float 0-1). "
    "Do not include any other keys. Be concise and factual."
)


def build_prompt(
    project_id: str,
    milestone_hash: str,
    deployment: Dict[str, Any],
    usage: Dict[str, Any],
    github: Dict[str, Any],
) -> str:
    pieces = [
        f"Project: {project_id}",
        f"Milestone: {milestone_hash}",
        "Deployment evidence:",
        json.dumps(deployment, indent=2),
        "Usage evidence:",
        json.dumps(usage, indent=2),
        "GitHub evidence:",
        json.dumps(github, indent=2),
    ]
    return "\n\n".join(pieces)