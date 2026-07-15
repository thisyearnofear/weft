# Weft on Canton — Institutional Primary Market

Private milestone capital for issuers and funders who need **need-to-know** visibility.
This is Weft’s primary GTM surface for program offices. The public EVM builder rail
(0G Testnet / `WeftMilestone.sol`) remains the crypto-native wedge.

| Layer | Location |
|---|---|
| Daml contracts | [`daml/Weft/Milestone.daml`](daml/Weft/Milestone.daml) |
| Python settlement adapter | [`../agent/lib/canton_client.py`](../agent/lib/canton_client.py) |
| Shared HTTP handlers | [`../agent/lib/canton_http.py`](../agent/lib/canton_http.py) |
| Shared domain / protocol | [`../agent/lib/domain/`](../agent/lib/domain/), [`../agent/lib/settlement.py`](../agent/lib/settlement.py) |
| Status API | `GET /canton/milestone/<id>`, `POST /canton/action` (`weft_canton_api.py` :9020) |
| UI | `/canton` (Issuer · Funder · Verifier · Observer) |
| Frontend types | [`../frontend/src/lib/milestone-view.ts`](../frontend/src/lib/milestone-view.ts) (mirrors `MilestoneViewModel`) |

## SDK (required)

- Prefer **dpm 3.4.11** on the Canton build host (see **`OPS.local.md`**, gitignored)
- Canton API: `weft_canton_api.py` (default **:9020**); EVM Weft status stays on the edge host (**:9010**)
- Template for new machines: [`OPS.local.md.example`](../OPS.local.md.example)

```bash
export PATH="$HOME/.dpm/bin:$PATH"
cd canton && dpm build
./scripts/onboard_devnet.sh
# Start / restart per OPS.local.md (systemd unit: scripts/weft-canton-api.service)
curl http://127.0.0.1:9020/health
```

Frontend: set `CANTON_API_URL` in gitignored `frontend/.env.local`.

## Daemon (institutional checklist)

```bash
export WEFT_SETTLEMENT_RAIL=canton
# Evidence: pendingEvidence on ledger, or JSON files, or demo:
# export CANTON_EVIDENCE_DIR=./evidence
# export CANTON_DEMO_EVIDENCE=1   # pilot only
python3 agent/scripts/weft_daemon.py --once
```

## Docs in this folder

- [BUSINESS_BRIEF.md](BUSINESS_BRIEF.md) — ICP, who pays, why Canton
- [PILOT_PLAN.md](PILOT_PLAN.md) — 2–3 pilot steps + integrations
- [DEVNET_RUNBOOK.md](DEVNET_RUNBOOK.md) — Devnet, CBTC faucet, generic host roles
- [DEMO.md](DEMO.md) — 3-minute pitch / demo shot list
