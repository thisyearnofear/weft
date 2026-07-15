# Business brief — Weft post-award program ops

## ICP

**Program officers and grant managers** who run post-award milestones — foundations,
government programs, corporate grant arms, research offices — and already pay for a
**grant management system of record** (Fluxx, Foundant, AmpliFund, Submittable,
Salesforce Nonprofit Cloud, or equivalent).

Weft sits **beside that SoR**: the agent verifies a fixed checklist when a deliverable
is claimed, then writes a **verification receipt** back onto the grant record. Private
settlement (Canton) is an optional back-end when capital is escrowed — not the pitch.

This beats “move onto escrow contracts / new rails” as a GTM shape. The EVM builder
rail (0G Testnet) stays a crypto-native demo wedge, not the enterprise buyer.

## Why this wedge (data)

| Signal | Why it matters |
|---|---|
| **39%** of grants teams spend **11–20 hrs/week** on manual entry, docs, reporting; **14%** spend **31–40 hrs** ([Euna 2026](https://eunasolutions.com/resources/2026-state-of-grants-management-report-blog/)) | Labor pain is large and recurring |
| ~half lack a centralized grant tracker; siloed finance/docs/email | Integration into the *existing* GMS beats inventing a new home |
| Grant management software ~**$2–3B**, ~**10%+ CAGR** | Buyers already fund this category |
| Research offices: **79%** saw payment paused/rejected for insufficient justification; many spent **15–45+ hrs** answering inquiries ([COGR 2025](https://www.cogr.edu/sites/default/files/Updated%20Transition%20Impact%20Slide%20Deck%20July%2014%2C%202025.pdf)) | Same shape as Weft: money stuck until evidence clears |

**Explicit non-goals for Weft commercial:** generic AP/Xero (crowded; portfolio sibling),
or “SharePoint agent” as the product (docs are an evidence channel, not the SoR).

## Product shape (SoR-first)

```text
GMS milestone / report marked complete
        │
        ▼
  POST /canton/ingest   (webhook from GMS or manual)
        │
        ▼
  institutional checklist evaluate
        │
        ▼
  verification receipt JSON  ──writeback──►  grant record in GMS
        │
        └── optional: Canton stake / release when capital is escrowed
```

1. Program officer’s system already holds the grant + milestone.
2. Evidence arrives (report PDF hash, delivery flag, invoice flag, checklist counts).
3. Weft evaluates `canton.institutional_checklist.v1` deterministically.
4. Receipt (status, evidence hash, quorum, settlement ref) is exported for the GMS.
5. If funds are escrowed on Canton, release/refund follows quorum.

## Who pays

| Who | Pays for | Model |
|---|---|---|
| Program / grants office | Time-to-tranche-decision + audit receipts | Pilot SaaS and/or success fee on released capital |
| Builder wedge (EVM) | Optional crypto demos | Hermes / daemon tiers |

## What agents verify (and what they don’t)

Agents evaluate a **fixed template**: document hash, delivery confirmed, invoice settled,
checklist items. Scope ambiguity and subjective quality disputes are out of band.

## Positioning

| | Wrong pitch | Right pitch |
|---|---|---|
| Lead with | Canton / CBTC / escrow rails | Cut post-award review load; receipt in your GMS |
| Buyer lives in | Weft UI | Fluxx / Foundant / Salesforce (already paid) |
| Proof | “Live on testnet” badge | Pilot metric: hours from claim → tranche decision |
| Settlement | The product | Optional private back-end |
