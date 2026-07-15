# Pilot plan — post-award SoR + Weft

## Thesis

Win one program office by sitting **beside their grant management SoR**, not by asking
them to migrate capital UX onto Weft. Canton remains the private settlement lab.

## Step 0 — Pick the SoR (this week)

Target orgs that already run **one of**: Fluxx, Foundant, AmpliFund, Submittable,
Salesforce Nonprofit Cloud, SmartSimple, or a Salesforce+spreadsheet stack.

Pilot offer (one sentence): *When a grantee marks a milestone complete, Weft checks
your checklist and writes a verification receipt onto that grant record — so tranche
release doesn’t wait on a six-week review queue.*

Measure: **hours from “deliverable claimed” → “tranche decision.”**

## Step 1 — Wire ingest + receipt (week 1–2)

- `POST /canton/ingest` accepts GMS-shaped payload (`externalRef` + checklist evidence).
- Store `pendingEvidence` on the ledger milestone; daemon or `autoVerdict` evaluates
  `canton.institutional_checklist.v1`.
- `GET /canton/receipt/<milestoneId>` returns writeback JSON for the GMS.
- UI `/canton`: program-officer flow — attach evidence, download receipt (Canton wallet
  remains labeled pilot / Devnet).

**Integrations:** `agent/lib/canton_http.py`, `agent/lib/domain/receipt.py`,
`weft_canton_api.py` (:9020), frontend `/api/canton/*`.

## Step 2 — Devnet settlement rehearsal (parallel)

- Parties + DAR on Canton Devnet (existing runbook).
- Issuer / funder stake → quorum → release with CBTC mirror.
- Keep this as the **honest network label** for the deck, not the sales lead.

## Step 3 — Live GMS writeback (week 3–4)

- Map receipt fields to the pilot’s grant object (status, evidence hash, attestedAt,
  settlementRef).
- Start with webhook out + manual paste into GMS if API access is slow; automate once
  credentials exist.
- Agree checklist fields with the issuer; freeze the template for the pilot window.

## Step 4 — Pilot ops pack

- Auditor export (receipt JSON + timeline).
- Fee decision: flat pilot vs success % of released capital.
- Optional: folder watch (`CANTON_EVIDENCE_DIR`) for SharePoint/Drive as evidence *source*.

## Explicitly later

- Native Fluxx/Foundant connectors beyond webhook stub
- Generic Xero AP (portfolio sibling, not Weft)
- Expanding EVM builder marketing
