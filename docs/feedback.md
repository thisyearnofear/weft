# FEEDBACK.md

Track known issues and design feedback across Weft integrations.

## Status: Fixed

### ~~Issue 1: Incorrect namehash in agent client~~ ✅ FIXED

**Was:** `ens_client._namehash()` used `sha256` for label hashing instead of `keccak256` (per EIP-137).

**Fix:** Rewrote `_namehash()` at `agent/lib/ens_client.py:287` to use `_keccak256()` which calls `cast keccak`. Verified matches EIP-137 spec (`node = keccak256(namehash(parent) ++ keccak256(label))` with zero starting node).

### ~~Issue 2: Daemon does not call ENS~~ ✅ FIXED

**Was:** `weft_daemon.py` never called `update_ens_after_verification`.

**Fix:** Daemon now calls `update_ens_after_verification()` at line 540 when `--builder-ens` is set and milestone is verified. Also issues verified subnames via `issue_verified_subname()` when `WEFT_ENS_PARENT` is configured.

### ~~Issue 3: No ENS ownership validation~~ ✅ FIXED

**Was:** No pre-flight check for ENS ownership.

**Fix:** `EnsClient.check_ownership()` at `agent/lib/ens_client.py:170` validates the wallet controls the target ENS name before writing. Supports `--skip-ownership` flag for demos. Helper error messages guide the user through troubleshooting.

### ~~Missing `update_agent_record` export~~ ✅ FIXED

**Was:** `update_agent_record` referenced in `agent/lib/__init__.py` `__all__` but not imported from `ens_client`.

**Fix:** Added import at `agent/lib/__init__.py:66`. Function is properly exported.

### ~~Hardcoded paths in skills~~ ✅ FIXED

**Was:** All 6 Hermes skills used `~/dev/weft` or `~/weft` as hardcoded working directories.

**Fix:** All 19 instances replaced with `$WEFT_ROOT` environment variable, exported by `scripts/hermes_weft.sh`. If unset, `$WEFT_ROOT` defaults to the repo root resolved from the script location.

---

## Current Gaps

### 1. 0G Storage KV endpoint instability

The 0G testnet indexer at `https://indexer-storage-testnet-standard.0g.ai` is unreliable (returns 503 intermittently). We have graceful fallback to local files and direct RPC reads, but a stable KV URL is needed for production.

KV key namespace: `weft:<entity>:<id>:<artifact>` (documented in AGENTS.md).

### 2. KeeperHub `scheduleRelease()` not deployed

The capital-release flow via KeeperHub is the last missing piece for full end-to-end automation. Currently, `release()` must be called manually. Contract-level integration is in design.

### 3. Test coverage

`agent/test/` has 4 test files. The production daemon (`weft_daemon.py`, 778 lines) and status API (`weft_status_api.py`, 1361 lines) have no tests. Coverage needs to expand for production.

### 4. CI pipeline

No `.github/` CI configuration. No automated linting, typechecking, or test runs. Important for team contributions.

### 5. Hermes skills still use demo data fallback

`weft-chronicle` and `weft-demo` fall back to hardcoded demo data (147 callers, 23 commits, hash `0x5169...c16f`) when no real attestations exist. The new `weft-workflow` skill fixes this (no demo data), but older skills still use it for demo convenience.

---

## Current: Hermes Agent Integration Quality

| Aspect | Rating | Notes |
|---|---|---|
| Multi-step agentic workflow | ✅ Created | `weft-workflow` skill with reasoning gates at every phase |
| Auto-loading skills | ✅ 9 skills | 7 original + weft-workflow + weft-treasury, all via `external_dirs` |
| Planning/reasoning demonstration | ✅ | Workflow skill requires REASON → EXECUTE → EVALUATE at each phase |
| Failure recovery | ✅ | Documented fallback table in weft-workflow |
| Path independence | ✅ | All skills use `$WEFT_ROOT` |
| Export correctness | ✅ | `__init__.py` imports match `__all__` |
| Submission-ready | ✅ | Multi-step workflow demonstrates Hermes Agent as reasoning layer |

---

## Sponsor Feedback

### 0G Storage

**KV endpoint stability.** The CLI + HTTP fallback works well and degrades gracefully, but `kv_put_string` / `kv_get_string` fail silently on the current testnet — a stable, documented KV RPC URL would unblock production use immediately. We have documented our own key-namespace convention (`weft:<entity>:<id>:<artifact>`) in `AGENTS.md` to avoid collisions; an official namespace spec from 0G would prevent conflicts across all teams building on the same stream.

---

### Gensyn (AXL)

**What works well.** We cloned and built the AXL binary from `gensyn-ai/axl` (Go 1.25.x required due to gvisor build-tag conflict with Go 1.26). The node starts cleanly, connects to the Gensyn bootstrap peers (`tls://34.46.48.224:9001`, `tls://136.111.135.206:9001`), and exposes the local HTTP API on `127.0.0.1:9002`. Our `axl_client.py` auto-detects a running node via `GET /topology` and routes verdict broadcasts through `POST /send` (with `X-Destination-Peer-Id` header) and receives via `GET /recv`. Fallback to legacy HTTP POST is seamless when no node is running.

**Integration approach.** `agent/lib/axl_client.py` provides `start_axl_node()` which auto-generates a `node-config.json` with an ephemeral ed25519 key and bootstrap peers, then launches the binary. The `broadcast_verdict()` and `receive_verdicts()` functions auto-select AXL transport when a node is running, or fall back to direct HTTP POST for legacy peer servers. Peer addresses are hex-encoded ed25519 public keys (64 chars) when using AXL, or HTTP URLs in legacy mode.

**What would improve the experience.** (1) A published JSON Schema or OpenAPI spec for the `/send` and `/recv` envelope format would prevent silent incompatibilities — currently the body is raw bytes with no documented structure contract. (2) The `GET /recv` endpoint returns one message per call with 204 when empty; a batch endpoint or long-poll option would reduce round-trips for high-throughput use cases. (3) Go 1.26 compatibility — the gvisor build-tag conflict means builders must pin Go 1.25.x, which is a friction point since `brew install go` gives 1.26 by default.

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

---

### Uniswap API

**What works well.** The `/v2/quote` routing API is clean and well-documented — request a quote with token pair, amount, and slippage, get back calldata for the Universal Router. The OpenAPI-style docs at `developers.uniswap.org` made it straightforward to build `agent/lib/uniswap_client.py` without an SDK. The `EXACT_INPUT` flow with `enableUniversalRouter: true` is the right abstraction for our use case (swap platform fees from ETH to USDC for treasury).

**Integration approach.** We built a standalone `uniswap_client.py` module that: (1) gets a quote from the Uniswap Routing API, (2) executes the swap via `cast send` to the Universal Router. The high-level entry point is `route_platform_fee(fee_wei=..., dry_run=False)` — called by the daemon after capital release to convert the platform's ETH fee to stablecoins. The module follows the same pattern as our other integrations: env-var config, graceful fallback, no external dependencies beyond stdlib.

**API key setup.** Requires `UNISWAP_API_KEY` (from the Uniswap Developer Platform). Configuration is zero-friction once the key is set. We also support `UNISWAP_CHAIN_ID`, `UNISWAP_SLIPPAGE_BPS`, and `WEFT_TREASURY_ADDRESS` for flexibility across chains and deployments.

**What would improve the experience.** (1) The quote response schema varies slightly between routing types (`CLASSIC` vs `DUTCH_LIMIT`) — a unified response envelope with consistent field names (`amountOut` vs `amountOutMin` vs `quoteGasAdjustedDecimals`) would simplify client code. (2) A sandbox/testnet mode for the quote API would help — currently we can only test against mainnet liquidity, which means dry-run is the only safe option during development. (3) Webhook or streaming support for swap status would be useful for agents that need to confirm settlement before proceeding (we currently rely on `cast receipt` polling).
