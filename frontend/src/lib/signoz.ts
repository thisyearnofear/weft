const DEFAULT_INSTANCE = "https://modest-mosquito.us2.signoz.cloud";
const WINNING_TRACE_FILTER =
  "service.name = 'weft-daemon' AND weft.milestone_hash = '0xwinningagent2'";

export function getSignozInstanceUrl(): string {
  return process.env.NEXT_PUBLIC_SIGNOZ_INSTANCE_URL?.trim() || DEFAULT_INSTANCE;
}

export function getSignozDashboardUrl(): string | null {
  const url = process.env.NEXT_PUBLIC_SIGNOZ_DASHBOARD_URL?.trim();
  return url || null;
}

export function getSignozTracesExplorerUrl(filter = WINNING_TRACE_FILTER): string {
  const base = getSignozInstanceUrl().replace(/\/$/, "");
  return `${base}/traces-explorer?filter=${encodeURIComponent(filter)}`;
}

export function getSignozAlertsUrl(): string {
  const base = getSignozInstanceUrl().replace(/\/$/, "");
  return `${base}/alerts`;
}

export const SIGNOZ_WINNING_TRACE_FILTER = WINNING_TRACE_FILTER;
