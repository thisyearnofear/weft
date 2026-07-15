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
| 0:00–0:20 | Problem: post-award review queues — money stuck until evidence clears. Weft sits **beside Fluxx/Foundant/your GMS**, not instead of it. |
| 0:20–0:45 | Open Console Wallet — party, **CBTC balance**. Fund faucet if needed. |
| 0:45–1:10 | `/canton` as **Issuer** — create milestone (settlement asset = CBTC). |
| 1:10–1:35 | Switch to **Funder** — show balance before → Stake 0.01 CBTC → balance after + `lastTransferRef`. |
| 1:35–2:10 | **Verifier** ×2 checklist verdicts → quorum finalize (agentic attestation, deterministic gate). |
| 2:10–2:40 | **Issuer** Release — CBTC pays builder; show builder balance increase. |
| 2:40–3:00 | Close: need-to-know parties, Devnet DAR, existing Weft EVM credibility on snel-bot; nuncio runs Canton. |

## Deck one-pager bullets

1. ICP: program officers — agent beside GMS already paid for  
2. Proof artifact: verification receipt writeback (not “live on chain” badge)  
3. Agent: institutional checklist — not LLM judgment, not scope disputes  
4. Settlement: Canton Devnet optional back-end when capital is escrowed  


## Live links to paste in submission

- Product: `/canton`  
- Repo: https://github.com/thisyearnofear/weft  
- Devnet runbook: `canton/DEVNET_RUNBOOK.md`  
- This script: `canton/DEMO.md`  
