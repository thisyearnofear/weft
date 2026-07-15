# Weft on Canton — post-award settlement lab

**Commercial lead:** sit beside the buyer’s grant management SoR (see
[`BUSINESS_BRIEF.md`](BUSINESS_BRIEF.md)). Canton / CBTC is the private settlement
back-end for pilots — not the homepage pitch.

| Layer | Location |
|---|---|
| Daml contracts | [`daml/Weft/Milestone.daml`](daml/Weft/Milestone.daml) |
| Python settlement adapter | [`../agent/lib/canton_client.py`](../agent/lib/canton_client.py) |
| Shared HTTP handlers | [`../agent/lib/canton_http.py`](../agent/lib/canton_http.py) — `/canton/ingest`, `/canton/receipt/<id>` |
| GMS receipt shape | [`../agent/lib/domain/receipt.py`](../agent/lib/domain/receipt.py) |
| Shared domain / protocol | [`../agent/lib/domain/`](../agent/lib/domain/), [`../agent/lib/settlement.py`](../agent/lib/settlement.py) |
| Status API | `weft_canton_api.py` :9020 |
| UI | `/canton` — program officer ingest + receipt download |
| Frontend types | [`../frontend/src/lib/milestone-view.ts`](../frontend/src/lib/milestone-view.ts) |

## GMS webhook (primary integration)

```bash
curl -sS -X POST http://127.0.0.1:9020/canton/ingest \
  -H 'Content-Type: application/json' \
  -d '{
    "externalRef": "fluxx-grant-42",
    "autoVerdict": true,
    "evidence": {
      "documentHash": "0xabab…",
      "deliveryConfirmed": true,
      "invoiceSettled": true,
      "checklistItemsPassed": 3,
      "checklistItemsRequired": 3
    }
  }'

curl -sS "http://127.0.0.1:9020/canton/receipt/gms-fluxx-grant-42"
```

Write `verificationReceipt.writeback.suggestedFields` onto the grant record in the GMS.

## SDK (required)

- Prefer **dpm 3.4.11** on the Canton build host (see **`OPS.local.md`**, gitignored)
- Canton API: `weft_canton_api.py` (default **:9020**); EVM Weft status stays on the edge host (**:9010**)
- Template for new machines: [`OPS.local.md.example`](../OPS.local.md.example)

```bash
export PATH="$HOME/.dpm/bin:$PATH"
cd canton && dpm build
./scripts/onboard_devnet.sh
curl http://127.0.0.1:9020/health
```

Frontend: set `CANTON_API_URL` in gitignored `frontend/.env.local`.

## Daemon (institutional checklist)

```bash
export WEFT_SETTLEMENT_RAIL=canton
python3 agent/scripts/weft_daemon.py --once
```

## Docs in this folder

- [BUSINESS_BRIEF.md](BUSINESS_BRIEF.md) — ICP, SoR thesis, data
- [PILOT_PLAN.md](PILOT_PLAN.md) — SoR-first pilot steps
- [PILOT_TARGETS.example.md](PILOT_TARGETS.example.md) — blank target list (copy privately)
- [DEVNET_RUNBOOK.md](DEVNET_RUNBOOK.md) — Devnet, CBTC faucet
- [DEMO.md](DEMO.md) — demo shot list
