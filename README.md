# Weft

**Post-award verification beside the grant system you already pay for.**

Program officers run milestones in Fluxx, Foundant, AmpliFund, or Salesforce.
Weft checks a fixed evidence checklist and writes a verification receipt back
onto that grant record — so tranche decisions need not wait on a review queue.
Canton is an optional private settlement lab when capital is escrowed. A public
EVM builder wedge on 0G Testnet remains for crypto-native demos — not production money.

> *"Technology provides the warp. Liberal arts provide the weft."*
>
> In weaving, the **weft** is the horizontal thread that interlaces with the vertical warp
> to create fabric. In this protocol, raw data threads — evidence checklists, peer verdicts,
> settlement references — are woven into outcomes: verified milestones and capital released.

## Positioning

**The contrarian bet.** Most agent startups in 2026 use an LLM to judge work. Weft does the
opposite: the LLM only narrates, **deterministic evidence rules decide**. Payment decisions
must be auditable — no LLM hallucination risk on capital release. This is the philosophical
core of the project and the defensible secret.

**The wedge.** Don't compete with grant management systems (Fluxx, Foundant, AmpliFund,
Salesforce Nonprofit). Sit **beside** them: when a grantee marks a milestone complete, Weft
runs the checklist and writes a verification receipt back onto the grant record. Canton is
optional private settlement when capital is escrowed. A public EVM builder wedge on 0G
Testnet stays for crypto-native demos — not production money.

**The market shape.** Small market first (one program office), dominate it, expand outward.
Post-award verification is a niche with clear buyers (program officers) and recurring labor
pain (39% of grants teams spend 11–20 hrs/week on manual reporting; 14% spend 31–40 hrs).
That's the Thiel-style entry: a small market you can own, not a crowded one you compete in.

**Last mover advantage.** If Weft becomes the canonical verifier layer for milestone
escrow, latecomers face a coordination problem: verifiers, evidence archive, reputation
schema, and ENS records are already locked in. The longer the system runs, the harder it is
to displace.

## Surfaces

**https://weft.thisyearnofear.com**

| Surface | URL | Note |
|---|---|---|
| Program ops (primary) | [/canton](https://weft.thisyearnofear.com/canton) | GMS ingest + receipt · Canton Devnet pilot |
| Program dashboard | [/sponsor](https://weft.thisyearnofear.com/sponsor) | Public EVM demos |
| Verification Explorer | [/explorer](https://weft.thisyearnofear.com/explorer) | 0G Testnet milestones |
| Agent observatory | [/observability](https://weft.thisyearnofear.com/observability) | SigNoz-backed agent trace story |
| Builder create (wedge) | [/create-milestone](https://weft.thisyearnofear.com/create-milestone) | 0G Testnet — not prod |
| Agent Operations | [/operations](https://weft.thisyearnofear.com/operations) | Developer |

See [`canton/BUSINESS_BRIEF.md`](canton/BUSINESS_BRIEF.md) for ICP, SoR thesis, and pilot plan.

## Sealed-ballot consensus (Zama FHE)

When votes are public, the last verifier watches the first two and free-rides instead of
independently checking the work. We discovered this running the public version on another
testnet — verifier herding. You can't fix it with incentives, only with cryptography.

The fix: **Zama FHE sealed-ballot consensus.** Each verifier agent encrypts its vote in its
own process. The contract tallies homomorphically on Sepolia — no vote is ever decrypted.
Only the final verified/rejected boolean becomes publicly decryptable, and only after every
ballot is cast.

### Two contracts, live on Sepolia

**v1 — Addition-class FHE** (`FHE.add`, `FHE.ge`, `FHE.select`)

Each verifier encrypts a boolean ballot. The contract counts votes on ciphertext, checks
2-of-3 quorum on ciphertext, and branches on ciphertext.

- Contract: [`WeftMilestoneConfidential.sol`](contracts/src-fhe/WeftMilestoneConfidential.sol) — [`0x152d758d…d212`](https://sepolia.etherscan.io/address/0x152d758d496db7444a00a6b2c7fe254b9aced212)
- Demo: [Confidential demos on Explorer](https://weft.thisyearnofear.com/explorer#fhe-demos) — open v1 sealed ballot and decrypt

**v2 — Multiplication-class FHE** (`FHE.mul`, `FHE.and`, `FHE.add`, `FHE.ge`, `FHE.select`)

Each verifier encrypts **both** a ballot (0/1) **and** a confidence score (1–100). The
contract multiplies them on ciphertext — `weightedVote = FHE.mul(ballot, confidence)` —
accumulates a weighted tally, and requires **both** binary quorum (≥2 of 3) **and** weighted
quorum (≥100), combined with `FHE.and`. No vote, no confidence score, and no weighted tally
is ever decrypted. This is FHE multiplication, not just addition.

- Contract: [`WeftMilestoneConfidentialWeighted.sol`](contracts/src-fhe/WeftMilestoneConfidentialWeighted.sol) — [`0xcc2395ac…60f8`](https://sepolia.etherscan.io/address/0xcc2395ac3f70ace0c1828cb0a18b00da823760f8)
- Demo: [Confidential demos on Explorer](https://weft.thisyearnofear.com/explorer#fhe-demos) — open v2 weighted ballot and decrypt
- Sealed ballot tx (FHE.mul on Sepolia): see [SUBMISSION.md](SUBMISSION.md) for full tx links
- Tests: 5 forge-fhevm tests — [high confidence verified, low confidence rejected, binary gate required, inflated ballot clamped](contracts/test-fhe/WeftMilestoneConfidentialWeighted.t.sol)

### FHE operations used

| Operation | Where | Purpose |
|---|---|---|
| `FHE.add` | v1, v2 | Accumulate encrypted vote count / weighted tally |
| `FHE.ge` | v1, v2 | Quorum check on ciphertext (≥ threshold) |
| `FHE.select` | v1, v2 | Branch on ciphertext (set verified flag) |
| `FHE.mul` | v2 | Multiply ballot × confidence — both encrypted |
| `FHE.and` | v2 | Combine binary + weighted quorum gates on ciphertext |
| `FHE.eq` | v2 | Clamp ballot to {0, 1} on ciphertext |

## How it works

1. A sponsor or DAO defines a milestone and escrows capital
2. The builder works toward the objective
3. When the deadline passes, 3 verifier agents independently collect evidence (deployment check, unique callers, GitHub commits)
4. For confidential milestones, each agent encrypts its ballot (and confidence score) client-side via the Zama SDK
5. The contract tallies on ciphertext — quorum is checked without decrypting any vote
6. Capital releases automatically when quorum confirms delivery
7. The builder retains portable reputation tied to funded outcomes, attached to their ENS name

## Integration partners

| Partner | What Weft uses | Why it matters |
|---|---|---|
| **Zama** | FHEVM on Sepolia — sealed-ballot consensus with FHE.add, FHE.mul, FHE.ge, FHE.select, FHE.and | Verifier herding is cryptographically impossible — the core FHE claim |
| **0G** | 0G Chain, 0G Storage (KV + Log), indexer | Milestones, metadata, evidence roots, attestation bundles |
| **Gensyn / AXL** | Peer broadcast, signed verdict envelopes, offchain corroboration | Separate verifier nodes coordinate before voting; no central coordinator |
| **KeeperHub** | Reliable `submitVerdict()` execution with retry/audit trail | Agents reason about a verdict and still need a robust path to execute it onchain |
| **ENS** | Builder / verifier profile records | Human-readable identity and portable reputation |
| **Hermes + Kimi** | Managed agent layer, narrative generation, Builder Journey chronicles | Weaves raw data threads into meaningful fabric |
| **fal.ai** | Text-to-image — AI-woven milestone swatches + chronicle covers | Visual layer for the weaving motif |
| **0G Agentic ID (ERC-7857)** | Tokenize each verifier as an onchain agent with its track record embedded | The verifier reputation layer becomes a portable, tradeable onchain asset — deepens 0G integration and compounds the last-mover moat |

## Deployed contracts

**0G Galileo Testnet (Chain ID: 16602)** — `https://evmrpc-testnet.0g.ai`

| Contract | Address |
|---|---|
| WeftMilestone | `0x9f66158c560ce5c8b40820fdcd2874ff8d852192` |
| VerifierRegistry | `0x1356dd3f28461685ffd81d44f6ae9ae87937e34a` |

**Sepolia (Chain ID: 11155111)** — Zama FHEVM

| Contract | Address |
|---|---|
| WeftMilestoneConfidential (v1) | `0x152d758d496db7444a00a6b2c7fe254b9aced212` |
| WeftMilestoneConfidentialWeighted (v2) | `0xcc2395ac3f70ace0c1828cb0a18b00da823760f8` |
| VerifierRegistry (Sepolia) | `0xa7e74abb5c4c4fc70aff99bc4ac0b9f9bf6b5a66` |

## Verification loop (TestSprite S3)

Built with the [TestSprite CLI](https://github.com/TestSprite/testsprite-cli) as the checker in a
write → verify → fix → verify loop. Full agent-written log in [LOOP.md](LOOP.md).

**40 tests** across 3 project types:
- 14 frontend CLI tests — surface loads, API contracts, E2E user journey, chaos/resilience, onchain cross-checks
- 8 backend Python tests — schema validation + value cross-checks for all REST endpoints
- 12 MCP-generated Playwright tests — auto-generated from codebase analysis, executed locally
- 6 rerun tests after polish pass

**The loop caught a real bug** (iter 19): a backend test detected a wei-to-ETH conversion error in
the explorer API (`stakedEth` returned raw wei instead of ETH). The failure bundle pinpointed the
root cause, the fix was deployed, and the rerun confirmed the fix — the complete
write→verify→fix→verify cycle.

**CI/CD**: [.github/workflows/testsprite.yml](.github/workflows/testsprite.yml) reruns all tests
on every PR and fails the build if anything breaks.

## Documentation

- [Zama S3 submission details](SUBMISSION.md)
- [X thread + video script](docs/submissions/zama-s3-x-thread-and-video.md)
- [Technical reference](AGENTS.md) — architecture, agent layer, data model, env vars, scripts
- [Product plan & monetization](docs/product-plan.md)
- [MVP spec](docs/mvp.md)
- [Hackathon archive](docs/hackathons.md) — past submission materials
- [Build log](LOOP.md) — TestSprite verification loop
- [Known issues & feedback](docs/feedback.md)
- [0G Bridge Buildathon plan](docs/0g-bridge-buildathon.md) — wave-by-wave integration plan, Agentic ID (ERC-7857) play

## Distribution

A technically excellent product with no engineered distribution is fighting uphill.
Weft's distribution strategy:

- **Sponsor-side wedge.** Don't sell to builders; sell to sponsors who require Weft
  verification for their grantees. Sponsor mandates create builder demand — the buyer
  pulls builders in, not the other way around.
- **Canton receipt as marketing.** Every Canton receipt written back into a buyer's GMS is
  Weft-branded. The receipt IS the marketing surface — embedded in existing institutional
  workflows, not a separate UI to drive traffic to.
- **Portable ENS attestations.** Builders who get verified carry a portable attestation on
  their ENS name. When displayed on portfolios, resumes, or other sponsor pages, the
  attestation itself surfaces Weft.
- **Social proof bot (planned).** A Farcaster/Twitter bot that auto-verifies public
  milestone claims and posts the attestation in reply — turns every public milestone
  announcement into a Weft touchpoint.

## Quick start

```bash
# Install Foundry
curl -L https://foundry.paradigm.xyz | bash
foundryup

# Init dependencies
git submodule update --init --recursive

# Solidity tests
forge test

# FHE tests (requires FOUNDRY_PROFILE=fhe)
FOUNDRY_PROFILE=fhe forge test --match-contract WeftMilestoneConfidentialWeightedTest -vvv

# Python agent tests
python -m pytest agent/test/ -v

# Frontend (Next.js 16 + wagmi 3 + Zama relayer SDK)
cd frontend
npm ci --cache .npm-cache   # reads .npmrc for RainbowKit/wagmi peer alignment
npm run lint
npm run build
npm run dev                 # predev syncs Zama WASM/worker assets automatically
```

`frontend/.npmrc` sets `legacy-peer-deps=true` because RainbowKit 2.x peers on wagmi 2 while
Weft runs wagmi 3 until RainbowKit 3 ships on npm. Drop `.npmrc` after upgrading RainbowKit.

Zama Relayer SDK assets (UMD + WASM + workers) are copied into `public/zama/` by
`scripts/sync-zama-sdk.mjs` on `predev` / `prebuild`. If `node_modules` is absent, the script
falls back to existing `public/zama/` assets instead of failing the build.

See [AGENTS.md](AGENTS.md) for the full agent setup, environment variables, and demo scripts.

## AG Grid

[AG Grid](https://www.ag-grid.com/javascript-data-grid/getting-started/) (free Community edition) could make Weft's Verification Explorer and program dashboard sortable/filterable — letting program officers filter milestones by status, sort by deadline, or group by project without custom table code. The explorer and ops pages are fundamentally tabular milestone lists.

# SigNoz Observability

Weft can export verifier traces, metrics, and structured recovery events to SigNoz without
making OpenTelemetry a required runtime dependency. Install the optional exporter packages,
then configure SigNoz Cloud before running the daemon:

```bash
python3 -m venv .venv-signoz
.venv-signoz/bin/python -m pip install -r requirements-signoz.txt

export WEFT_OBSERVABILITY=signoz
export OTEL_SERVICE_NAME=weft-daemon
export OTEL_RESOURCE_ATTRIBUTES=service.name=weft-daemon,deployment.environment=demo
export OTEL_EXPORTER_OTLP_ENDPOINT=https://ingest.us2.signoz.cloud:443
export OTEL_EXPORTER_OTLP_HEADERS=signoz-ingestion-key=<ingestion-key>
export OTEL_EXPORTER_OTLP_PROTOCOL=http/protobuf
export WEFT_OTEL_EXPORT_TIMEOUT=3

# quick ingestion check, no Docker or chain RPC required
.venv-signoz/bin/python agent/scripts/weft_signoz_smoke.py

# populate demo panels and alert conditions
.venv-signoz/bin/python agent/scripts/weft_signoz_smoke.py --scenario verified --repeat 3
.venv-signoz/bin/python agent/scripts/weft_signoz_smoke.py --scenario rejected
.venv-signoz/bin/python agent/scripts/weft_signoz_smoke.py --scenario fallback
.venv-signoz/bin/python agent/scripts/weft_signoz_smoke.py --scenario degraded

# one-command hackathon demo data pack
agent/scripts/weft_signoz_demo.sh

# provision dashboard + alerts (service-account API key; OpenTofu or Terraform)
brew install opentofu   # if neither tofu nor terraform is installed
export SIGNOZ_ENDPOINT='https://modest-mosquito.us2.signoz.cloud'
export SIGNOZ_ACCESS_TOKEN='<service-account-api-key>'
agent/scripts/weft_signoz_provision.sh   # also writes frontend/.env.local

# real verifier run
.venv-signoz/bin/python agent/scripts/weft_daemon.py --once
```

For self-hosted SigNoz, set `OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4318`.
`casting.yaml` and `casting.yaml.lock` are kept for hackathon reproducibility and judge
reruns; active development can use SigNoz Cloud without running Docker locally. See
[the SigNoz hackathon scope](docs/signoz-hackathon-scope.md) for the dashboard, alert,
and demo plan. Dashboard/alerts are provisioned via [`signoz/terraform/`](signoz/terraform/)
and [`docs/signoz-demo-recording.md`](docs/signoz-demo-recording.md).

SigNoz Cloud has two separate credential types:

- Ingestion key: write-only telemetry key from Settings > Ingestion. Use this in
  `OTEL_EXPORTER_OTLP_HEADERS=signoz-ingestion-key=<ingestion-key>`.
- Service-account API key: query/MCP key from Settings > Service Accounts. Use this for
  `https://mcp.us2.signoz.cloud/mcp` with instance URL
  `https://modest-mosquito.us2.signoz.cloud`; do not use it as the ingestion key.

## License

MIT
