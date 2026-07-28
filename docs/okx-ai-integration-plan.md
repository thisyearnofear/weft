# Weft → OKX.AI Genesis Hackathon Integration Plan

**Goal:** Package Weft as an OKX.AI Agent Service Provider (ASP) and submit it for listing.

**Primary angle (MVP):** Weft exposes deterministic verification as **paid MCP tools** (Agent-to-MCP). Any OKX agent can pay-per-call to verify a milestone or generate a narrative.

**Secondary angle (v1.5):** Weft becomes a **neutral A2A escrow verifier** — when two OKX agents negotiate a task, they hire Weft to verify delivery and authorize escrow release.

**Important:** This plan is scoped to what is achievable before the OKX.AI Genesis deadline. The A2A escrow path is real but requires more research into OKX's Agent Payments Protocol (APP), X Layer, and Broker primitives. We lead with A2MCP because it is concrete and listable faster.

---

## 1. Executive Summary

Weft already has the core ingredients of an OKX.AI ASP:

| OKX.AI Requirement | Weft Asset |
|---|---|
| Autonomous agent service | `weft_daemon.py`, Hermes skills |
| MCP server | `GET /mcp/tools`, `POST /mcp/invoke` in `weft_status_api.py` |
| Real-world use case | Milestone verification / escrow release |
| Payment loop | Stripe Skills autonomous spend (needs x402 migration) |
| Onchain execution | KeeperHub + `cast send` fallback |
| Evidence + provenance | 0G Storage bundles, bundle manifest, ENS reputation |

The remaining work is **OKX-specific packaging**: adopt Onchain OS, wire the Agentic Wallet, implement x402 pay-per-call, and wrap Weft's verification logic as an OKX-native service.

---

## 2. OKX.AI Interaction Models We Will Support

### 2.1 Agent-to-MCP (A2MCP) — MVP
Standardized MCP tools that any OKX agent can call. Payment via x402 headers.

Planned tools:
- `weft.status(milestoneHash, contractAddress, chainId)` → free onchain milestone state
- `weft.verify(milestoneHash, contractAddress, chainId)` → paid deterministic evidence summary
- `weft.narrate(milestoneHash, ...)` → paid human-readable Builder Journey narrative
- `weft.attest(milestoneHash, evidenceBundle)` → paid signed attestation envelope

Implementation: HTTP API with MCP-compatible tool listing + x402 payment guards.

### 2.2 Agent-to-Agent (A2A) — v1.5
Weft acts as a neutral third-party verifier in an A2A escrow.

Flow:
1. Buyer agent and seller agent negotiate a task on OKX.AI
2. They escrow funds via OKX APP / Broker / X Layer
3. They delegate verification to Weft ASP
4. Weft collects deterministic evidence, produces verdict
5. Weft calls escrow contract to release or refund
6. Weft earns a verification fee from released capital

**Note:** This path requires concrete OKX APP/Broker documentation. We document the architecture now and implement once those contracts/APIs are confirmed.

---

## 3. Current Weft Architecture (Relevant Parts)

```
┌─────────────────────────────────────────────────────────────┐
│  Weft Agent (Hermes / Python daemon)                         │
│  ├── Skills: weft-verify, weft-status, weft-narrate, etc.   │
│  ├── MCP server: /mcp/tools, /mcp/invoke                    │
│  ├── Evidence collection: deployment, usage, GitHub          │
│  ├── Peer consensus: AXL P2P + signed envelopes            │
│  ├── Onchain execution: KeeperHub / cast send              │
│  └── Payment: Stripe Skills (earn→spend loop)              │
└─────────────────────────────────────────────────────────────┘
```

Key files:
- `agent/scripts/weft_status_api.py` — HTTP API + MCP server
- `agent/lib/keeperhub_client.py` — reliable onchain execution
- `agent/lib/stripe_skills_client.py` — autonomous spend loop
- `agent/lib/evm_settlement.py` — EVM settlement adapter
- `agent/skills/weft-verify/SKILL.md` — verification skill
- `agent/lib/verdict_envelope.py` — signed attestation envelopes

---

## 4. Integration Workstreams

### 4.1 Adopt OKX Onchain OS

Install the OKX skills package:

```bash
npx skills add okx/onchainos-skills --yes -g
```

Then wire the skills into `agent/hermes.config.yml`:

```yaml
skills:
  external_dirs:
    - /path/to/weft/agent/skills
    - /path/to/okx/onchainos-skills
```

This provides:
- `okx-agentic-wallet` — wallet lifecycle, balance, signing
- `okx-dex-market` — market data
- `okx-ai` — agent identity (ERC-8004) + task marketplace
- `okx-agent-payments-protocol` — x402/MPP payment flows
- `okx-defi` — DeFi integrations

Because Weft uses **Hermes**, these skills must be wired into `agent/hermes.config.yml` via `external_dirs` (the same way Weft's own skills are loaded). The daemon can also import the Python helpers when needed.

**Tasks:**
- [ ] Install `okx/onchainos-skills` in Weft dev environment
- [ ] Add OKX skills directory to `agent/hermes.config.yml` under `skills.external_dirs`
- [ ] Register Weft as an OKX agent and get ERC-8004 identity
- [ ] Create/link OKX Agentic Wallet
- [ ] Document required env vars: `OKX_API_KEY`, `OKX_SECRET_KEY`, `OKX_PASSPHRASE`

Hermes config example:
```yaml
skills:
  external_dirs:
    - /path/to/weft/agent/skills
    - /path/to/okx/onchainos-skills
```

### 4.2 Replace Stripe Skills with OKX Agentic Wallet + x402

Current state: `agent/lib/stripe_skills_client.py` handles autonomous spend via Stripe.

Target state:
- Incoming revenue lands in OKX Agentic Wallet
- Outgoing service payments use x402 protocol
- P&L reporting reads from onchain activity
- `PRIVATE_KEY` continues to be used for onchain verdicts; OKX Agentic Wallet is used for x402 receive/spend and A2A escrow interactions. The two wallets coexist.

**Tasks:**
- [ ] Create `agent/lib/okx_wallet_client.py` wrapper around Onchain OS wallet skill
- [ ] Refactor `stripe_skills_client.py` into a generic `payments.py` facade
  - `pay_for_service(service, amount, memo, milestone_hash)` — route to x402 when OKX is configured, Stripe otherwise
  - `fund_wallet_from_revenue(amount, source)` — route to OKX wallet when configured
- [ ] Keep Stripe fallback for non-OKX deployments
- [ ] Update `weft-treasury` skill and `/api/treasury` to read OKX wallet balance + x402 spend

### 4.3 Implement x402 MCP Server

Current MCP endpoints (`weft_status_api.py`):
- `chronicle`, `status`, `verify`

Target x402-wrapped endpoints:
- `GET /mcp/tools` lists tools with x402 pricing metadata for paid tools
- `POST /mcp/invoke/{tool}` returns `402 Payment Required` with `PAYMENT-REQUIRED` header when payment is required and missing
- Client retries with `PAYMENT-SIGNATURE` header
- Server verifies signature, executes tool, returns result + `PAYMENT-RESPONSE`

**Clarification:** OKX agents will call Weft's HTTP API. The API uses MCP-style tool discovery/invocation internally but is exposed as an paid HTTP endpoint with x402 headers.

**Tasks:**
- [ ] Add x402 middleware to `weft_status_api.py`
- [ ] Define pricing schema per tool:
  | Tool | Price | Currency |
  |---|---|---|
  | `status` | free | — |
  | `verify` | $0.10 | TBD (research OKX accepted token/chain) |
  | `narrate` | $0.50 | TBD |
  | `attest` | $0.25 | TBD |
- [ ] Implement signature verification using OKX Agentic Wallet
- [ ] Add `OKX_X402_ENABLED` env var to enable/disable

Reference implementation pattern:
```python
# Pseudo-code for x402 middleware
def handle_paid_invoke(tool, params, headers):
    price = TOOL_PRICING[tool]
    payment_signature = headers.get("PAYMENT-SIGNATURE")
    if not payment_signature:
        required = encode_base64_json({
            "amount": price,
            "currency": "USDC",
            "chain": "x_layer",  # confirm with OKX docs
            "destination": OKX_AGENTIC_WALLET_ADDRESS,
        })
        return 402, {"PAYMENT-REQUIRED": required}
    verify_payment(payment_signature)
    result = execute_tool(tool, params)
    return 200, {"result": result, "PAYMENT-RESPONSE": encode_base64_json({"settled": True})}
```

**Open research item:** Confirm which chains/tokens OKX.AI supports for x402 settlement. Likely X Layer, Base, or Arbitrum with USDC/USDG. Update pricing table after confirmation.

### 4.4 Implement A2A Escrow Verifier (v1.5) ✅ Architecture implemented, contracts pending

This is the flagship OKX.AI integration but depends on OKX APP/Broker details.
Research confirms OKX APP escrow is "coming soon" and contract addresses are not yet public.

**Implemented adapter:** `agent/lib/okx_escrow.py`
- `EscrowAdapter` protocol for pluggable escrow implementations
- `WeftMilestoneEscrowAdapter` — concrete fallback using WeftMilestone as escrow
- `OkxAppEscrowAdapter` — stub for OKX APP contracts once released
- `A2AVerifier` — orchestrates evidence collection + escrow settlement

**Still pending:** OKX APP escrow contract ABI/addresses; will swap in `OkxAppEscrowAdapter` when available.

**A2A flow Weft will support:**

```
Buyer Agent ──negotiate──▶ Seller Agent
       │                       │
       └── escrow funds ────────┘
       │
       └── hire Weft verifier
             │
             ▼
      Weft collects evidence
             │
             ▼
      Weft submits verdict to escrow
             │
             ▼
      Escrow releases/refunds
             │
             ▼
      Weft receives verification fee
```

**Tasks:**
- [ ] Research OKX APP escrow contract / Broker API
- [ ] Design OKX-compatible escrow interface in `agent/lib/okx_escrow.py`
- [ ] Support two escrow contract types:
  - OKX native escrow (once documented)
  - WeftMilestone as fallback escrow
- [ ] Implement `verify_and_release(task_id, escrow_address, seller_address, terms)` service
- [ ] Fee model: 2-3% of released capital, swept to OKX Agentic Wallet
- [ ] Add dispute escalation to OKX Evaluators when buyer/seller disagree

### 4.5 Register and List as ASP

**Tasks:**
- [ ] Create OKX.AI builder account
- [ ] Register Weft agent identity (ERC-8004)
- [ ] Submit ASP listing with:
  - Service name: "Weft — Deterministic Milestone Verification"
  - Description: "Verify agent-delivered tasks and authorize escrow release with auditable evidence"
  - Service type: A2A escrow verifier + A2MCP verification tools
  - Pricing: free status, paid verify/narrate/attest
  - Demo URL: https://weft.thisyearnofear.com
  - GitHub repo: https://github.com/thisyearnofear/weft
- [ ] Pass OKX internal review
- [ ] Go live on marketplace

### 4.6 Documentation and Demo

**Tasks:**
- [ ] Create `docs/okx-ai/README.md` with setup instructions
- [ ] Record 90-second demo video for X post
- [ ] Write X thread introducing Weft ASP
- [ ] Update main README with OKX.AI integration
- [ ] Add OKX.AI-specific env vars to `agent/hermes.config.yml`

---

## 5. Proposed File Changes

### New files

| File | Purpose |
|---|---|
| `agent/lib/okx_wallet_client.py` | OKX Agentic Wallet wrapper |
| `agent/lib/okx_escrow.py` | A2A escrow verifier logic (v1.5) |
| `agent/lib/x402_middleware.py` | x402 payment middleware for MCP |
| `agent/skills/weft-okx/SKILL.md` | Hermes skill for OKX.AI tasks |
| `docs/okx-ai/README.md` | Setup and usage guide |
| `docs/okx-ai/demo-script.md` | 90-second demo script |
| `frontend/src/app/okx/page.tsx` | OKX.AI landing page |

### Modified files

| File | Changes |
|---|---|
| `agent/scripts/weft_status_api.py` | Add x402 payment guards to `/mcp/invoke`; add `/okx/status`, `/okx/verify`, `/okx/release` endpoints |
| `agent/lib/stripe_skills_client.py` | Refactor into generic payment facade or add OKX routing |
| `agent/lib/keeperhub_client.py` | Add OKX chain support; route escrow calls |
| `agent/lib/evm_settlement.py` | Add OKX escrow adapter |
| `agent/hermes.config.yml` | Add OKX env vars and skills config |
| `README.md` | Add OKX.AI ASP section |
| `AGENTS.md` | Document OKX integration |

---

## 6. Implementation Timeline

**MVP (A2MCP listing): 3–4 weeks**
**v1.5 (A2A escrow): +3–4 weeks after MVP is live**

| Week | Focus | Deliverables |
|---|---|---|
| **Week 1** | Research & setup | OKX Onchain OS installed, Agentic Wallet created, agent identity registered; confirm x402 chain/token |
| **Week 2** | x402 MCP prototype | Paid `/mcp/invoke` endpoints, signature verification, OKX wallet receive/spend |
| **Week 3** | Polish & docs | `docs/okx-ai/README.md`, env var wiring, Hermes skill |
| **Week 4** | Submission | 90-second demo, X thread, ASP listing submitted |
| **Week 5–6** | A2A research | Map OKX APP/Broker contracts, design `okx_escrow.py` |
| **Week 7–8** | A2A implementation | Verify-and-release flow, fee sweep, Evaluator dispute path |

---

## 7. Environment Variables

Add to `agent/hermes.config.yml` and deployment docs:

```bash
# OKX.AI / Onchain OS
OKX_API_KEY=""
OKX_SECRET_KEY=""
OKX_PASSPHRASE=""
OKX_AGENTIC_WALLET_ADDRESS=""
OKX_X402_ENABLED="1"
OKX_X402_CHAIN="x_layer"  # confirm and update
OKX_X402_CURRENCY="USDC"  # confirm and update

# A2A escrow (v1.5)
OKX_A2A_ESCROW_CONTRACT=""
OKX_APP_BROKER_URL=""

# Existing Weft vars (still required)
ETH_RPC_URL=""
WEFT_CONTRACT_ADDRESS=""
PRIVATE_KEY=""           # kept for onchain verdict signing
VERIFIER_ADDRESS=""
KEEPERHUB_API_KEY=""
```

---

## 8. Submission Readiness Checklist

Before submitting to OKX.AI, confirm:

- [ ] OKX builder account created and KYC/business verification complete
- [ ] Agent identity (ERC-8004) registered
- [ ] Agentic Wallet funded with test/small amount
- [ ] `okx/onchainos-skills` installed and wired into Hermes
- [ ] At least one paid MCP tool executes end-to-end with x402
- [ ] Demo URL is publicly reachable
- [ ] 90-second demo video recorded and posted on X with #OKXAI
- [ ] ASP listing description, pricing, and support channels prepared
- [ ] Fallback plan if A2A escrow cannot be completed in time: lead with A2MCP only

---

## 9. Risks and Mitigation

| Risk | Impact | Mitigation |
|---|---|---|
| OKX review requires deeper platform integration than A2MCP | Submission rejected | Lead with simple, working A2MCP; add A2A later |
| x402 chain/token unsupported | Payment flow breaks | Research and confirm OKX docs before finalizing pricing |
| OKX APP/Broker contracts not public | A2A path blocked | Document architecture; fallback to WeftMilestone escrow demo |
| Agentic Wallet and `PRIVATE_KEY` conflict | Signing confusion | Keep them separate: `PRIVATE_KEY` for verdicts, OKX wallet for payments |
| Smart contract dependency on WeftMilestone | Hard to generalize | Design `okx_escrow.py` with pluggable escrow adapters from day one |
| 90-second demo too complex | Weak submission | Focus demo on one paid MCP call and one verification result |

---

## 10. 90-Second Demo Outline

**0:00–0:15 — Problem**
"When agents hire each other, how do you know the work was actually done? LLMs can hallucinate. Manual review is slow. Weft verifies with deterministic evidence."

**0:15–0:35 — MCP Tool Call**
Show an OKX agent calling Weft's paid `verify` tool. Display the `402 Payment Required` response, the signed retry, and the verified result.

**0:35–0:55 — Evidence**
Show the evidence Weft collected: contract deployment, unique callers, GitHub commits. Explain: no LLM judgment, auditable rules.

**0:55–1:15 — Payment & Treasury**
Show the x402 payment landing in the OKX Agentic Wallet. Show the treasury dashboard.

**1:15–1:30 — Close**
"Weft: the deterministic verifier for the agent economy. Hire it on OKX.AI."

---

## 11. Next Steps

1. **Install OKX Onchain OS** and register the Weft agent identity
2. **Create OKX Agentic Wallet** and capture credentials
3. **Confirm x402 chain/token** with OKX docs or support
4. **Prototype x402 pay-per-call** on a single MCP tool (`verify`)
5. **Record 90-second demo and submit ASP listing**

---

## 12. Implementation Notes

### x402 middleware (implemented)

- `agent/lib/x402_middleware.py` — dependency-light x402 server logic
  - Supports `exact` EVM scheme
  - Returns `402` + `PAYMENT-REQUIRED` for unpaid tools
  - Verifies `PAYMENT-SIGNATURE` via `TrustVerifier` (local demo) or `ExactEvmVerifier` (real EVM sig recovery when `eth_account` is available)
  - Tool pricing configured through env vars

- `agent/lib/okx_wallet_client.py` — OKX Agentic Wallet wrapper/stub
  - Falls back to existing `PRIVATE_KEY` when OKX skill not installed
  - Provides `OkxWalletClient` for signing x402 payment proofs
  - Degrades gracefully when `eth_account` is missing

- `agent/scripts/weft_status_api.py` — MCP server updated
  - `/mcp/tools` now exposes `pricing` metadata per tool
  - `/mcp/invoke` guards paid tools (`verify`, `narrate`, `attest`, `chronicle`) behind x402
  - `status` remains free
  - `_send_json` supports extra response headers for `PAYMENT-REQUIRED` / `PAYMENT-RESPONSE`

- `agent/test/test_x402_middleware.py` — unit tests covering 402 challenge, paid/free tools, signature mismatch

### How to test locally

```bash
cd /Users/udingethe/Dev/weft
python -m pytest agent/test/test_x402_middleware.py -v
python -m py_compile agent/lib/x402_middleware.py agent/lib/okx_wallet_client.py agent/scripts/weft_status_api.py
```

### Open before OKX submission

- Confirm x402 chain/token with OKX docs
- Replace `TrustVerifier` with real `ExactEvmVerifier(require_onchain=True)` once OKX wallet is configured
- Wire OKX Onchain OS skills into `agent/hermes.config.yml`
- Add A2A escrow adapter

*Plan created for OKX.AI Genesis Hackathon submission.*
