---
name: weft-narrate
description: Generate a human-readable narrative from a Weft attestation using Kimi (moonshot-v1-128k)
version: 1.0.0
metadata:
  hermes:
    tags: [web3, ai, kimi, narrative, 0g]
    category: devops
    requires_toolsets: [terminal]
required_environment_variables:
  - name: KIMI_API_KEY
    prompt: Kimi/Moonshot API key
    help: "Get a key from https://platform.moonshot.cn"
    required_for: "narrative generation"
---

# Weft Narrative Generation

## When to Use

- After verifying a milestone, generate a human-readable report
- User asks for a summary of a milestone's verification
- User asks to explain what an attestation means
- Converting raw onchain data into builder-friendly language

## Context

Weft uses Kimi (`moonshot-v1-128k`) to transform raw attestation JSON into clear, builder-facing narratives. This runs as part of the verification pipeline but can also be called standalone.

The narrative includes:
- What was verified (deployment, unique callers, time window)
- The verdict (verified/failed)
- Evidence root and where it's published
- Next steps for the builder

## Procedure

### 1. Generate narrative from attestation file

```bash
cd ~/weft
export KIMI_API_KEY="<your_kimi_api_key>"

python3 -c "
import json
from agent.lib.kimi_client import generate_narrative

# Load attestation
with open('agent/.attestations/<MILESTONE_HASH>/<TIMESTAMP>/attestation.json') as f:
    attestation = json.load(f)

# Generate narrative
narrative = generate_narrative(attestation)
print(narrative)
"
```

### 2. Generate narrative from raw milestone data

If no attestation file exists, build one from onchain data:

```bash
cd ~/weft
export ETH_RPC_URL="https://evmrpc-testnet.0g.ai"
export WEFT_CONTRACT_ADDRESS="0xcc768d56b0053b1b2df5391dde989be3f859474c"
export KIMI_API_KEY="<your_kimi_api_key>"

python3 agent/scripts/weft_collect_attestation.py \
  --rpc-url $ETH_RPC_URL \
  --weft-milestone $WEFT_CONTRACT_ADDRESS \
  --milestone-hash <MILESTONE_HASH> \
  --contract-address <CONTRACT_ADDRESS> \
  --out /tmp/attestation.json

python3 -c "
import json
from agent.lib.kimi_client import generate_narrative

with open('/tmp/attestation.json') as f:
    attestation = json.load(f)

narrative = generate_narrative(attestation)
print(narrative)
"
```

### 3. Example output

```
Your milestone "Deploy smart contracts" has been verified.

Evidence Summary:
- Contract deployed at 0x1234...5678 (confirmed at block 12,345,678)
- 147 unique wallets interacted during the 7-day measurement window
- All 3 verifiers agreed on the outcome
- Evidence root: 0xabc123...

The milestone passed verification. Funds (3.5 ETH) are now available
for release. Visit weft.build/project/0xabc to initiate payout.
```

## Pitfalls

- **No KIMI_API_KEY:** Falls back to raw JSON output. Get a key from https://platform.moonshot.cn
- **Rate limits:** Kimi API has rate limits. For batch verification, add delays between calls.
- **Context window:** The 128k context is more than enough for any attestation. No truncation needed.
- **Language:** Kimi defaults to the language of the input. English input → English narrative.

## Verification

The narrative should mention:
1. The milestone hash or project name
2. Specific numbers (unique callers, block numbers)
3. The verdict (verified/failed)
4. Next steps (release, refund, etc.)
