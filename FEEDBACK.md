# FEEDBACK.md

Track known issues and design feedback across Weft integrations.

## ENS Integration

### Issue 1: Incorrect namehash in agent client

**Problem**: `ens_client._namehash()` uses `sha256` for label hashing instead of `keccak256` (per EIP-137). This causes all ENS reads and writes to target the wrong node, silently failing in production.

**Impact**: Agent-side ENS updates will not write to the correct records. The frontend hook (`useBuilderPassport.ts`) implements namehash correctly, creating an agent↔frontend inconsistency.

**Workaround**: None — this must be fixed before enabling ENS in production.

### Issue 2: Daemon does not call ENS

**Problem**: `weft_daemon.py` (the autonomous verification loop) never calls `update_ens_after_verification`. Only the one-shot `weft_collect_attestation.py` CLI does.

**Impact**: The primary production path skips ENS profile updates entirely.

**Workaround**: Run `weft_collect_attestation.py` with `--ens-name` alongside the daemon.

### Issue 3: No ENS ownership validation

**Problem**: The verifier's private key must own or be authorized to write text records on the builder's ENS name. There is no pre-flight check or helpful error for this.

**Impact**: Transactions will revert silently if the verifier doesn't control the target ENS name.

**Workaround**: Verify ENS ownership manually before enabling `--ens-name`.

---

## Sponsor Feedback

### 0G Storage

**KV endpoint stability.** The CLI + HTTP fallback works well and degrades gracefully, but `kv_put_string` / `kv_get_string` fail silently on the current testnet — a stable, documented KV RPC URL would unblock production use immediately. We have documented our own key-namespace convention (`weft:<entity>:<id>:<artifact>`) in `AGENTS.md` to avoid collisions; an official namespace spec from 0G would prevent conflicts across all teams building on the same stream.

---

### Gensyn (AXL)

**Testnet endpoint.** The full multi-node signing flow is wired — signed envelopes, inbox persistence, authorized-verifier checks against `VerifierRegistry` — but AXL isn't deployed yet, so we're validating against a stub. Even a read-only testnet AXL endpoint would let us confirm the broadcast path end-to-end before the demo. A published JSON Schema or OpenAPI spec for the envelope format would also prevent silent incompatibilities as the protocol evolves.

---

### KeeperHub — OpenAPI spec

**Dual field names.** We had to guess and handle both `executionId`/`id` and `txHash`/`transactionHash` because there's no published spec. A single OpenAPI document would eliminate this entirely and make SDK generation trivial for any language.

---

### KeeperHub — Sandbox / testnet URL

**Undocumented override.** The `KEEPERHUB_API_URL` environment variable works as a testnet override and is now documented in our `AGENTS.md`, but it isn't mentioned anywhere in the KeeperHub docs — integrators have to read source code to find it. An official `https://sandbox.keeperhub.com` endpoint, or even a one-line doc note that the override exists, would save hours of setup time.

---

### KeeperHub — Webhook / completion callback

**Poll-only model.** We currently poll every 2 seconds per execution; at 100 req/min that's fine for one milestone but becomes a bottleneck with concurrent executions. A `completedAt` webhook or server-sent event would cut both latency and API load significantly.

---

### KeeperHub — `scheduleRelease()`

**Last missing piece.** The execution engine is the most polished integration we have — retry, gas optimization, audit trail, and fallback all work. The capital-release flow (`scheduleRelease()`) is the only remaining gap for a full end-to-end demo; once that contract is deployed, the integration is complete.

---

### Kimi (Moonshot)

**What works well.** The `moonshot-v1-128k` model handles attestation-to-narrative conversion cleanly — it takes raw JSON (deployment evidence, unique caller counts, verdict status) and produces builder-facing prose that's accurate and readable. The 128k context window means we can feed it the full attestation without truncation. Response latency is acceptable for an async daemon loop (~2-4s per call).

**Integration approach.** We built `agent/lib/kimi_client.py` as a standalone module that takes an attestation dict and returns a narrative string. It's called within the verification daemon after evidence collection but before onchain vote submission. The narrative is persisted alongside the attestation JSON and published to 0G Storage as part of the evidence bundle. This makes Kimi a first-class participant in the autonomous verification pipeline, not a post-hoc summarizer.

**API key setup.** The integration is zero-config once `KIMI_API_KEY` is set — no SDK installation required, just a standard OpenAI-compatible HTTP call to `api.moonshot.cn/v1/chat/completions`. The fallback is graceful: if the key is missing or the call fails, the daemon continues without a narrative.

**What would improve the experience.** A documented rate limit spec would help with production planning — we currently don't know if we'll hit limits at scale. Also, a streaming response option would be useful for the frontend to show narrative generation in real-time during demo presentations.