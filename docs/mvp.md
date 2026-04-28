# Weft MVP Spec

This document defines the **single deterministic milestone template** and **attestation schema** used for the initial Weft end-to-end demo.

## Goals (MVP)

1. Deterministic verification (recomputable by anyone)
2. Multi-verifier quorum (2-of-3)
3. Permanent evidence pointer (0G Storage root hash / content hash)
4. Clear onchain events for indexers + agents

Non-goals for MVP:
- generalized “creative” verification across arbitrary deliverables
- Uniswap routing / revenue sharing beyond basic milestone release
- complex dispute / appeals

---

## Milestone Template: `DEPLOYED_AND_100_UNIQUE_CALLERS_7D`

**Intent:** fund a builder to deploy a contract and demonstrate early usage.

### Inputs (Project/Milestone Metadata)

These fields are referenced by offchain verifiers and included in the attestation.

```json
{
  "templateId": "DEPLOYED_AND_100_UNIQUE_CALLERS_7D",
  "chainId": 16600,
  "contractAddress": "0x0000000000000000000000000000000000000000",
  "deadline": 1710000000,
  "measurementWindowSeconds": 604800,
  "uniqueCallerThreshold": 100,
  "notes": "Optional human-readable milestone description"
}
```

### Deterministic Success Rule

A milestone is **verified = true** iff:

1. `contractAddress` has bytecode deployed at/after creation, and
2. the number of **unique EOAs** (unique `tx.from`) that successfully call the contract **within the measurement window** is `>= uniqueCallerThreshold`.

Notes:
- “Unique callers” is measured from onchain data (logs/transactions) and is verifiable via RPC.
- The LLM (Kimi) may generate narrative summaries, but the boolean verdict must be derivable from the evidence.

---

## Attestation Schema (stored in 0G Storage)

An attestation is the canonical “evidence bundle” for a verifier’s evaluation.

### `attestation.json`

```json
{
  "schemaVersion": 1,
  "weft": {
    "projectId": "0x…",
    "milestoneHash": "0x…",
    "templateId": "DEPLOYED_AND_100_UNIQUE_CALLERS_7D"
  },
  "inputs": {
    "chainId": 16600,
    "contractAddress": "0x…",
    "deadline": 1710000000,
    "measurementWindowSeconds": 604800,
    "uniqueCallerThreshold": 100
  },
  "evidence": {
    "deployment": {
      "contractAddress": "0x…",
      "codeHash": "0x…",
      "blockNumber": 123456
    },
    "usage": {
      "windowStart": 1710000000,
      "windowEnd": 1710604800,
      "uniqueCallerCount": 123
    }
  },
  "verdict": {
    "verified": true,
    "reason": "unique callers threshold met"
  },
  "narrative": {
    "summary": "Optional human-readable synthesis (may be produced by Kimi)"
  },
  "verifier": {
    "nodeAddress": "0x…",
    "signature": "0x…"
  },
  "timestamps": {
    "attestedAt": 1710604800
  }
}
```

### Evidence Root (`evidenceRoot`)

Onchain we store a single `bytes32 evidenceRoot` which is a content-addressed pointer to the full evidence bundle in 0G Storage (or a deterministic hash for early local demos).

