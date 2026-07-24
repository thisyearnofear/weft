"use client";

import Link from "next/link";
import { ArrowRight, ExternalLink, FileCheck2 } from "lucide-react";
import {
  getSignozTracesExplorerUrl,
  SIGNOZ_WINNING_MILESTONE_HASH,
  SIGNOZ_WINNING_TRACE_FILTER,
} from "@/lib/signoz";
import type { ObservabilityData, ObservabilityLlmSpan } from "@/hooks/useObservability";
import styles from "./AgentTraceReceipt.module.css";

const DEMO_LLM: ObservabilityLlmSpan = {
  backend: "kimi",
  model: "moonshot-v1-128k",
  inputTokens: 742,
  outputTokens: 168,
  totalTokens: 910,
  costUsd: 0.012,
  outcome: "success",
};

function formatRelative(ms: number | null): string {
  if (!ms) return "No live trace timestamp";
  const delta = Date.now() - ms;
  if (delta < 60_000) return "Last trace · just now";
  if (delta < 3_600_000) return `Last trace · ${Math.round(delta / 60_000)}m ago`;
  if (delta < 86_400_000) return `Last trace · ${Math.round(delta / 3_600_000)}h ago`;
  return `Last trace · ${new Date(ms).toLocaleString()}`;
}

function fmtUsd(value: number | null): string {
  if (value == null) return "—";
  return `$${value.toFixed(3)}`;
}

export function AgentTraceReceipt({
  signoz,
  recovery,
  compact = false,
}: {
  signoz: ObservabilityData["signoz"];
  recovery: ObservabilityData["recovery"];
  compact?: boolean;
}) {
  const llm = signoz.llmSpan ?? (signoz.live ? null : DEMO_LLM);
  const tracesUrl = getSignozTracesExplorerUrl();

  return (
    <article className={compact ? `${styles.receipt} ${styles.compact}` : styles.receipt}>
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <FileCheck2 size={16} />
          <span>Agent trace receipt</span>
        </div>
        <span className={styles.liveChip} data-live={signoz.live ? "true" : "false"}>
          {signoz.live ? "SigNoz live" : "Demo lens"}
        </span>
      </div>

      <p className={styles.lede}>
        SigNoz holds the ground truth for autonomous execution. Weft renders the audit lens —
        deterministic verdict rules, inspectable agent steps, and LLM cost as observed context.
      </p>

      <dl className={styles.rows}>
        <div className={styles.row}>
          <dt>Milestone</dt>
          <dd className={styles.mono}>{SIGNOZ_WINNING_MILESTONE_HASH}</dd>
        </div>
        <div className={styles.row}>
          <dt>Trace filter</dt>
          <dd className={styles.mono}>{SIGNOZ_WINNING_TRACE_FILTER}</dd>
        </div>
        <div className={styles.row}>
          <dt>Matching traces</dt>
          <dd>{signoz.traceCount ?? (signoz.live ? "—" : "1")}</dd>
        </div>
        <div className={styles.row}>
          <dt>Visible spans</dt>
          <dd>{signoz.totalSpans}</dd>
        </div>
        <div className={styles.row}>
          <dt>LLM narrative</dt>
          <dd>
            {llm
              ? `${llm.backend ?? "—"} · ${llm.model ?? "—"} · ${llm.totalTokens ?? "—"} tokens · ${fmtUsd(llm.costUsd)}`
              : "No LLM span in window"}
          </dd>
        </div>
        <div className={styles.row}>
          <dt>Recovery events</dt>
          <dd>{recovery ? `${recovery.totalEvents} (${recovery.recoveries} recovered)` : "—"}</dd>
        </div>
        <div className={styles.row}>
          <dt>Freshness</dt>
          <dd>{formatRelative(signoz.lastTraceAt)}</dd>
        </div>
      </dl>

      <div className={styles.actions}>
        <a href={tracesUrl} target="_blank" rel="noopener noreferrer" className={styles.actionBtn}>
          <ExternalLink size={14} />
          Open in SigNoz
        </a>
        <Link href="/observability?guided=1" className={styles.actionBtn}>
          Guided demo
          <ArrowRight size={14} />
        </Link>
      </div>
    </article>
  );
}
