# Business brief — Weft Canton rail

## ICP

**Institutional funders and program issuers** who finance milestone delivery (grants, R&D carve-outs, supply-chain advances) but cannot put prices, counterparties, or open stakes on a public chain.

This is Weft’s **primary** commercial ICP. The public EVM builder rail (0G Testnet) is a crypto-native wedge and demo surface — not the enterprise buyer.

## Use case

1. Issuer creates a private milestone (deliverable + deadline + authorized verifiers).
2. Funder stakes capital visible to parties that need to know — not the public.
3. Autonomous / agent verifiers submit evidence hashes and verdicts against the institutional checklist template.
4. At quorum, capital releases to the builder (or refunds to funders) atomically on Canton.

## Who pays

| Who | Pays for | Model |
|---|---|---|
| Funders / issuers | Verification + settlement reliability | Success fee (aligned with Weft’s % of released capital) and/or pilot SaaS |
| Builder wedge (EVM) | Optional crypto-native demos | Existing Hermes / daemon tiers |

## Why Canton

- **Need-to-know privacy** between issuer, funder, verifier, auditor — critical for institutional workflows.
- **Atomic multi-party settlement** of stake + release without public mempool leakage of positions.
- Complements (does not replace) Weft’s agent verification layer: agents still produce attestations off-ledger; Canton settles privately.

## What agents verify (and what they don’t)

Agents evaluate a **fixed evidence template** (`canton.institutional_checklist.v1`): document hash, delivery confirmed, invoice settled, checklist items. Scope ambiguity and subjective quality disputes are out of band.

## Positioning vs EVM Weft

| | EVM Weft (wedge) | Canton Weft (primary) |
|---|---|---|
| Users | Builders, crypto sponsors | Institutions, program offices |
| Privacy | Public + optional FHE ballots | Party-scoped ledger visibility |
| Evidence | Deployment + usage threshold | Institutional checklist |
| Network honesty | 0G Testnet / Sepolia demos | Canton Devnet pilot |
| IDs | `milestoneHash` onchain | Separate Canton `milestoneId` / contract IDs (v1) |
