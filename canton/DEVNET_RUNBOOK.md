# Canton Devnet runbook

Machine-specific SSH hosts, IPs, and disk policy live in **`OPS.local.md`** (gitignored).  
Start from [`OPS.local.md.example`](../OPS.local.md.example) if you don't have a copy.

## SDK (Daml 3.x)

| Tool | Notes |
|---|---|
| Preferred CLI | [`dpm`](https://docs.digitalasset.com/build/3.4/dpm/dpm.html) |
| Pin | [`canton/daml.yaml`](daml.yaml) → **`sdk-version: 3.4.11`** |
| Build | On the Canton build host from `OPS.local.md` — not on a low-disk EVM edge box |

```bash
export PATH="$HOME/.dpm/bin:$PATH"
cd canton && dpm build
```

Use [Digital Asset Build 3.4](https://docs.digitalasset.com/build/3.4/) — not docs.daml.com 2.x.

## Host roles (generic)

| Role | Responsibility |
|---|---|
| **Canton build host** | `dpm` 3.4.x, DAR builds, `weft_canton_api.py` (default port **9020**) |
| **EVM edge host** | Existing Weft status API (default **9010**) — leave other tenants' LocalNets alone |
| **Laptop** | Git/UI only; no multi-GB Daml SDK |

Frontend: set gitignored `CANTON_API_URL` to the Canton API (or SSH tunnel to `:9020`).

## CBTC + Console Wallet

- Faucet: https://cbtc-faucet.bitsafe.finance/
- Docs: https://docs.bitsafe.finance/developers
- Console Wallet Devnet: https://devnet.consolewallet.io
- CC contact: `@mrlp8`
- Mentor: https://calendar.app.google/X9TtEmne43FMw9Fx6

```bash
./canton/scripts/onboard_devnet.sh
# Edit canton/.ledger/parties.json with real party IDs (name::hex)
# Fill canton/.ledger/cbtc.env from cbtc.env.example
```

## Environment

```bash
export CANTON_NETWORK=devnet
export CANTON_JSON_API_URL="https://<your-validator-json-api>"
export CANTON_CBTC_INSTRUMENT_ID="<bitsafe-instrument-id>"
export CANTON_ISSUER_PARTY="<party-id>"
export CANTON_BUILDER_PARTY="<party-id>"
export CANTON_FUNDER_PARTY="<party-id>"
export CANTON_VERIFIER_A_PARTY="<party-id>"
export CANTON_VERIFIER_B_PARTY="<party-id>"
export CANTON_AUDITOR_PARTY="<party-id>"
export CANTON_VERIFIER_PARTY="$CANTON_VERIFIER_A_PARTY"
export CANTON_LEDGER_STORE="$(pwd)/canton/.ledger/milestones.json"
export WEFT_SETTLEMENT_RAIL=canton
```

## Demo

See [DEMO.md](DEMO.md) for the 3-minute shot list (wallet → faucet/stake CBTC → verdict → release).

## Submission checklist

- [ ] DAR built with **3.4.11** and uploaded to **Devnet**
- [ ] Real party IDs in `parties.json` (Console Wallet)
- [ ] CBTC balances move in demo (stake / release)
- [ ] Live `/canton` UI + Canton API link
- [ ] Deck + [DEMO.md](DEMO.md) + this runbook
- [ ] Team `OPS.local.md` filled for the next person on the project
