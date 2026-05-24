# Agents Under Pressure — Recovery Track Build Plan

> **Hackathon**: [Agents Under Pressure](https://www.aivalley.io/hackathons/agents-under-pressure-build-your-own-os)
> **Track**: Recovery — "agents that handle failure instead of crashing"
> **Window**: 48 hours (May 23–26, 2026)
> **Pitch**: A verifier agent that autonomously recovers from infrastructure failure mid-verification and still delivers a correct onchain verdict.

---

## Why Recovery

Weft already runs a multi-agent verification network with:
- RPC fallback chains (publicnode as backup)
- AXL P2P with legacy HTTP fallback
- KeeperHub execution with timeout/retry
- Peer rerouting when nodes drop
- File-based caching for idempotent reads

The hackathon work is **instrumenting, triggering, and visualizing** these recovery paths — not building new infrastructure.

---

## What We're Building

### 1. Recovery Event Log

Structured event stream from the daemon capturing every failure + recovery:

```python
{
  "timestamp": 1716556800,
  "event": "rpc_timeout",
  "context": {"url": "https://evmrpc-testnet.0g.ai", "method": "eth_call"},
  "action": "fallback_rpc",
  "target": "https://0g-testnet.publicnode.com",
  "outcome": "success",
  "latency_ms": 340
}
```

Events: `rpc_timeout`, `peer_offline`, `peer_reroute`, `keeperhub_503`, `keeperhub_retry`, `kimi_unavailable`, `kimi_cache_hit`, `consensus_degraded`, `consensus_recovered`, `verdict_submitted`

### 2. Chaos Mode

Endpoint that injects real failures into a running verification:

| Chaos Action | What It Does | Recovery Path |
|---|---|---|
| `kill_rpc` | Block primary RPC | Fallback to publicnode |
| `kill_peer` | Drop one AXL peer | Reroute through remaining peers |
| `kill_kimi` | Revoke Kimi API key | Serve from cache / degrade gracefully |
| `kill_keeperhub` | Simulate 503 | Retry with exponential backoff |
| `kill_all` | All of the above | Full recovery cascade |

### 3. Recovery Dashboard (1 page)

Single frontend page showing:
- Live recovery timeline (event stream)
- **Operational Memory Insights**: AI-generated analysis of frequent failures powered by **HydraDB**
- "Trigger Chaos" button panel
- Milestone verification progress bar
- Final outcome: verdict lands onchain despite failures

---

## Architecture

```
agent/
  lib/
    recovery.py              ← NEW: RecoveryLog class + event types
    chaos.py                 ← NEW: Chaos injection (toggles failure flags)
    hydradb_client.py        ← NEW: Operational Memory layer wrapper
  scripts/
    weft_status_api.py       ← ENHANCED: +GET /recovery, +POST /chaos
    weft_daemon.py           ← ENHANCED: emit recovery events at failure points

frontend/
  src/app/recovery/
    page.tsx                 ← NEW: Recovery dashboard + HydraDB insights
```

**6 files changed/added.**

---

## 48-Hour Timeline

### Hour 0–8: Recovery Instrumentation

- [ ] Create `agent/lib/recovery.py` — RecoveryLog class (append-only event list, JSON serializable)
- [ ] Create `agent/lib/chaos.py` — ChaosController (toggle flags that lib code checks)
- [ ] Patch `agent/lib/jsonrpc.py` — emit `rpc_timeout` / `fallback_rpc` events on failure
- [ ] Patch `agent/lib/axl_client.py` — emit `peer_offline` / `peer_reroute` events
- [ ] Patch `agent/lib/kimi_client.py` — emit `kimi_unavailable` / `kimi_cache_hit` events
- [ ] Patch `agent/lib/keeperhub_client.py` — emit `keeperhub_503` / `keeperhub_retry` events
- [ ] Add `GET /recovery` and `POST /chaos` to `weft_status_api.py`

### Hour 8–16: Integration + Daemon Loop

- [ ] Wire chaos flags into the daemon verification loop
- [ ] Test: start daemon, trigger chaos via curl, observe recovery events
- [ ] Ensure verification completes despite all chaos injections
- [ ] Add `verdict_submitted` event when onchain tx lands

### Hour 16–24: Frontend Dashboard

- [ ] Create `frontend/src/app/recovery/page.tsx`
- [ ] Poll `GET /recovery` every 1s, render event timeline
- [ ] Add chaos trigger buttons (POST to `/chaos`)
- [ ] Show milestone progress (pending → collecting → verifying → submitted)
- [ ] Show final "Verdict landed" confirmation with tx hash

### Hour 24–36: Polish + Demo

- [ ] Script the 3-minute demo flow: start verification → trigger chaos → watch recovery → verdict lands
- [ ] Handle edge case: what if ALL paths fail? Show graceful degradation + retry
- [ ] Test with real AXL peers (2 daemon instances)
- [ ] Record backup demo video

### Hour 36–48: Ship

- [ ] Deploy frontend (Vercel)
- [ ] Write submission paragraph
- [ ] Final run-through
- [ ] Submit

---

## Demo Script (3 minutes)

1. **Setup** (20s) — Show the milestone on 0G Chain. Show 3 verifier nodes running. "This is real infrastructure — contracts deployed, peers connected."

2. **Start Verification** (20s) — Trigger verification. Timeline shows: evidence collected, narrative generated, peers corroborating. Everything green.

3. **Chaos** (60s) — Hit "Kill All." RPC goes down. Peer drops. Kimi key revoked. KeeperHub 503. Timeline goes red. Then: fallback RPC connects. Remaining peer reroutes. Cached narrative served. KeeperHub retries and succeeds. Timeline recovers to green.

4. **The Verdict** (40s) — Despite every failure, the onchain verdict lands. Show the transaction. Show the evidence root. "The agent recovered from 4 simultaneous infrastructure failures and still delivered a correct verdict."

5. **The Point** (40s) — "This isn't a chatbot that says 'sorry, try again.' This is infrastructure that routes around failure autonomously. Every recovery path exists because we've already been running this in production."

---

## What Already Exists (Not Building)

| Component | Status |
|---|---|
| Onchain contracts (WeftMilestone, VerifierRegistry) | Deployed on 0G Galileo |
| Verification logic (evidence collection, verdict) | `agent/lib/mvp_verifier.py` |
| AXL P2P transport + fallback | `agent/lib/axl_client.py` |
| Kimi narrative synthesis | `agent/lib/kimi_client.py` |
| KeeperHub execution | `agent/lib/keeperhub_client.py` |
| RPC with caching + fallback | `agent/lib/jsonrpc.py` |
| Peer consensus | `agent/lib/peer_inbox.py` |
| Status API | `agent/scripts/weft_status_api.py` |
| Frontend (milestones, chat, chronicle) | `frontend/src/` |

---

## Risk Mitigation

| Risk | Mitigation |
|---|---|
| Daemon doesn't recover cleanly | Test each failure mode in isolation first |
| Frontend polling too slow | Use 1s interval, show optimistic updates |
| Real AXL peers unavailable | Run 2 local daemon instances |
| 48hr not enough | Cut HydraDB integration (nice-to-have) |
| Demo fails live | Pre-recorded backup video |
