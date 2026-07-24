/** Shared SigNoz demo constants (safe for client + server). */

export const SIGNOZ_WINNING_TRACE_FILTER =
  "service.name = 'weft-daemon' AND weft.milestone_hash = '0xwinningagent2'";

export const SIGNOZ_DASHBOARD_ID = "019f939c-cffa-7134-a7ee-9622693ec4fb";

export const SIGNOZ_SPAN_NAMES = [
  "weft.agent.plan",
  "weft.agent.tool_call",
  "weft.llm.chat",
  "weft.verification_cycle",
  "weft.evidence.deployment",
  "weft.evidence.usage",
] as const;

export type SignozSpanName = (typeof SIGNOZ_SPAN_NAMES)[number];

export const SIGNOZ_ALERTS = [
  {
    id: "019f939d-e7f7-7c2e-be4d-a410b06a9b78",
    slug: "keeperhub_fallback",
    name: "KeeperHub fallback activated",
    filter: "name = 'weft.keeperhub.release' AND weft.keeperhub_status = 'fallback'",
    kind: "trace" as const,
  },
  {
    id: "019f939d-e7fb-764d-ad71-1772135c9e93",
    slug: "peer_quorum_degraded",
    name: "Peer quorum degraded",
    filter: "weft.recovery.event = 'consensus_degraded'",
    kind: "log" as const,
  },
  {
    id: "019f939d-e7f6-7d5c-843f-9ab67b2234c5",
    slug: "llm_narrative_failures",
    name: "LLM narrative failures",
    filter: "name = 'weft.llm.chat' AND weft.llm.outcome = 'error'",
    kind: "trace" as const,
  },
] as const;

export const SIGNOZ_DASHBOARD_PANELS = [
  { title: "Agent workflow spans", body: "Traces grouped by span name", metricKey: "spanGroups" as const },
  { title: "LLM requests", body: "Backend, model, outcome", metricKey: "llmSpans" as const },
  { title: "LLM token cost", body: "Total tokens and estimated cost", metricKey: "llmSpans" as const },
  { title: "Verification outcomes", body: "Verified, rejected, degraded, fallback", metricKey: "traceCount" as const },
  { title: "Tool call outcomes", body: "RPC and verifier tools by result", metricKey: "toolSpans" as const },
  { title: "Peer consensus health", body: "Matching peers vs quorum threshold", metricKey: "recoveryEvents" as const },
  { title: "KeeperHub reliability", body: "Confirmed vs fallback settlement", metricKey: "recoveryEvents" as const },
  { title: "Recovery events", body: "Degraded paths and autonomous recovery", metricKey: "recoveryEvents" as const },
] as const;

/** Demo span counts from weft_signoz_smoke winning scenario (fallback trace). */
export const SIGNOZ_DEMO_SPAN_COUNTS: Record<SignozSpanName, number> = {
  "weft.agent.plan": 1,
  "weft.agent.tool_call": 2,
  "weft.llm.chat": 1,
  "weft.verification_cycle": 1,
  "weft.evidence.deployment": 1,
  "weft.evidence.usage": 1,
};
