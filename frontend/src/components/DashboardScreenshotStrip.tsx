"use client";

import { useState } from "react";
import { ArrowRight } from "lucide-react";
import { MetricCard } from "@/components/ui/MetricCard";
import { Disclosure } from "@/components/ui/Disclosure";
import { getSignozDashboardUrl, getSignozPrivateDashboardUrl } from "@/lib/signoz";
import type { ObservabilityData } from "@/hooks/useObservability";
import { panelMetricValue, panelSeries } from "@/lib/observability-metrics";
import { SIGNOZ_DASHBOARD_PANELS } from "@/lib/signoz-config";
import ui from "@/components/ui/weft-ui.module.css";
import styles from "./DashboardScreenshotStrip.module.css";

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
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

  if (!signoz) return null;

  return (
    <div className={`${styles.strip} ${ui.surface} ${ui.surfaceAccent}`} aria-label="Weft Agent Observatory dashboard">
      <div className={styles.liveMirrorHeader}>
        <div>
          <strong className={styles.title}>Weft Autonomous Agent Observatory</strong>
          <span className={styles.liveMirrorLabel}>Live counts · 24h sparklines · SigNoz API</span>
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
        Live counts from the SigNoz API — no login required for judges.
      </p>

      <div style={{ marginBottom: "0.75rem" }}>
        <Disclosure label="Why the public SigNoz dashboard shows No Data">
          <p style={{ margin: 0, color: "var(--c-text-2)", fontSize: "0.82rem", lineHeight: 1.5 }}>
            SigNoz&apos;s public dashboard publish strips panel filters for v5 dashboards, so the embedded
            public view shows &quot;No Data&quot; while telemetry is live. These panels query SigNoz directly
            and match the private dashboard. The private dashboard link above works when logged in.
          </p>
        </Disclosure>
      </div>

      <div className={ui.metricGrid}>
        {SIGNOZ_DASHBOARD_PANELS.map((panel, index) => {
          const value = panelMetricValue(panel.metricKey, signoz, recovery ?? null);
          const series = panelSeries(panel.metricKey, signoz.series ?? undefined);
          const expanded = expandedIndex === index;

          return (
            <MetricCard
              key={panel.title}
              label={panel.title}
              value={value}
              detail={panel.body}
              series={series}
              isLoading={isLoading}
              expanded={expanded}
              staggerIndex={index}
              onToggle={() => setExpandedIndex(expanded ? null : index)}
            />
          );
        })}
      </div>
    </div>
  );
}
