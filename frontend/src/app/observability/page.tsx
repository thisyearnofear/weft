"use client";

import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  Bot,
  Braces,
  CheckCircle2,
  Clock3,
  Coins,
  Eye,
  Gauge,
  ListChecks,
  RadioTower,
  ReceiptText,
  RefreshCw,
  ServerCog,
  ShieldCheck,
  TerminalSquare,
} from "lucide-react";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { CopyCodeButton } from "@/components/CopyCodeButton";
import { ErrorState } from "@/components/ErrorState";
import { OfflineBadge } from "@/components/OfflineBadge";
import { useObservability } from "@/hooks/useObservability";
import {
  getSignozAlertsUrl,
  getSignozDashboardUrl,
  getSignozAlertEditUrl,
  getSignozTracesExplorerUrl,
  SIGNOZ_DASHBOARD_PANELS,
  SIGNOZ_WINNING_TRACE_FILTER,
} from "@/lib/signoz";
import styles from "./page.module.css";

const SPANS = [
  { name: "weft.agent.plan", label: "Plan", detail: "The verifier decides how to verify and release capital safely.", icon: Bot },
  { name: "weft.agent.tool_call", label: "Tools", detail: "Chain evidence calls are visible as agent tool use.", icon: TerminalSquare },
  { name: "weft.llm.chat", label: "LLM", detail: "Narrative generation exposes model, tokens, latency, and cost.", icon: Braces },
  { name: "weft.verification_cycle", label: "Cycle", detail: "The capital-release decision is one inspectable trace.", icon: Gauge },
  { name: "weft.evidence.deployment", label: "Deploy", detail: "Deployment evidence is checked deterministically.", icon: ShieldCheck },
  { name: "weft.evidence.usage", label: "Usage", detail: "Unique-caller threshold is checked before any verdict.", icon: ListChecks },
] as const;

function formatRelative(ms: number | null): string {
  if (!ms) return "No live trace yet";
  const delta = Date.now() - ms;
  if (delta < 60_000) return "Last trace · just now";
  if (delta < 3_600_000) return `Last trace · ${Math.round(delta / 60_000)}m ago`;
  if (delta < 86_400_000) return `Last trace · ${Math.round(delta / 3_600_000)}h ago`;
  return `Last trace · ${new Date(ms).toLocaleString()}`;
}

function alertStateLabel(state: string): string {
  if (state === "firing") return "Firing";
  if (state === "ok") return "OK";
  if (state === "disabled") return "Disabled";
  return "Provisioned";
}

function panelMetricValue(
  key: (typeof SIGNOZ_DASHBOARD_PANELS)[number]["metricKey"],
  signoz: NonNullable<ReturnType<typeof useObservability>["data"]>["signoz"],
  recovery: NonNullable<ReturnType<typeof useObservability>["data"]>["recovery"]
): string {
  switch (key) {
    case "spanGroups":
      return String(signoz.spanGroups);
    case "llmSpans":
      return String(signoz.spanCounts["weft.llm.chat"] ?? 0);
    case "traceCount":
      return signoz.traceCount != null ? String(signoz.traceCount) : "—";
    case "toolSpans":
      return String(signoz.spanCounts["weft.agent.tool_call"] ?? 0);
    case "recoveryEvents":
      return recovery ? String(recovery.totalEvents) : "—";
    default:
      return "—";
  }
}

export default function ObservabilityPage() {
  const { data, isLoading, error, refetch, isFetching } = useObservability();
  const signozDashboard = getSignozDashboardUrl();
  const tracesExplorer = getSignozTracesExplorerUrl();
  const signoz = data?.signoz;
  const recovery = data?.recovery ?? null;
  const alerts = signoz?.alerts?.length
    ? signoz.alerts
    : [
        { id: "keeperhub_fallback", slug: "keeperhub_fallback", name: "KeeperHub fallback activated", filter: "name = 'weft.keeperhub.release' AND weft.keeperhub_status = 'fallback'", state: "unknown" as const, url: getSignozAlertEditUrl("019f939d-e7f7-7c2e-be4d-a410b06a9b78") },
        { id: "peer_quorum_degraded", slug: "peer_quorum_degraded", name: "Peer quorum degraded", filter: "weft.recovery.event = 'consensus_degraded'", state: "unknown" as const, url: getSignozAlertEditUrl("019f939d-e7fb-764d-ad71-1772135c9e93") },
        { id: "llm_narrative_failures", slug: "llm_narrative_failures", name: "LLM narrative failures", filter: "name = 'weft.llm.chat' AND weft.llm.outcome = 'error'", state: "unknown" as const, url: getSignozAlertEditUrl("019f939d-e7f6-7d5c-843f-9ab67b2234c5") },
      ];

  return (
    <div className={styles.container}>
      <div className={styles.inner}>
        <Breadcrumbs items={[{ label: "Agent Observatory" }]} />

        {error && !data && (
          <ErrorState
            message={`Failed to load observability: ${error instanceof Error ? error.message : "Unknown error"}`}
            onRetry={() => refetch()}
            isRetrying={isFetching}
          />
        )}
        {error && data && <OfflineBadge />}

        <section className={styles.hero}>
          <div className={styles.heroCopy}>
            <div className={styles.eyebrow}>
              <Eye size={15} /> SigNoz-powered agent observability
            </div>
            <h1>See inside the agent before it moves money.</h1>
            <p>
              Weft traces the autonomous verifier from plan to tool calls to LLM narrative
              to deterministic evidence checks. SigNoz is the evidence backend; this page
              is the user-facing audit lens.
            </p>
            <div className={styles.heroActions}>
              <Link href="/operations" className={styles.primaryAction}>
                Open operations <ArrowRight size={16} />
              </Link>
              <a href={tracesExplorer} target="_blank" rel="noopener noreferrer" className={styles.secondaryAction}>
                Open winning trace <ArrowRight size={16} />
              </a>
              {signozDashboard && (
                <a href={signozDashboard} target="_blank" rel="noopener noreferrer" className={styles.secondaryAction}>
                  Open dashboard <ArrowRight size={16} />
                </a>
              )}
              <button type="button" className={styles.refreshBtn} onClick={() => refetch()} disabled={isFetching} aria-label="Refresh live SigNoz stats">
                <RefreshCw size={15} className={isFetching ? styles.spin : undefined} />
              </button>
            </div>
          </div>

          <div className={styles.proofPanel}>
            <div className={styles.proofHeader}>
              <ServerCog size={18} />
              <span>{signoz?.live ? "Live validated trace" : "Validated trace filter"}</span>
            </div>
            <code>{SIGNOZ_WINNING_TRACE_FILTER}</code>
            <div className={styles.proofActions}>
              <CopyCodeButton value={SIGNOZ_WINNING_TRACE_FILTER} label="Copy filter" />
              <span className={styles.liveBadge} data-live={signoz?.live ? "true" : "false"}>
                {signoz?.live ? "SigNoz connected" : "Demo snapshot"}
              </span>
            </div>
            <div className={styles.proofStats}>
              <div>
                <strong>{isLoading ? "…" : signoz?.spanGroups ?? 6}</strong>
                <span>span groups</span>
              </div>
              <div>
                <strong>{isLoading ? "…" : signoz?.totalSpans ?? 7}</strong>
                <span>visible spans</span>
              </div>
              <div>
                <strong>{isLoading ? "…" : signoz?.traceCount ?? "—"}</strong>
                <span>matching traces</span>
              </div>
            </div>
            <p className={styles.proofMeta}>{formatRelative(signoz?.lastTraceAt ?? null)}</p>
          </div>
        </section>

        <section className={styles.traceSection}>
          <div className={styles.sectionHeader}>
            <span>Trace Waterfall</span>
            <h2>The agent is not a black box.</h2>
          </div>
          <div className={styles.timeline}>
            {SPANS.map((span, index) => {
              const Icon = span.icon;
              const count = signoz?.spanCounts[span.name] ?? (isLoading ? "…" : 0);
              return (
                <div key={span.name} className={styles.timelineItem}>
                  <div className={styles.timelineIndex}>{String(index + 1).padStart(2, "0")}</div>
                  <div className={styles.timelineIcon}>
                    <Icon size={16} />
                  </div>
                  <div className={styles.timelineBody}>
                    <div className={styles.timelineTitle}>
                      <span>{span.label}</span>
                      <code>{span.name}</code>
                    </div>
                    <p>{span.detail}</p>
                  </div>
                  <strong className={styles.timelineCount}>{count}</strong>
                </div>
              );
            })}
          </div>
        </section>

        <section className={styles.gridSection}>
          <div className={styles.valueCard}>
            <div className={styles.cardIcon}><Coins size={18} /></div>
            <h2>Why users should care</h2>
            <p>
              Program officers do not need SigNoz accounts. They need a defensible receipt:
              what evidence was checked, what the agent did, whether the LLM merely narrated,
              and why capital released or stayed locked.
            </p>
          </div>
          <div className={styles.valueCard}>
            <div className={styles.cardIcon}><ReceiptText size={18} /></div>
            <h2>What the receipt proves</h2>
            <p>
              The boolean verdict is deterministic. The LLM span exists so teams can inspect
              cost and narrative behavior, not because an LLM is allowed to decide payment.
            </p>
          </div>
          <div className={styles.valueCard}>
            <div className={styles.cardIcon}><AlertTriangle size={18} /></div>
            <h2>What failures reveal</h2>
            <p>
              KeeperHub fallback, degraded peer quorum, and LLM failures become alertable
              conditions. A failed dependency is no longer hidden inside an autonomous run.
            </p>
          </div>
        </section>

        <section className={styles.dashboardSection}>
          <div className={styles.sectionHeader}>
            <span>Dashboard</span>
            <h2>Eight panels — live counts when SigNoz is connected.</h2>
          </div>
          {signozDashboard && (
            <a href={signozDashboard} target="_blank" rel="noopener noreferrer" className={styles.dashboardEmbed}>
              <div className={styles.dashboardEmbedHeader}>
                <strong>Weft Autonomous Agent Observatory</strong>
                <span>Open full dashboard <ArrowRight size={14} /></span>
              </div>
              <div className={styles.dashboardPreview}>
                {SIGNOZ_DASHBOARD_PANELS.slice(0, 4).map((panel) => {
                  const metric = signoz ? panelMetricValue(panel.metricKey, signoz, recovery) : "—";
                  const barWidth = Math.min(100, (Number(metric) || 0) * 12 + 18);
                  return (
                    <div key={panel.title} className={styles.previewPanel}>
                      <span>{panel.title}</span>
                      <strong>{isLoading ? "…" : metric}</strong>
                      <div className={styles.previewBar} aria-hidden="true">
                        <i style={{ width: `${barWidth}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </a>
          )}
          <div className={styles.panelGrid}>
            {SIGNOZ_DASHBOARD_PANELS.map((panel, index) => (
              <div key={panel.title} className={styles.panelItem}>
                <span>{index + 1}</span>
                <strong>{panel.title}</strong>
                <p>{panel.body}</p>
              </div>
            ))}
          </div>
        </section>

        <section className={styles.alertSection}>
          <div className={styles.sectionHeader}>
            <span>Alerts</span>
            <h2>Failure modes become operating signals.</h2>
          </div>
          <div className={styles.alertList}>
            {alerts.map((alert) => (
              <a key={alert.slug} href={alert.url || getSignozAlertsUrl()} target="_blank" rel="noopener noreferrer" className={styles.alertItem}>
                <RadioTower size={17} />
                <div>
                  <div className={styles.alertTitleRow}>
                    <strong>{alert.name}</strong>
                    <span className={styles.alertState} data-state={alert.state}>{alertStateLabel(alert.state)}</span>
                  </div>
                  <code>{alert.filter}</code>
                </div>
              </a>
            ))}
          </div>
          <div className={styles.alertLinks}>
            <a href={getSignozAlertsUrl("rules")} target="_blank" rel="noopener noreferrer" className={styles.alertLink}>
              View alert rules <ArrowRight size={14} />
            </a>
            <a href={getSignozAlertsUrl("triggered")} target="_blank" rel="noopener noreferrer" className={styles.alertLink}>
              View triggered alerts <ArrowRight size={14} />
            </a>
          </div>
        </section>

        <section className={styles.demoStrip}>
          <div>
            <Clock3 size={18} />
            <span>Demo commands</span>
          </div>
          <code>agent/scripts/weft_signoz_demo.sh && agent/scripts/weft_signoz_provision.sh</code>
          <CheckCircle2 size={18} />
        </section>
      </div>
    </div>
  );
}
