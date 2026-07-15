# Pilot plan — Weft Canton institutional rail

## Step 1 — Party + package on Devnet

- Allocate parties: Issuer, Builder, Funder, VerifierA, VerifierB, Auditor.
- Build and upload `weft-canton-milestone` DAR to the Canton Devnet validator.
- Record party IDs in `canton/.ledger/parties.json` and ledger refs in `deployed.json`.

**Integrations:** Canton Devnet validator, Daml SDK (`daml build` / upload-dar).

## Step 2 — One live milestone workflow

- Issuer creates milestone via UI (`/canton`) or `POST /canton/action`.
- Funder stakes.
- Agent or Verifier submits institutional checklist verdict (`canton.institutional_checklist.v1`).
- Second verifier reaches quorum → finalize → Issuer releases.

**Integrations:** `agent/lib/canton_client.py`, `agent/lib/canton_http.py`,
`WEFT_SETTLEMENT_RAIL=canton` daemon (`CANTON_EVIDENCE_DIR` or ledger `pendingEvidence`),
`weft_canton_api.py` (:9020).

## Step 3 — Pilot ops pack

- Export audit view for Observer/Auditor (status API list by party).
- Agree evidence checklist fields with the pilot issuer (document hash, delivery, invoice).
- Decide go-live fee (success % vs flat pilot).

**Integrations:** Optional JSON API URL (`CANTON_JSON_API_URL`), Hermes skill later (out of scope for week-1 MVP).
