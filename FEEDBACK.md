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