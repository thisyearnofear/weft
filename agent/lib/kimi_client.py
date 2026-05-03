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

    _base = os.environ.get("KIMI_API_BASE", "https://api.moonshot.ai/v1")
    req = urllib.request.Request(
        f"{_base}/chat/completions",
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

CHRONICLE_SYSTEM_PROMPT = (
    "You are the Weft Chronicle — a storyteller for builder journeys on the blockchain. "
    "Weft means the horizontal threads that interlace with the vertical warp to create woven fabric. "
    "In your narratives, each milestone is a thread, peer consensus is the interlacing that binds "
    "threads together, and the final verified project story is the fabric.\n\n"
    "Use textile and weaving metaphors naturally throughout: threads, fabric, tapestry, interlacing, "
    "loom, spool, shuttle, warp and weft, pattern, swatch, weave. Do NOT force them — let them "
    "emerge organically from the narrative.\n\n"
    "Structure your output as a JSON object with keys:\n"
    "  - title: string — a short evocative title for the full chronicle\n"
    "  - chapters: array of {heading, body} — one chapter per milestone, in chronological order\n"
    "  - epilogue: string — a brief closing reflection on the fabric woven so far\n"
    "  - confidence: float 0-1 — your overall confidence in the narrative accuracy\n\n"
    "Each chapter heading should be evocative (e.g. 'The First Thread', 'Tightening the Weave'). "
    "Each chapter body should be 2-4 sentences weaving together the hard data (callers, commits, "
    "deployment status, peer signers) with narrative meaning. Be factual but human."
)


@dataclass(frozen=True)
class Chronicle:
    title: str
    chapters: list  # list of {heading, body}
    epilogue: str
    confidence: float
    raw: Optional[Dict[str, Any]] = None


def generate_chronicle(
    attestations: list,
    *,
    project_id: str = "",
    api_key: Optional[str] = None,
    model: str = "moonshot-v1-128k",
) -> Chronicle:
    """
    Generate a multi-chapter 'Builder Journey' narrative from multiple milestone
    attestations using weaving metaphors.

    Args:
        attestations: list of attestation dicts (each with milestone_hash, verified,
                      deployment, usage, github, signers, etc.)
        project_id:   optional project identifier
        api_key:      Kimi API key (or KIMI_API_KEY env var)
        model:        Kimi model name

    Returns a Chronicle dataclass. Falls back gracefully when KIMI_API_KEY is unset.
    """
    key = api_key or os.environ.get("KIMI_API_KEY") or ""
    if not key:
        return Chronicle(title="", chapters=[], epilogue="", confidence=0.0)

    prompt = _build_chronicle_prompt(attestations, project_id)

    payload = {
        "model": model,
        "messages": [
            {"role": "system", "content": CHRONICLE_SYSTEM_PROMPT},
            {"role": "user", "content": prompt},
        ],
        "temperature": 0.5,
    }

    _base = os.environ.get("KIMI_API_BASE", "https://api.moonshot.ai/v1")
    req = urllib.request.Request(
        f"{_base}/chat/completions",
        data=json.dumps(payload).encode("utf-8"),
        headers={
            "Content-Type": "application/json",
            "Authorization": f"Bearer {key}",
        },
        method="POST",
    )

    try:
        with urllib.request.urlopen(req, timeout=60) as resp:
            raw = json.loads(resp.read().decode("utf-8"))
    except Exception:
        return Chronicle(title="", chapters=[], epilogue="", confidence=0.0)

    try:
        content = raw["choices"][0]["message"]["content"]
        # Strip markdown code fences if present
        if content.strip().startswith("```"):
            lines = content.strip().split("\n")
            lines = [l for l in lines if not l.strip().startswith("```")]
            content = "\n".join(lines)
        parsed = json.loads(content)
        return Chronicle(
            title=parsed.get("title", "Untitled Chronicle"),
            chapters=parsed.get("chapters", []),
            epilogue=parsed.get("epilogue", ""),
            confidence=float(parsed.get("confidence", 0.0)),
            raw=parsed,
        )
    except Exception:
        # Fallback: use raw text as a single-chapter chronicle
        text = raw.get("choices", [{}])[0].get("message", {}).get("content", "")
        return Chronicle(
            title="Builder Journey",
            chapters=[{"heading": "The Weave", "body": text}],
            epilogue="",
            confidence=0.0,
            raw=raw,
        )


def _build_chronicle_prompt(attestations: list, project_id: str) -> str:
    pieces = [
        f"Project: {project_id or 'unknown'}",
        f"Total milestones: {len(attestations)}",
        "",
        "Below are the milestone attestations in chronological order. "
        "For each one, weave a chapter of the builder's journey.",
        "",
    ]
    for i, att in enumerate(attestations, 1):
        pieces.append(f"--- Milestone {i} ---")
        pieces.append(json.dumps(att, indent=2, default=str))
        pieces.append("")
    return "\n".join(pieces)


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