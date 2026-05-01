# Weft Architecture Diagram

```text
                                      ┌──────────────────────────────┐
                                      │         Builder / Team       │
                                      │   ENS identity + milestone   │
                                      └──────────────┬───────────────┘
                                                     │
                                      createMilestone│ stake
                                                     ▼
                              ┌──────────────────────────────────────────┐
                              │        WeftMilestone on 0G Chain         │
                              │ milestone escrow + verifier quorum       │
                              └──────────────────┬───────────────────────┘
                                                 │
                                       deadline passed / pending
                                                 ▼
                   ┌─────────────────────────────────────────────────────────────┐
                   │                    Weft Verifier Swarm                     │
                   │                                                             │
                   │  Verifier A       Verifier B        Verifier C              │
                   │  ──────────       ──────────        ──────────              │
                   │  poll             poll              poll                    │
                   │  verify           verify            verify                  │
                   │  narrate          narrate           narrate                 │
                   │  vote             vote              vote                    │
                   └──────────────┬───────────────┬───────────────┬─────────────┘
                                  │               │               │
                                  └──── signed peer verdict envelopes ──────────┐
                                                                                 │
                                                                                 ▼
                                                  ┌──────────────────────────────┐
                                                  │       Gensyn AXL layer       │
                                                  │ peer messaging / corroboration│
                                                  └──────────────┬───────────────┘
                                                                 │
                                                         consensus on
                                                   (verified, evidenceRoot)
                                                                 │
                         ┌───────────────────────────────────────┴──────────────────────────────────────┐
                         │                                                                              │
                         ▼                                                                              ▼
        ┌────────────────────────────────┐                                   ┌────────────────────────────────────┐
        │        0G Storage / Indexer    │                                   │            KeeperHub                │
        │ metadata, evidence, bundles,   │                                   │ reliable submitVerdict() execution │
        │ consensus artifacts, KV roots  │                                   │ retry + gas optimization + audit   │
        └────────────────┬───────────────┘                                   └────────────────┬───────────────────┘
                         │                                                                    │
                         └─────────────────────────────── evidenceRoot / bundle pointers ─────┘
                                                                                               │
                                                                                               ▼
                                                            ┌────────────────────────────────────────┐
                                                            │      Onchain verdict / release path    │
                                                            │ finalized milestone + capital movement │
                                                            └────────────────────────────────────────┘
```

## Reading the diagram
- **0G** anchors the contract, metadata lookup, and evidence artifacts.
- **AXL** coordinates the verifier swarm across separate nodes.
- **KeeperHub** is the preferred execution path once the swarm reaches confidence.
- **ENS** gives builders and verifier agents human-readable identity at the edge of the system.

## Judge framing
Use this sentence while showing the diagram:

> Weft takes milestone funding from manual trust to agentic execution: verifiers gather evidence, corroborate it over AXL, persist proofs on 0G, and execute verdicts reliably with KeeperHub.
