# Weft Architecture

See also: [Judge-Friendly Architecture Diagram](architecture-diagram.md)

## System Overview

Weft is an autonomous coordination layer that replaces four institutional primitives:

| Primitive | Replaced by |
|---|---|
| Identity / CV | ENS text records (portable, machine-readable) |
| Funding / equity | `WeftMilestone.sol` — milestone-staked ETH |
| Verification / managers | Hermes Agent + AXL consensus |
| Settlement / payroll | KeeperHub reliable execution (Uniswap routing deferred — see below) |

## Flow

```
Builder (ENS identity)
    │
    ▼ createMilestone() + stake()
WeftMilestone.sol (0G Chain)
    │
    ▼ deadline triggers
Hermes Agent (agent/lib/)
    │
    ├─ github_client.py          git commits/PRs
    ├─ mvp_verifier.py            deployment + usage signals
    ├─ kimi_client.py            narrative synthesis (optional)
    ├─ zero_storage.py           0G Storage evidence publish
    ├─ axl_client.py             peer broadcast (signed envelopes)
    ├─ peer_inbox.py             peer verdict tally
    ├─ keeperhub_client.py       reliable onchain execution
    │
    ▼ submitVerdict()
AXL consensus (2-of-3) ──► onchain verdict
                                    │
                                    ▼ release/refund via KeeperHub
```

## Contracts (`contracts/src/`)

| Contract | Purpose |
|---|---|
| `WeftMilestone.sol` | Milestone staking + 2-of-3 verifier quorum |
| `VerifierRegistry.sol` | Authorized verifier node registry |
| `interfaces/IKeeperHub.sol` | KeeperHub interface (stub) |
| `interfaces/IWeftMilestone.sol` | ABI interface for external callers |

## Agent Library (`agent/lib/`)

Single source of truth — all shared agent logic. All scripts import from here.

| Module | Purpose |
|---|---|
| `jsonrpc.py` | JSON-RPC client with file-based cache |
| `abi.py` | Pure ABI encoding/decoding helpers |
| `eth_rpc.py` | Low-level Ethereum RPC helpers |
| `weft_milestone_reader.py` | Reads `Milestones(bytes32)` from WeftMilestone |
| `weft_topics.py` | Event topic constants for WeftMilestone |
| `verifier_registry_reader.py` | Reads verifier list from VerifierRegistry |
| `mvp_verifier.py` | Deterministic evidence: deployment + usage + attestation |
| `github_client.py` | GitHub commits/PRs in milestone window |
| `kimi_client.py` | Kimi API for narrative generation (optional) |
| `zero_storage.py` | 0G Storage read/write (env: `ZERO_G_*`, falls back gracefully) |
| `ens_client.py` | ENS text record updates |
| `axl_client.py` | Multi-node broadcast shim (env: `AXL_PEERS`) |
| `peer_inbox.py` | Filesystem-based peer verdict aggregation |
| `verdict_envelope.py` | Signed envelope construction/verification |
| `keeperhub_client.py` | KeeperHub reliable onchain execution (env: `KEEPERHUB_API_KEY`, retry + gas opt + audit trail) |
| `indexer_client.py` | Unified indexer: tries 0G KV, falls back to onchain events |
| `deadline_scheduler.py` | Polls for milestones past deadline awaiting finalization |
| `metadata_reader.py` | Reads milestone metadata from 0G Storage |
| `bundle_manifest.py` | Deterministic bundle manifest (hashes + sizes) |
| `bundle_pack.py` | Packs attestation directory into `bundle.tar.gz` |

## Agent Scripts (`agent/scripts/`)

| Script | Purpose |
|---|---|
| `weft_daemon.py` | Autonomous verification loop (poll deadlines → attest → vote) |
| `weft_collect_attestation.py` | Collect evidence + build attestation JSON |
| `weft_verify_and_vote.sh` | E2E: collect evidence + submit onchain verdict |
| `weft_peer_server.py` | Receive peer broadcasts (POST /send) |
| `weft_sync_from_indexer.py` | Sync milestone state from indexer to local cache |
| `weft_verify_bundle.py` | Verify bundles via bundle_manifest.json |
| `weft_download_and_verify_bundle.py` | Download bundle.tar.gz from 0G by root and verify |
| `weft_status_api.py` | Read-only HTTP API for builders (milestone status) |

## KeeperHub Integration

The daemon uses KeeperHub as the primary execution path for onchain verdicts:

1. **Primary path**: `keeperhub_client.execute_verdict()` — submits via KeeperHub REST API with automatic retry, gas optimization, and audit trail
2. **Fallback**: raw `cast send submitVerdict()` — used when `KEEPERHUB_API_KEY` is not set

Configuration:

| Variable | Description |
|---|---|
| `KEEPERHUB_API_KEY` | API key (enables KeeperHub execution) |
| `KEEPERHUB_API_URL` | Optional API URL override |
| `KEEPERHUB_TIMEOUT` | Seconds to wait for tx confirmation (default: 120) |
| `KEEPERHUB_ENABLED` | Set to `"0"` to disable even if API key is set |

## AXL Peer Consensus

Multi-node verifier coordination:

- **Broadcast**: `axl_client.py` sends signed envelopes to `AXL_PEERS`
- **Receive**: `weft_peer_server.py` accepts POST /send, persists to `agent/.inbox/`
- **Corroboration**: `AXL_WAIT_FOR_PEERS=1` — node waits for `AXL_PEER_THRESHOLD` matching envelopes before voting
- **Consensus root**: `AXL_USE_CONSENSUS_ROOT=1` — deterministic `consensusRoot` submitted as `evidenceRoot`, proving the offchain signer set

Signed broadcast mode (`AXL_SIGN=1`, default): envelopes signed with `cast wallet sign`, verified via `cast wallet verify`. Authorized-peers mode (`AXL_REQUIRE_AUTHORIZED=1`): requires envelopes from onchain-registered verifier addresses.

## 0G Storage

Evidence and attestation bundles are published to 0G Storage:

- `PUBLISH_0G=1` — enables publishing
- `PUBLISH_0G_CONSENSUS=1` — uploads `consensus.json` with KV pointers
- `PUBLISH_0G_BUNDLE=1` — uploads full `bundle.tar.gz` with KV pointers

KV keys: `weft:milestone:<hash>:consensus`, `weft:milestone:<hash>:bundle`, `weft:consensus:<root>:bundle`

## Dependencies

- **0G Chain** — Deployment target (EVM-compatible)
- **Foundry** — Smart contract development + testing
- **Python 3** — Agent scripts (no external pip dependencies)
- **Next.js** — Frontend scaffold

## Deferred: Uniswap Revenue Routing

Architecture reserves a slot for Uniswap-based revenue routing (e.g., auto-converting milestone payouts from ETH to ERC-20 tokens, multi-hop swaps for token pair availability). This is **not yet implemented** — the current settlement path is plain ETH transfers via `release()` to `Split[]` recipients.

Uniswap routing will be revisited once there is real multi-token demand from builders and backers. Prerequisites before implementation:

1. ERC-20 stake support in `WeftMilestone.sol` (currently ETH-only)
2. Minimum payout thresholds to avoid gas exceeding revenue
3. Slippage guards for small-amount distributions

## Security

- Multi-sig verification (2-of-3 Hermes nodes)
- Time-locked release mechanism
- Evidence immutability via 0G Storage
- Reentrancy guards on release/refund
- KeeperHub audit trail for all onchain executions
- Signed AXL envelopes with authorized-peer verification