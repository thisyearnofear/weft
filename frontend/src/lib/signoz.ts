import {
  SIGNOZ_ALERTS,
  SIGNOZ_DASHBOARD_ID,
  SIGNOZ_PUBLIC_DASHBOARD_URL,
  SIGNOZ_WINNING_TRACE_FILTER,
} from "@/lib/signoz-config";

export {
  SIGNOZ_ALERTS,
  SIGNOZ_DASHBOARD_ID,
  SIGNOZ_DASHBOARD_PANELS,
  SIGNOZ_DEMO_SPAN_COUNTS,
  SIGNOZ_PUBLIC_DASHBOARD_URL,
  SIGNOZ_SPAN_NAMES,
  SIGNOZ_WINNING_TRACE_FILTER,
} from "@/lib/signoz-config";

export const SIGNOZ_WINNING_MILESTONE_HASH = "0xwinningagent2";

const DEFAULT_INSTANCE = "https://modest-mosquito.us2.signoz.cloud";
const DEFAULT_DASHBOARD_RELATIVE_TIME = "1d";

function withDashboardTimeRange(url: string, relativeTime = DEFAULT_DASHBOARD_RELATIVE_TIME): string {
  try {
    const parsed = new URL(url);
    if (!parsed.searchParams.has("relativeTime") && !parsed.searchParams.has("startTime")) {
      parsed.searchParams.set("relativeTime", relativeTime);
    }
    return parsed.toString();
  } catch {
    const joiner = url.includes("?") ? "&" : "?";
    return `${url}${joiner}relativeTime=${encodeURIComponent(relativeTime)}`;
  }
}

export function getSignozInstanceUrl(): string {
  return process.env.NEXT_PUBLIC_SIGNOZ_INSTANCE_URL?.trim() || DEFAULT_INSTANCE;
}

export function getSignozDashboardUrl(): string | null {
  const url = process.env.NEXT_PUBLIC_SIGNOZ_DASHBOARD_URL?.trim();
  const base = url || SIGNOZ_PUBLIC_DASHBOARD_URL;
  return withDashboardTimeRange(base);
}

export function getSignozTracesExplorerUrl(filter = SIGNOZ_WINNING_TRACE_FILTER): string {
  const base = getSignozInstanceUrl().replace(/\/$/, "");
  return `${base}/traces-explorer?filter=${encodeURIComponent(filter)}`;
}

/** Deep link for a single span name within the winning demo trace. */
export function getSignozSpanExplorerUrl(spanName: string): string {
  const filter = `${SIGNOZ_WINNING_TRACE_FILTER} AND name = '${spanName}'`;
  return getSignozTracesExplorerUrl(filter);
}

export function getSignozLogExplorerUrl(filter: string): string {
  const base = getSignozInstanceUrl().replace(/\/$/, "");
  return `${base}/logs/logs-explorer?filter=${encodeURIComponent(filter)}`;
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
