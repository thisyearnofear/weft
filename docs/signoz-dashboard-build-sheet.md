# SigNoz Dashboard Build Sheet

Dashboard name: `Weft Autonomous Agent Observatory`

Primary service filter:

```text
service.name = 'weft-daemon'
```

Winning demo trace filter:

```text
service.name = 'weft-daemon' AND weft.milestone_hash = '0xwinningagent2'
```

## Panels

### 1. Agent Workflow Spans

Signal: Traces

Filter:

```text
service.name = 'weft-daemon'
```

Aggregation: `count()`

Group by: `name`

Why: shows the full agent workflow: plan, tool calls, LLM call, evidence checks, verifier cycle.

### 2. LLM Requests

Signal: Traces

Filter:

```text
service.name = 'weft-daemon' AND name = 'weft.llm.chat'
```

Aggregation: `count()`

Group by: `weft.llm.backend`, `weft.llm.model`, `weft.llm.outcome`

Why: proves AI/LLM observability, not only service observability.

### 3. LLM Token Cost

Signal: Traces

Filter:

```text
service.name = 'weft-daemon' AND name = 'weft.llm.chat'
```

Aggregations:

```text
sum(gen_ai.usage.total_tokens)
sum(weft.llm.cost_usd)
```

Group by: `weft.llm.model`

Why: directly maps to the hackathon prompt about token costs and AI infrastructure visibility.

### 4. Verification Outcomes

Signal: Traces

Filter:

```text
service.name = 'weft-daemon' AND name = 'weft.verification_cycle'
```

Aggregation: `count()`

Group by: `weft.outcome`

Why: shows verified, rejected, degraded, and fallback paths.

### 5. Tool Call Outcomes

Signal: Traces

Filter:

```text
service.name = 'weft-daemon' AND name = 'weft.agent.tool_call'
```

Aggregation: `count()`

Group by: `weft.tool.name`, `weft.tool.outcome`

Why: makes chain/RPC evidence collection debuggable as agent tool use.

### 6. Peer Consensus Health

Signal: Traces

Filter:

```text
service.name = 'weft-daemon' AND name = 'weft.consensus.wait'
```

Aggregations:

```text
avg(weft.matching_peers)
max(weft.peer_threshold)
```

Group by: `weft.milestone_hash`

Why: shows whether the verifier swarm reached quorum.

### 7. KeeperHub Reliability

Signal: Traces

Filter:

```text
service.name = 'weft-daemon' AND name = 'weft.keeperhub.release'
```

Aggregation: `count()`

Group by: `weft.keeperhub_status`

Why: shows confirmed vs fallback settlement execution.

### 8. Recovery Events

Signal: Logs

Filter:

```text
service.name = 'weft-daemon' AND body = 'weft.recovery'
```

Aggregation: `count()`

Group by: `weft.recovery.event`, `weft.recovery.outcome`

Why: shows degraded paths and autonomous recovery behavior.

## Alert Rules

### KeeperHub fallback activated

Signal: Traces

Filter:

```text
service.name = 'weft-daemon' AND name = 'weft.keeperhub.release' AND weft.keeperhub_status = 'fallback'
```

Condition: `count() > 0` over 5 minutes.

### Peer quorum degraded

Signal: Logs

Filter:

```text
service.name = 'weft-daemon' AND weft.recovery.event = 'consensus_degraded'
```

Condition: `count() > 0` over 5 minutes.

### LLM narrative failures

Signal: Traces

Filter:

```text
service.name = 'weft-daemon' AND name = 'weft.llm.chat' AND weft.llm.outcome = 'error'
```

Condition: `count() > 0` over 5 minutes.
