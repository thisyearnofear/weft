---
name: weft-chronicle
description: Generate a multi-chapter Builder Journey narrative from Weft milestone attestations using Kimi — each milestone is a thread woven into the project's fabric
version: 1.1.0
metadata:
  hermes:
    tags: [web3, ai, kimi, creative, narrative, weaving, 0g]
    category: creative
    requires_toolsets: [terminal]
required_environment_variables:
  - name: KIMI_API_KEY
    prompt: Kimi/Moonshot API key
    help: "Get a key from https://platform.kimi.ai"
    required_for: "chronicle narrative generation"
---

# Weft Chronicle — Builder Journey Narratives

## When to Use

- User asks "tell me my project's story", "tell me the story of Weft", "what's my builder journey?", or "generate a chronicle"
- After a milestone is verified and the builder wants a shareable achievement card
- Generating creative content from onchain verification data

## Concept

**Weft** is the horizontal thread that interlaces with the vertical warp to create
woven fabric. Technology provides the warp (onchain data, peer verdicts, storage proofs).
The liberal arts provide the weft (narrative, meaning, human context).

## Procedure

**Execute this single script immediately. Do not explore files first. Do not ask questions.**

### Step 1 — Run the chronicle generator

```bash
cd ~/dev/weft && source scripts/.env 2>/dev/null; python3 - << 'PYEOF'
import json, glob, os, sys

sys.path.insert(0, '.')
from agent.lib.kimi_client import generate_chronicle
from agent.lib.chronicle import write_chronicle, write_card, CardData

OUT_DIR = 'agent/.attestations/demo-node-1'
os.makedirs(OUT_DIR, exist_ok=True)

# Load real attestations if available
attestations = []
for path in sorted(glob.glob('agent/.attestations/*/attestation.json')):
    with open(path) as f:
        d = json.load(f)
    # Normalise to flat shape generate_chronicle expects
    attestations.append({
        'milestoneHash': d.get('weft', {}).get('milestoneHash', d.get('milestoneHash', '')),
        'projectId':     d.get('weft', {}).get('projectId', d.get('projectId', 'weft-protocol')),
        'verified':      d.get('verdict', {}).get('verified', d.get('verified', False)),
        'uniqueCallerCount': d.get('evidence', {}).get('usage', {}).get('uniqueCallerCount',
                             d.get('usage', {}).get('uniqueCallerCount', 0)),
        'commitCount':   len(d.get('evidence', {}).get('github', {}).get('commits', [])),
        'narrative':     d.get('narrative', {}).get('summary', ''),
        'evidenceRoot':  d.get('evidenceRoot', ''),
        'peerSigners':   d.get('peerSigners', 0),
    })

# Use demo data if no real attestations exist
if not attestations:
    attestations = [{
        'milestoneHash': '0x516975afcb46acf3ea2265789ea0a64516db9f1d8e6cfb65737fc9cfafb1c16f',
        'projectId': 'weft-protocol',
        'verified': True,
        'uniqueCallerCount': 147,
        'commitCount': 23,
        'narrative': '',
        'evidenceRoot': '',
        'peerSigners': 3,
    }]
    print('Using demo attestation data (no real attestations found)')

print(f'Generating chronicle for {len(attestations)} milestone(s)...')

# Generate via Kimi
chronicle = generate_chronicle(attestations)
print(f'\nTitle: {chronicle.title}')
for ch in chronicle.chapters:
    print(f'  Chapter: {ch["heading"]}')
    print(f'    {ch["body"][:120]}...')
if chronicle.epilogue:
    print(f'  Epilogue: {chronicle.epilogue[:100]}...')

# Write chronicle HTML
chronicle_path = f'{OUT_DIR}/chronicle.html'
write_chronicle(
    title=chronicle.title,
    chapters=chronicle.chapters,
    epilogue=chronicle.epilogue,
    attestations=attestations,
    out_path=chronicle_path,
)
print(f'\nWritten: {chronicle_path}')

# Write milestone card for first attestation
att = attestations[0]
ch0 = chronicle.chapters[0] if chronicle.chapters else {}
card = CardData(
    milestone_hash=att['milestoneHash'],
    project_id=att.get('projectId', 'weft-protocol'),
    verified=att['verified'],
    narrative_summary=att.get('narrative') or (ch0.get('body', '')[:300]),
    unique_callers=att['uniqueCallerCount'],
    commits=att['commitCount'],
    peer_signers=att.get('peerSigners', 0),
    evidence_root=att.get('evidenceRoot', ''),
    chapter_heading=ch0.get('heading', ''),
    chapter_body=ch0.get('body', ''),
)
card_path = f'{OUT_DIR}/milestone_card.html'
write_card(card, card_path)
print(f'Written: {card_path}')

print('\nDone. Opening in browser...')
PYEOF
```

### Step 2 — Open the files in the browser

```bash
open ~/dev/weft/agent/.attestations/demo-node-1/chronicle.html
open ~/dev/weft/agent/.attestations/demo-node-1/milestone_card.html
```

### Step 3 — Present the narrative in chat

After the files open, display the chronicle title, chapter headings, and a 2–3 sentence
excerpt from the first chapter directly in the chat window. Format it like this:

```
🧵 Builder Journey Chronicle
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

"<chronicle title>"

Chapter 1: <heading>
<first 2 sentences of body>

Chapter 2: <heading>
<first 2 sentences of body>

Epilogue: <first sentence>

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ Chronicle opened in your browser.
✅ Milestone card opened in your browser.

Technology provides the warp. Liberal arts provide the weft.
```

## Rules

- **Execute immediately** — do not explore files, ask questions, or debug first
- **Always open the browser** — call `open <path>` after generating; never leave the user to open files manually
- **Use demo data** — if no real attestations exist, the script uses built-in demo data; this is correct behaviour
- **KIMI_API_KEY** — sourced from `scripts/.env` automatically; do not ask the user for it

## Pitfalls

- If `generate_chronicle` returns empty title/chapters, the Kimi key may be missing or rate-limited — the script still writes the HTML with whatever it has
- The `source scripts/.env` at the top loads all keys including `KIMI_API_KEY`; do not skip it
