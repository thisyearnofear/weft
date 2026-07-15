# 3-minute demo script — Weft Canton × CBTC (HackCanton)

Record against **Devnet** (or nuncio mirror for rehearsal). Target: judges see wallet UX + CBTC balance deltas + private milestone settle.

## Props

- Live UI: `https://weft.thisyearnofear.com/canton` (or localhost → nuncio `:9020`)
- Console Wallet: https://devnet.consolewallet.io  
- CBTC faucet: https://cbtc-faucet.bitsafe.finance/  
- API health: `http://<nuncio>:9020/health`

## Shot list (≈180s)

| Time | Say / show |
|---|---|
| 0:00–0:20 | Problem: program offices cannot put tranche prices/counterparties on a public mempool. Weft’s primary rail settles **privately on Canton**; agents verify a checkable checklist. |
| 0:20–0:45 | Open Console Wallet — party, **CBTC balance**. Fund faucet if needed. |
| 0:45–1:10 | `/canton` as **Issuer** — create milestone (settlement asset = CBTC). |
| 1:10–1:35 | Switch to **Funder** — show balance before → Stake 0.01 CBTC → balance after + `lastTransferRef`. |
| 1:35–2:10 | **Verifier** ×2 checklist verdicts → quorum finalize (agentic attestation, deterministic gate). |
| 2:10–2:40 | **Issuer** Release — CBTC pays builder; show builder balance increase. |
| 2:40–3:00 | Close: need-to-know parties, Devnet DAR, existing Weft EVM credibility on snel-bot; nuncio runs Canton. |

## Deck one-pager bullets

1. ICP: program offices / institutional funders (primary market)  
2. Asset: **CBTC** moves app state (stake → release)  
3. Agent: institutional checklist — not LLM judgment, not scope disputes  
4. Infra: `dpm 3.4.11` + `weft_canton_api`; EVM wedge stays on testnet  


## Live links to paste in submission

- Product: `/canton`  
- Repo: https://github.com/thisyearnofear/weft  
- Devnet runbook: `canton/DEVNET_RUNBOOK.md`  
- This script: `canton/DEMO.md`  
