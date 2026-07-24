import {
  SIGNOZ_ALERTS,
  SIGNOZ_DASHBOARD_ID,
  SIGNOZ_WINNING_TRACE_FILTER,
} from "@/lib/signoz-config";

export {
  SIGNOZ_ALERTS,
  SIGNOZ_DASHBOARD_ID,
  SIGNOZ_DASHBOARD_PANELS,
  SIGNOZ_DEMO_SPAN_COUNTS,
  SIGNOZ_SPAN_NAMES,
  SIGNOZ_WINNING_TRACE_FILTER,
} from "@/lib/signoz-config";

const DEFAULT_INSTANCE = "https://modest-mosquito.us2.signoz.cloud";

export function getSignozInstanceUrl(): string {
  return process.env.NEXT_PUBLIC_SIGNOZ_INSTANCE_URL?.trim() || DEFAULT_INSTANCE;
}

export function getSignozDashboardUrl(): string | null {
  const url = process.env.NEXT_PUBLIC_SIGNOZ_DASHBOARD_URL?.trim();
  if (url) return url;
  return `${getSignozInstanceUrl().replace(/\/$/, "")}/dashboard/${SIGNOZ_DASHBOARD_ID}`;
}

export function getSignozTracesExplorerUrl(filter = SIGNOZ_WINNING_TRACE_FILTER): string {
  const base = getSignozInstanceUrl().replace(/\/$/, "");
  return `${base}/traces-explorer?filter=${encodeURIComponent(filter)}`;
}

export function getSignozAlertsUrl(tab: "rules" | "triggered" = "rules"): string {
  const base = getSignozInstanceUrl().replace(/\/$/, "");
  return tab === "triggered" ? `${base}/alerts?tab=Triggered` : `${base}/alerts`;
}

export function getSignozAlertEditUrl(alertId: string): string {
  const base = getSignozInstanceUrl().replace(/\/$/, "");
  return `${base}/alerts/edit/${alertId}`;
}

export function getSignozAlertBySlug(slug: string) {
  return SIGNOZ_ALERTS.find((a) => a.slug === slug);
}
