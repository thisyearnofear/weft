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

### The contrarian secret

Most agent startups in 2026 use an LLM to judge work. Weft does the opposite: the LLM only
narrates, **deterministic evidence rules decide**. Payment decisions must be auditable — no
LLM hallucination risk on capital release. This is the philosophical core of the project
and the defensible secret.

### Thiel / PG framing

| Lens | Weft's read |
|---|---|
| **Creative monopoly** | Define the category "post-award verification rail" rather than compete in GMS or escrow. Own a small market first. |
| **Last mover advantage** | Verifiers, 0G evidence archive, ENS reputation schema, Canton receipt writebacks all compound. The longer the system runs, the harder to displace. |
| **The secret** | "Milestone payment decisions should be made by deterministic evidence rules, not LLM judgment or human committees." Contrarian in 2026. |
| **10x improvement** | vs manual review queues: 10x speed (hours, not weeks) + audit trail. vs traditional verification committees: 10x transparency. |
| **Schlep taste (PG)** | Take on real schleps: institutional verification, escrow, FHE sealed ballots, AXL peer transport, 0G bundle provenance. Most startups avoid these. |
| **Do things that don't scale (PG)** | Free 0% daemon tier, CLI builder onboarding script ("alpha"), founder-led pilot deployments. Classic wedge. |

### Right pitch vs wrong pitch

| | Wrong pitch | Right pitch |
|---|---|---|
| Lead with | Canton / CBTC / escrow rails | Cut post-award review load; receipt in your GMS |
| Buyer lives in | Weft UI | Fluxx / Foundant / Salesforce (already paid) |
| Proof | "Live on testnet" badge | Pilot metric: hours from claim → tranche decision |
| Settlement | The product | Optional private back-end |
| Verdicts | "AI judges your work" | Deterministic evidence rules; LLM only narrates |

## Distribution

A technically excellent product with no engineered distribution is fighting uphill. Weft's
distribution plan, in priority order:

1. **Sponsor-side wedge.** Don't sell to builders; sell to sponsors who require Weft
   verification for their grantees. Sponsor mandates create builder demand — the buyer pulls
   builders in, not the other way around. This is the highest-leverage move because it
   flips the GTM from "push to builders" to "pull from sponsors."
2. **Canton receipt as marketing.** Every Canton receipt written back into a buyer's GMS is
   Weft-branded. The receipt IS the marketing surface — embedded in existing institutional
   workflows, not a separate UI to drive traffic to. Every receipt in a sponsor's GMS is a
   permanent Weft touchpoint inside the buyer's existing system.
3. **Portable ENS attestations.** Builders who get verified carry a portable attestation on
   their ENS name. When displayed on portfolios, resumes, or other sponsor pages, the
   attestation itself surfaces Weft. This is the builder-side virality loop.
4. **Social proof bot (planned).** A Farcaster/Twitter bot that auto-verifies public
   milestone claims and posts the attestation in reply — turns every public milestone
   announcement into a Weft touchpoint. Low effort, high surface area.
