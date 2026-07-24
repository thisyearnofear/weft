"use client";

import { ArrowRight, Info } from "lucide-react";
import { getSignozDashboardUrl, getSignozPrivateDashboardUrl } from "@/lib/signoz";
import type { ObservabilityData } from "@/hooks/useObservability";
import { SIGNOZ_DASHBOARD_PANELS } from "@/lib/signoz-config";
import styles from "./DashboardScreenshotStrip.module.css";

function panelMetricValue(
  key: (typeof SIGNOZ_DASHBOARD_PANELS)[number]["metricKey"],
  signoz: ObservabilityData["signoz"],
  recovery: ObservabilityData["recovery"]
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

export function DashboardScreenshotStrip({
  signoz,
  recovery,
  isLoading = false,
}: {
  signoz?: ObservabilityData["signoz"];
  recovery?: ObservabilityData["recovery"];
  isLoading?: boolean;
}) {
  const publicDashboardUrl = getSignozDashboardUrl();
  const privateDashboardUrl = getSignozPrivateDashboardUrl();

  if (!signoz) return null;

  return (
    <div className={styles.strip} aria-label="Weft Agent Observatory dashboard">
      <div className={styles.liveMirrorHeader}>
        <div>
          <strong className={styles.title}>Weft Autonomous Agent Observatory</strong>
          <span className={styles.liveMirrorLabel}>Live counts · last 24h · SigNoz API</span>
        </div>
        <div className={styles.linkRow}>
          {privateDashboardUrl && (
            <a href={privateDashboardUrl} target="_blank" rel="noopener noreferrer" className={styles.openLinkPrimary}>
              Open SigNoz charts <ArrowRight size={14} />
            </a>
          )}
          {publicDashboardUrl && (
            <a href={publicDashboardUrl} target="_blank" rel="noopener noreferrer" className={styles.openLink}>
              Public link
            </a>
          )}
        </div>
      </div>

      <p className={styles.note}>
        <Info size={14} />
        SigNoz&apos;s public dashboard publish currently strips panel filters for v5 dashboards, so the
        embedded public view shows &quot;No Data&quot; even while telemetry is live. These counts are queried
        directly from SigNoz and match the private dashboard panels.
      </p>

      <div className={styles.liveGrid}>
        {SIGNOZ_DASHBOARD_PANELS.map((panel) => {
          const metric = panelMetricValue(panel.metricKey, signoz, recovery ?? null);
          const barWidth = Math.min(100, (Number(metric) || 0) * 8 + 14);
          return (
            <div key={panel.title} className={styles.livePanel}>
              <span>{panel.title}</span>
              <strong>{isLoading ? "…" : metric}</strong>
              <p>{panel.body}</p>
              <div className={styles.liveBar} aria-hidden="true">
                <i style={{ width: `${barWidth}%` }} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
