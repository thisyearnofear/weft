"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Clock3,
  Coins,
  Eye,
  Loader2,
  Play,
  RadioTower,
  ReceiptText,
  RefreshCw,
  ServerCog,
} from "lucide-react";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { AgentTraceReceipt } from "@/components/AgentTraceReceipt";
import { CopyCodeButton } from "@/components/CopyCodeButton";
import { DashboardScreenshotStrip } from "@/components/DashboardScreenshotStrip";
import { ErrorState } from "@/components/ErrorState";
import { OfflineBadge } from "@/components/OfflineBadge";
import { TraceWaterfall } from "@/components/TraceWaterfall";
import { useObservability } from "@/hooks/useObservability";
import {
  getSignozAlertsUrl,
  getSignozDashboardUrl,
  getSignozAlertEditUrl,
  getSignozTracesExplorerUrl,
  SIGNOZ_DASHBOARD_PANELS,
  SIGNOZ_WINNING_TRACE_FILTER,
} from "@/lib/signoz";
import { GUIDED_DEMO_STEPS } from "@/lib/trace-waterfall";
import styles from "./page.module.css";

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

export function ObservabilityClient({
  guided = false,
  present = false,
}: {
  guided?: boolean;
  present?: boolean;
}) {
  const { data, isLoading, error, refetch, isFetching } = useObservability();
  const [demoRunning, setDemoRunning] = useState(false);
  const [demoMessage, setDemoMessage] = useState<string | null>(null);
  const [activeStep, setActiveStep] = useState(0);

  useEffect(() => {
    if (!present) return;
    document.body.classList.add("present-mode");
    return () => document.body.classList.remove("present-mode");
  }, [present]);

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

  const runDemoTrace = useCallback(async () => {
    setDemoRunning(true);
    setDemoMessage(null);
    try {
      const res = await fetch("/api/observability/demo", { method: "POST" });
      const body = await res.json();
      if (!res.ok) {
        setDemoMessage(body.detail ?? body.error ?? "Demo trace failed");
        return;
      }
      setDemoMessage("Trace emitted — polling SigNoz…");
      for (let i = 0; i < 8; i += 1) {
        await new Promise((r) => setTimeout(r, 2000));
        await refetch();
      }
      setDemoMessage("Demo trace should be visible in SigNoz.");
    } catch (err) {
      setDemoMessage(err instanceof Error ? err.message : "Demo trace failed");
    } finally {
      setDemoRunning(false);
    }
  }, [refetch]);

  const scrollToStep = useCallback((index: number) => {
    setActiveStep(index);
    const anchor = GUIDED_DEMO_STEPS[index]?.anchor;
    if (!anchor) return;
    document.getElementById(anchor)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  const guidedRail = useMemo(() => {
    if (!guided) return null;
    return (
      <nav className={styles.guidedRail} aria-label="Guided demo steps">
        {GUIDED_DEMO_STEPS.map((step, index) => (
          <button
            key={step.id}
            type="button"
            className={styles.guidedStep}
            data-active={index === activeStep ? "true" : "false"}
            onClick={() => scrollToStep(index)}
          >
            <span>{index + 1}</span>
            <div>
              <strong>{step.title}</strong>
              <p>{step.blurb}</p>
            </div>
          </button>
        ))}
      </nav>
    );
  }, [guided, activeStep, scrollToStep]);

  return (
    <div className={`${styles.container} ${present ? styles.presentContainer : ""}`}>
      <div className={styles.inner}>
        {!present && <Breadcrumbs items={[{ label: "Agent Observatory" }]} />}
        {guidedRail}

        {error && !data && (
          <ErrorState
            message={`Failed to load observability: ${error instanceof Error ? error.message : "Unknown error"}`}
            onRetry={() => refetch()}
            isRetrying={isFetching}
          />
        )}
        {error && data && <OfflineBadge />}

        <section className={styles.hero} id="step-problem">
          <div className={styles.heroCopy}>
            <div className={styles.eyebrow}>
              <Eye size={15} /> SigNoz-powered agent observability
            </div>
            <h1>{present ? "Weft × SigNoz" : "See inside the agent before it moves money."}</h1>
            <p>
              Weft traces the autonomous verifier from plan to tool calls to LLM narrative
              to deterministic evidence checks. SigNoz is the evidence backend; this page
              is the user-facing audit lens.
            </p>
            <div className={styles.heroActions}>
              {!present && (
                <Link href="/operations" className={styles.primaryAction}>
                  Open operations <ArrowRight size={16} />
                </Link>
              )}
              <a href={tracesExplorer} target="_blank" rel="noopener noreferrer" className={styles.secondaryAction}>
                Open winning trace <ArrowRight size={16} />
              </a>
              {signozDashboard && (
                <a href={signozDashboard} target="_blank" rel="noopener noreferrer" className={styles.secondaryAction}>
                  Open dashboard <ArrowRight size={16} />
                </a>
              )}
              <button
                type="button"
                className={styles.demoBtn}
                onClick={runDemoTrace}
                disabled={demoRunning}
              >
                {demoRunning ? <Loader2 size={15} className={styles.spin} /> : <Play size={15} />}
                Run demo trace
              </button>
              <button type="button" className={styles.refreshBtn} onClick={() => refetch()} disabled={isFetching} aria-label="Refresh live SigNoz stats">
                <RefreshCw size={15} className={isFetching ? styles.spin : undefined} />
              </button>
            </div>
            {demoMessage && <p className={styles.demoMessage}>{demoMessage}</p>}
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

        {signoz && (
          <section className={styles.receiptSection} id="step-receipt">
            <AgentTraceReceipt signoz={signoz} recovery={recovery} />
          </section>
        )}

        <section className={styles.traceSection} id="step-waterfall">
          <div className={styles.sectionHeader}>
            <span>Trace Waterfall</span>
            <h2>The agent is not a black box.</h2>
          </div>
          <TraceWaterfall spanCounts={signoz?.spanCounts} isLoading={isLoading} showDeepLinks />
        </section>

        {!present && (
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
        )}

        <section className={styles.dashboardSection} id="step-dashboard">
          <div className={styles.sectionHeader}>
            <span>Dashboard</span>
            <h2>Eight panels — live counts when SigNoz is connected.</h2>
          </div>
          <DashboardScreenshotStrip signoz={signoz} recovery={recovery} isLoading={isLoading} />
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

        <section className={styles.alertSection} id="step-alerts">
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

        {!present && (
          <section className={styles.demoStrip}>
            <div>
              <Clock3 size={18} />
              <span>Demo commands</span>
            </div>
            <code>agent/scripts/weft_signoz_demo.sh && agent/scripts/weft_signoz_provision.sh</code>
            <CheckCircle2 size={18} />
          </section>
        )}
      </div>
    </div>
  );
}
