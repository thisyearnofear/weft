# Weft for OKX.AI Genesis Hackathon

> **Deterministic verifier for agent-to-agent work.**

Weft is an autonomous milestone-verification agent that reads onchain and offchain evidence, reaches multi-node consensus, and authorizes escrow release. It is a natural Agent Service Provider (ASP) for OKX.AI — starting with pay-per-call MCP tools and expanding to a trust layer for agent-to-agent (A2A) escrow.

## What Weft does

When agents hire other agents on OKX.AI, someone has to answer:

> “Was the work actually completed?”

Weft answers that deterministically:

- **Agent-to-MCP** — Other agents call Weft’s `verify`, `narrate`, `attest`, and `chronicle` tools, paying per call over x402.
- **Agent-to-Agent** — Weft acts as a neutral verifier in OKX.AI escrow: collects evidence, produces a verdict, and releases/refunds funds.

## Submission summary

| Field | Value |
|---|---|
| **ASP name** | Weft |
| **ASP type** | Agent-to-MCP (live) + Agent-to-Agent verifier (v1.5) |
| **Core problem** | Escrow verification for agent-native work |
| **Primary mode** | Agent-to-MCP pay-per-call |
| **Settlement** | x402 on X Layer (USDC) |
| **Demo** | `https://github.com/weft-finance/weft` (replace with deployed URL) |
| **Status** | Ready for OKX.AI listing; A2A escrow adapter is pluggable for APP contracts |

## Live infrastructure

- **MCP server**: `GET /mcp/tools`, `POST /mcp/invoke` in `agent/scripts/weft_status_api.py`
- **x402 middleware**: `agent/lib/x402_middleware.py`
- **OKX wallet wrapper**: `agent/lib/okx_wallet_client.py`
- **A2A escrow adapter**: `agent/lib/okx_escrow.py` (WeftMilestone fallback + OKX APP stub)
- **Hermes skills**: `agent/skills/weft-verify`, `weft-status`, `weft-narrate`, `weft-chronicle`

## Pay-per-call MCP tools

| Tool | Price (USDC) | What it returns |
|---|---|---|
| `verify` | 0.01 | Deterministic milestone verification (deployment + usage signals) |
| `narrate` | 0.05 | Human-readable verification narrative |
| `attest` | 0.025 | Signed attestation bundle |
| `chronicle` | 0.05 | Full Builder Journey chronicle + HTML card |
| `status` | free | Current milestone state |

Default network: **X Layer testnet (`eip155:195`)**. Mainnet: `eip155:196`.

## 90-second demo outline

1. **Hook (0–10s)** — “Agents hiring agents need a neutral judge. Weft is that judge.”
2. **Problem (10–25s)** — Show a fake OKX agent task with escrow at risk; LLM hallucination is dangerous for capital release.
3. **Solution (25–50s)** — Call `POST /mcp/invoke {tool: "verify", params: {milestoneHash}}`. Weft returns `verified` plus evidence; x402 `PAYMENT-REQUIRED` → `PAYMENT-SIGNATURE` → `PAYMENT-RESPONSE`.
4. **Proof (50–70s)** — Show multi-node AXL consensus, 0G evidence bundle, onchain `submitVerdict`.
5. **Meaning (70–90s)** — Weft makes agent-to-agent commerce safe; OKX agents can hire Weft today.

## Setup for local testing

```bash
# 1. Install OKX Onchain OS skills (optional but recommended)
npx skills add okx/onchainos-skills

# 2. Configure env
cp .env.example .env.local
# Edit .env.local and add:
# OKX_AGENTIC_WALLET_ADDRESS=0x...
# OKX_X402_NETWORK=eip155:195
# OKK_X402_CURRENCY=USDC

# 3. Run the Weft status API
python agent/scripts/weft_status_api.py --port 9010

# 4. Discover MCP tools
curl http://localhost:9010/mcp/tools

# 5. Call a paid tool (this will first return 402 Payment Required)
curl -X POST http://localhost:9010/mcp/invoke \
  -H "Content-Type: application/json" \
  -d '{"tool":"verify","params":{"milestoneHash":"0x..."}}'
```

## Environment variables

See `agent/hermes.config.yml` for the full list. The most important OKX.AI variables are:

```bash
OKX_AGENTIC_WALLET_ADDRESS  # receives x402 payments
OKX_X402_NETWORK            # eip155:195 (testnet) or eip155:196 (mainnet)
OKX_X402_CURRENCY           # USDC
OKX_X402_REAL_VERIFIER      # 0 = trust demo, 1 = EVM signature recovery
OKX_X402_RPC_URL            # X Layer JSON-RPC for real verification
OKX_X402_USDC_CONTRACT      # USDC contract on X Layer
OKX_A2A_ADAPTER             # weft_milestone | okx_app
```

## A2A escrow integration

Because OKX APP escrow contracts are not public yet, Weft ships a pluggable adapter:

- `WeftMilestoneEscrowAdapter` — uses Weft’s existing escrow as a fallback.
- `OkxAppEscrowAdapter` — stub; swap in once OKX publishes APP contract ABIs.

Switch adapters:

```bash
OKX_A2A_ADAPTER=weft_milestone python agent/scripts/weft_status_api.py
```

## Submission checklist

- [x] ASP solves a real OKX.AI use case (escrow verification)
- [x] MCP tools exposed over HTTP with x402 pay-per-call
- [x] Default settlement on X Layer + USDC
- [x] Deterministic verification rules (no LLM hallucination for verdict)
- [x] Pluggable A2A escrow adapter for future OKX APP integration
- [ ] OKX Onchain OS skills installed and Hermes wired
- [ ] OKX Agentic Wallet funded on X Layer testnet
- [ ] 90-second demo recorded and posted with `#OKXAI`
- [ ] ASP listing approved and live on OKX.AI

## Links

- Integration plan: `docs/okx-ai-integration-plan.md`
- Weft docs: `AGENTS.md`
- MCP server: `agent/scripts/weft_status_api.py`
- x402 middleware: `agent/lib/x402_middleware.py`
- A2A escrow adapter: `agent/lib/okx_escrow.py`
