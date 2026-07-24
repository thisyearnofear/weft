"use client";

import { ArrowRight } from "lucide-react";
import { getSignozDashboardUrl } from "@/lib/signoz";
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
  const dashboardUrl = getSignozDashboardUrl();
  if (!dashboardUrl) return null;

  return (
    <div className={styles.strip}>
      {signoz && (
        <div className={styles.liveMirror} aria-label="Live dashboard counts from Weft API">
          <div className={styles.liveMirrorHeader}>
            <span className={styles.liveMirrorLabel}>Live dashboard counts (SigNoz-backed)</span>
            <a href={dashboardUrl} target="_blank" rel="noopener noreferrer" className={styles.openLink}>
              Open in SigNoz <ArrowRight size={14} />
            </a>
          </div>
          <div className={styles.liveGrid}>
            {SIGNOZ_DASHBOARD_PANELS.map((panel) => {
              const metric = panelMetricValue(panel.metricKey, signoz, recovery ?? null);
              const barWidth = Math.min(100, (Number(metric) || 0) * 8 + 14);
              return (
                <div key={panel.title} className={styles.livePanel}>
                  <span>{panel.title}</span>
                  <strong>{isLoading ? "…" : metric}</strong>
                  <div className={styles.liveBar} aria-hidden="true">
                    <i style={{ width: `${barWidth}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className={styles.embedBlock}>
        <div className={styles.header}>
          <strong>SigNoz dashboard embed</strong>
          <span className={styles.timeHint}>Last 24 hours · use Run demo trace if panels are empty</span>
        </div>
        <iframe
          src={dashboardUrl}
          title="Weft Agent Observatory — SigNoz dashboard"
          className={styles.iframe}
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
        />
      </div>
    </div>
  );
}
