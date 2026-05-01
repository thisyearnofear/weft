---
name: weft-chronicle
description: Generate a multi-chapter Builder Journey narrative from milestone attestations using Kimi — each milestone is a thread woven into the project's fabric
version: 1.0.0
metadata:
  hermes:
    tags: [web3, ai, kimi, creative, narrative, weaving, 0g]
    category: creative
    requires_toolsets: [terminal]
required_environment_variables:
  - name: KIMI_API_KEY
    prompt: Kimi/Moonshot API key
    help: "Get a key from https://platform.moonshot.cn"
    required_for: "chronicle narrative generation"
---

# Weft Chronicle — Builder Journey Narratives

## When to Use

- User asks "tell me my project's story" or "what's my builder journey?"
- User wants a narrative summary across multiple milestones
- After a milestone is verified and the builder wants a shareable achievement card
- User wants to see the full tapestry of their project's onchain history
- Generating creative content from onchain verification data

## Concept

**Weft** is the horizontal thread that interlaces with the vertical warp to create
woven fabric. In Weft's chronicle system:

- Each **milestone** is a thread
- **Peer consensus** is the interlacing that binds threads together
- The final **verified project story** is the fabric
- Each **milestone card** is a swatch — a small piece of the larger tapestry

Technology provides the warp (onchain data, peer verdicts, storage proofs).
The liberal arts provide the weft (narrative, meaning, human context).

## Procedure

### 1. Load attestations

```bash
cd ~/weft

# List available attestations
ls agent/.attestations/
```

### 2. Generate the chronicle

```bash
export KIMI_API_KEY="<your_kimi_api_key>"

python3 -c "
import json, glob, os

from agent.lib.kimi_client import generate_chronicle
from agent.lib.chronicle import write_chronicle, write_card, CardData

# Load all attestation files
attestations = []
for path in sorted(glob.glob('agent/.attestations/*/attestation.json')):
    with open(path) as f:
        attestations.append(json.load(f))

if not attestations:
    print('No attestations found in agent/.attestations/')
    exit(1)

print(f'Found {len(attestations)} milestone attestation(s)')

# Generate multi-chapter narrative via Kimi
chronicle = generate_chronicle(attestations, project_id='my-project')
print(f'Chronicle: {chronicle.title}')
for ch in chronicle.chapters:
    print(f'  Chapter: {ch[\"heading\"]}')

# Write full chronicle HTML
write_chronicle(
    title=chronicle.title,
    chapters=chronicle.chapters,
    epilogue=chronicle.epilogue,
    attestations=attestations,
    out_path='agent/.attestations/chronicle.html',
)
print('Written: agent/.attestations/chronicle.html')

# Write individual milestone cards
for i, att in enumerate(attestations):
    ch = chronicle.chapters[i] if i < len(chronicle.chapters) else {}
    card = CardData(
        milestone_hash=att.get('milestoneHash', ''),
        verified=att.get('verified', False),
        narrative_summary=att.get('narrative', {}).get('summary', ''),
        unique_callers=att.get('usage', {}).get('uniqueCallerCount', 0),
        commits=len(att.get('github', {}).get('commits', [])),
        peer_signers=att.get('peerSigners', 0),
        evidence_root=att.get('evidenceRoot', ''),
        chapter_heading=ch.get('heading', ''),
        chapter_body=ch.get('body', ''),
    )
    out = f'agent/.attestations/card_{i+1}.html'
    write_card(card, out)
    print(f'Written: {out}')
"
```

### 3. Present the output

Show the chronicle title and chapter summaries in chat. Provide the HTML file paths
so the user can open them in a browser:

```
  🧵 Builder Journey Chronicle
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━

  "Weaving the First Fabric"

  Chapter 1: The First Thread
  Your contract was deployed to mainnet — the first thread placed
  on the loom. 147 unique wallets found their way to your code
  in the first week, each interaction tightening the weave.

  Chapter 2: Gathering Momentum
  Three peer verifiers interlaced their verdicts, binding this
  thread into the fabric with cryptographic certainty...

  ━━━━━━━━━━━━━━━━━━━━━━━━━━━
  📄 Full chronicle: agent/.attestations/chronicle.html
  🎴 Milestone card: agent/.attestations/card_1.html
```

## Pitfalls

- **No KIMI_API_KEY:** Chronicle generation requires Kimi. Falls back to empty output.
- **No attestations:** If `agent/.attestations/` is empty, prompt the user to run verification first.
- **Single milestone:** The chronicle still works with one milestone — it just produces a single-chapter story.
