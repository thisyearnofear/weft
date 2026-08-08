# KeeperHub — Agents Onchain Hackathon Submission

**Project:** Weft — Autonomous milestone verifier; KeeperHub executes the onchain verdict  
**Deadline:** 2026-08-13  
**Repo:** https://github.com/thisyearnofear/weft  
**Live demo:** https://weft.thisyearnofear.com/recovery  

---

## One-line pitch

Weft agents collect deterministic evidence, reach consensus, then **execute `submitVerdict()` via KeeperHub MCP** — the last mile from agent decision to onchain settlement.

---

## KeeperHub integration surfaces

| Surface | Status | Where |
|---|---|---|
| **MCP** (`execute_contract_call`, `get_direct_execution_status`, `get_execution`) | ✅ Implemented | `agent/lib/keeperhub_mcp.py`, `KEEPERHUB_TRANSPORT=mcp` |
| **REST direct execution** | ✅ Updated to `/api/execute/contract-call` | `agent/lib/keeperhub_client.py` |
| **Workflow builder template** | ✅ Importable JSON | `docs/keeperhub/weft-verdict-workflow.json` |
| **Onboarding starter (PR to KeeperHub)** | ✅ Ready | `docs/keeperhub/starter-template.md` |
| **Audit trail** | ✅ `keeperhub_audit.json` per attestation | `execute_verdict()` out_dir |
| **Reliability demo** | ✅ Chaos `kill_keeperhub` + retry | `/recovery` |

---

## Demo milestone (0G Galileo, chain 16602)

| Field | Value |
|---|---|
| **Milestone hash** | `0xb643d0a8223cf278a77e2dfe82e6d20e6f641335a8ccae71daaf6a94936bd7a2` |
| **Contract** | `0x9f66158c560ce5c8b40820fdcd2874ff8d852192` |
| **Create tx** | [`0xbe4b1388…8997e`](https://explorer-testnet.0g.ai/tx/0xbe4b1388a2a224af1fffc5a695b0b8fe5e309f4fe64109d93c3e57353a38997e) |
| **Stake tx** | [`0xf1c826a8…0c82`](https://explorer-testnet.0g.ai/tx/0xf1c826a886397e25068af95ef9a7e70580760d327716a360037cf87053b50c82) |
| **Verdict tx (cast fallback)** | [`0x6f360306…c549`](https://explorer-testnet.0g.ai/tx/0x6f3603063ec6abce952968ce15a810e315faa54a2eaaaa354e64b1a89783c549) |

Evidence root: `0xb33d6ae74c86c454a6ff1343080b54d2d540af29dc14f178317cccaab37e3859`

### KeeperHub proof txs (0G Galileo, org wallet)

Org wallet: `0xfafcc3e54c344288bb73ca472d913ffe853f05a0` · chain **16602** · verified 2026-08-08 after KeeperHub RPC fix.

| Action | executionId | Tx |
|---|---|---|
| **MCP `stake(bytes32)`** (primary hackathon proof) | `muoaanjmlvcx2nhx51bls` | [`0xd27b96ed…0138e`](https://chainscan-galileo.0g.ai/tx/0xd27b96ed9ee32147e44c5fa8ce546e4798dfc4aff63ed8876994499baaf0138e) |
| MCP `execute_transfer` | `2cfjcw0enjte47o1t9s5m` | [`0x721031b4…e95e`](https://chainscan-galileo.0g.ai/tx/0x721031b4753433fc62ab509b22cf84fa57ee640533d5bfe1426e3fda3956e95e) |
| CLI `kh ex t` | `rzs2n3qfd6cda73nloaul` | [`0xcb8230fc…a84`](https://chainscan-galileo.0g.ai/tx/0xcb8230fc35b5ef8f6798196642e55342b351a925ba49fef6d243cc205aea4a84) |

Stake target milestone (fresh deadline): `0x709ab5f0c3ddd703a9ce74a4156840204df267bc5812dbdbb96e1eafd4d99891` · create tx [`0xe34ee1fe…a033c`](https://chainscan-galileo.0g.ai/tx/0xe34ee1fe34c26eaf0205a9615f325275ab73b0fa29fb78261c86dafb4b2a033c)

---

## Reproduce MCP path

```bash
cp .env.example .env.local   # fill KEEPERHUB_API_KEY (kh_ org key)
export KEEPERHUB_TRANSPORT=mcp
export CHAIN_ID=16602

# Preflight (simulate only)
python3 agent/scripts/weft_keeperhub_mcp_smoke.py

# Full verifier cycle
python3 agent/scripts/weft_daemon.py --once --use-keeperhub

# Audit artifact
cat agent/.attestations/0xb643d0a8…/keeperhub_audit.json
```

---

## Demo video script (~2:30)

1. **Problem (20s)** — Milestone escrow needs an agent that *executes*, not just decides.
2. **Evidence (30s)** — Show demo milestone on [0G explorer](https://explorer-testnet.0g.ai); daemon log: evidence collected, `verified=false`, evidence root.
3. **KeeperHub MCP (60s)** — Terminal: `KEEPERHUB_TRANSPORT=mcp python3 agent/scripts/weft_keeperhub_mcp_smoke.py` (simulate). Then daemon `--once`; open `keeperhub_audit.json` with `transport: "mcp"`, `execution_id`, explorer link.
4. **Reliability (30s)** — `/recovery` → Kill KeeperHub → watch retry → verdict still lands.
5. **Close (10s)** — Agent thinks; KeeperHub acts.

_Video URL: (paste Loom/YouTube link at submission)_

---

## Onboarding bounty PR

Upstream PR (copy from this repo):

- `docs/keeperhub/starter-template.md` → `KeeperHub/keeperhub/docs/examples/weft-starter.md`
- `docs/keeperhub/weft-verdict-workflow.json` → `KeeperHub/keeperhub/docs/examples/weft-verdict-workflow.json`

Documents: kh_ vs wfb_ keys, simulate→idempotency write sequence, 0G chain ID `16602`, org + wallet setup.

---

## Blocker — resolved

✅ **API key + MCP auth** — org-scoped `kh_` key; MCP session + simulate paths work.

✅ **0G chain** — chain ID `16602` enabled on KeeperHub.

✅ **Org wallet funded** — `0xfafcc3e54c344288bb73ca472d913ffe853f05a0` on Galileo.

✅ **Broadcast** — KeeperHub fixed an RPC-level gas-estimation bug on 0G (2026-08-08, Joel). MCP `stake()` + transfers confirmed onchain — see **KeeperHub proof txs** above.

**Tip:** Broadcast can take 2–3 minutes. If the HTTP client times out, replay with the same `idempotency_key` / `Idempotency-Key` — the execution may already be `completed`.

**Note:** `submitVerdict()` still simulates as `NotAuthorizedVerifier` from the org wallet unless that address is in `VerifierRegistry`. The **`stake()` MCP tx** above is sufficient hackathon proof of KeeperHub execution on Weft's live contract.

---

## Judging criteria mapping

| Criterion | Evidence |
|---|---|
| Executes via KeeperHub | MCP `stake()` tx [`0xd27b96ed…`](https://chainscan-galileo.0g.ai/tx/0xd27b96ed9ee32147e44c5fa8ce546e4798dfc4aff63ed8876994499baaf0138e) + client + audit JSON |
| KeeperHub surfaces | MCP tools + workflow JSON + starter doc PR |
| Reliability | `/recovery` chaos, cast fallback, SigNoz spans |
| Real-world use | Milestone verification on live 0G contract |
| Integration quality | Tests in `agent/test/test_keeperhub_mcp.py`, env-toggle transport |
