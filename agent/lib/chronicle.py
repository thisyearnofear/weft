#!/usr/bin/env python3
# SPDX-License-Identifier: MIT

"""
Chronicle module — generates shareable HTML milestone achievement cards
with a woven-fabric visual motif.

Each card is a 'swatch of fabric' proving a thread was woven into the
builder's tapestry.
"""

from __future__ import annotations

import html
import json
import os
from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional


@dataclass
class CardData:
    milestone_hash: str = ""
    project_id: str = ""
    verified: bool = False
    narrative_summary: str = ""
    unique_callers: int = 0
    commits: int = 0
    peer_signers: int = 0
    evidence_root: str = ""
    chapter_heading: str = ""
    chapter_body: str = ""


def generate_milestone_card(data: CardData) -> str:
    """
    Produce a self-contained HTML milestone achievement card styled with
    a woven-fabric visual motif.

    Returns the full HTML string (suitable for writing to a .html file).
    """
    status_color = "#2ecc71" if data.verified else "#e74c3c"
    status_text = "Verified ✓" if data.verified else "Unverified ✗"
    short_hash = data.milestone_hash[:10] + "…" if len(data.milestone_hash) > 10 else data.milestone_hash
    short_root = data.evidence_root[:10] + "…" if len(data.evidence_root) > 10 else data.evidence_root

    narrative = html.escape(data.narrative_summary or data.chapter_body or "No narrative generated.")
    heading = html.escape(data.chapter_heading or "Milestone Swatch")

    return f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Weft — {html.escape(short_hash)}</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap');

  * {{ margin: 0; padding: 0; box-sizing: border-box; }}

  body {{
    font-family: 'Inter', sans-serif;
    background: #0d0d12;
    display: flex;
    justify-content: center;
    align-items: center;
    min-height: 100vh;
    padding: 2rem;
  }}

  .card {{
    width: 480px;
    background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%);
    border-radius: 16px;
    overflow: hidden;
    box-shadow: 0 20px 60px rgba(0,0,0,0.5);
    position: relative;
  }}

  /* Woven fabric pattern overlay */
  .card::before {{
    content: '';
    position: absolute;
    inset: 0;
    background:
      repeating-linear-gradient(0deg, transparent, transparent 8px, rgba(255,255,255,0.02) 8px, rgba(255,255,255,0.02) 9px),
      repeating-linear-gradient(90deg, transparent, transparent 8px, rgba(255,255,255,0.02) 8px, rgba(255,255,255,0.02) 9px);
    pointer-events: none;
    z-index: 1;
  }}

  .card-inner {{ position: relative; z-index: 2; padding: 2rem; }}

  .brand {{
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin-bottom: 1.5rem;
    opacity: 0.7;
    font-size: 0.75rem;
    text-transform: uppercase;
    letter-spacing: 0.15em;
    color: #a0a0b0;
  }}

  .brand svg {{ width: 16px; height: 16px; }}

  .status {{
    display: inline-block;
    padding: 0.25rem 0.75rem;
    border-radius: 999px;
    font-size: 0.8rem;
    font-weight: 600;
    color: #fff;
    background: {status_color};
    margin-bottom: 1rem;
  }}

  h2 {{
    color: #e0e0f0;
    font-size: 1.3rem;
    font-weight: 700;
    margin-bottom: 0.75rem;
    line-height: 1.3;
  }}

  .narrative {{
    color: #b0b0c8;
    font-size: 0.9rem;
    line-height: 1.6;
    margin-bottom: 1.5rem;
    font-style: italic;
  }}

  .metrics {{
    display: grid;
    grid-template-columns: 1fr 1fr 1fr;
    gap: 1rem;
    margin-bottom: 1.5rem;
  }}

  .metric {{
    text-align: center;
  }}

  .metric-value {{
    color: #fff;
    font-size: 1.4rem;
    font-weight: 700;
  }}

  .metric-label {{
    color: #808098;
    font-size: 0.7rem;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    margin-top: 0.2rem;
  }}

  .footer {{
    border-top: 1px solid rgba(255,255,255,0.08);
    padding-top: 1rem;
    display: flex;
    justify-content: space-between;
    font-size: 0.7rem;
    color: #606078;
  }}

  .footer code {{
    font-family: 'SF Mono', 'Fira Code', monospace;
    color: #808098;
  }}

  /* Thread accent line */
  .thread-accent {{
    height: 3px;
    background: linear-gradient(90deg, #e74c3c, #f39c12, #2ecc71, #3498db, #9b59b6);
    border-radius: 0 0 16px 16px;
  }}
</style>
</head>
<body>
<div class="card">
  <div class="card-inner">
    <div class="brand">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M4 6h16M4 10h16M4 14h16M4 18h16"/>
        <path d="M8 4v16M12 4v16M16 4v16" opacity="0.4"/>
      </svg>
      WEFT — Builder Journey
    </div>

    <div class="status">{status_text}</div>

    <h2>{heading}</h2>

    <div class="narrative">{narrative}</div>

    <div class="metrics">
      <div class="metric">
        <div class="metric-value">{data.unique_callers}</div>
        <div class="metric-label">Unique Callers</div>
      </div>
      <div class="metric">
        <div class="metric-value">{data.commits}</div>
        <div class="metric-label">Commits</div>
      </div>
      <div class="metric">
        <div class="metric-value">{data.peer_signers}</div>
        <div class="metric-label">Peer Signers</div>
      </div>
    </div>

    <div class="footer">
      <span>Milestone <code>{html.escape(short_hash)}</code></span>
      <span>Evidence <code>{html.escape(short_root)}</code></span>
    </div>
  </div>
  <div class="thread-accent"></div>
</div>
</body>
</html>"""


def generate_chronicle_html(
    title: str,
    chapters: List[Dict[str, str]],
    epilogue: str,
    attestations: List[Dict[str, Any]],
) -> str:
    """
    Generate a full multi-chapter chronicle HTML page with woven-fabric styling.
    Combines all milestone cards into a single scrollable tapestry.
    """
    chapter_html = ""
    for i, ch in enumerate(chapters):
        heading = html.escape(ch.get("heading", f"Chapter {i+1}"))
        body = html.escape(ch.get("body", ""))
        chapter_html += f"""
    <div class="chapter">
      <h3>{heading}</h3>
      <p>{body}</p>
    </div>"""

    epilogue_html = html.escape(epilogue) if epilogue else ""

    return f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Weft Chronicle — {html.escape(title)}</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&family=Lora:ital,wght@0,400;1,400&display=swap');

  * {{ margin: 0; padding: 0; box-sizing: border-box; }}

  body {{
    font-family: 'Inter', sans-serif;
    background: #0d0d12;
    color: #c0c0d0;
    padding: 3rem 1.5rem;
  }}

  .tapestry {{
    max-width: 640px;
    margin: 0 auto;
  }}

  /* Woven background pattern */
  .tapestry::before {{
    content: '';
    position: fixed;
    inset: 0;
    background:
      repeating-linear-gradient(0deg, transparent, transparent 12px, rgba(255,255,255,0.01) 12px, rgba(255,255,255,0.01) 13px),
      repeating-linear-gradient(90deg, transparent, transparent 12px, rgba(255,255,255,0.01) 12px, rgba(255,255,255,0.01) 13px);
    pointer-events: none;
    z-index: 0;
  }}

  h1 {{
    font-family: 'Lora', serif;
    font-size: 2rem;
    color: #e0e0f0;
    margin-bottom: 0.5rem;
    position: relative;
    z-index: 1;
  }}

  .subtitle {{
    font-size: 0.85rem;
    color: #808098;
    margin-bottom: 3rem;
    position: relative;
    z-index: 1;
  }}

  .thread-line {{
    width: 2px;
    height: 2rem;
    background: linear-gradient(180deg, #3498db, #9b59b6);
    margin: 0 auto 0 1.5rem;
  }}

  .chapter {{
    position: relative;
    z-index: 1;
    background: rgba(255,255,255,0.03);
    border-left: 3px solid #3498db;
    border-radius: 0 12px 12px 0;
    padding: 1.5rem 2rem;
    margin-bottom: 0.5rem;
  }}

  .chapter h3 {{
    font-family: 'Lora', serif;
    font-size: 1.2rem;
    color: #e0e0f0;
    margin-bottom: 0.75rem;
  }}

  .chapter p {{
    font-size: 0.9rem;
    line-height: 1.7;
    color: #b0b0c8;
  }}

  .epilogue {{
    position: relative;
    z-index: 1;
    margin-top: 2rem;
    padding: 1.5rem 2rem;
    border-top: 1px solid rgba(255,255,255,0.08);
    font-family: 'Lora', serif;
    font-style: italic;
    color: #a0a0b8;
    line-height: 1.7;
  }}

  .brand-footer {{
    position: relative;
    z-index: 1;
    text-align: center;
    margin-top: 3rem;
    font-size: 0.7rem;
    color: #505068;
    letter-spacing: 0.15em;
    text-transform: uppercase;
  }}
</style>
</head>
<body>
<div class="tapestry">
  <h1>{html.escape(title)}</h1>
  <div class="subtitle">A Builder Journey — woven from onchain threads</div>
  {chapter_html}
  {"<div class='epilogue'>" + epilogue_html + "</div>" if epilogue_html else ""}
  <div class="brand-footer">Weft — technology provides the warp, liberal arts provide the weft</div>
</div>
</body>
</html>"""


def write_card(data: CardData, out_path: str) -> str:
    """Write a milestone card HTML file and return the path."""
    card_html = generate_milestone_card(data)
    os.makedirs(os.path.dirname(out_path) or ".", exist_ok=True)
    with open(out_path, "w", encoding="utf-8") as f:
        f.write(card_html)
    return out_path


def write_chronicle(
    title: str,
    chapters: List[Dict[str, str]],
    epilogue: str,
    attestations: List[Dict[str, Any]],
    out_path: str,
) -> str:
    """Write a full chronicle HTML page and return the path."""
    page = generate_chronicle_html(title, chapters, epilogue, attestations)
    os.makedirs(os.path.dirname(out_path) or ".", exist_ok=True)
    with open(out_path, "w", encoding="utf-8") as f:
        f.write(page)
    return out_path
