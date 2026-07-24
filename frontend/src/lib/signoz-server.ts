import "server-only";

import { fetchWithTimeout } from "@/lib/fetchWithTimeout";
import {
  SIGNOZ_ALERTS,
  SIGNOZ_SPAN_NAMES,
  SIGNOZ_WINNING_TRACE_FILTER,
  type SignozSpanName,
} from "@/lib/signoz-config";

const QUERY_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

export interface SignozLiveSnapshot {
  configured: boolean;
  traceCount: number | null;
  lastTraceAt: number | null;
  spanCounts: Partial<Record<SignozSpanName, number>>;
  totalSpans: number | null;
  spanGroups: number | null;
  alerts: Array<{
    id: string;
    slug: string;
    name: string;
    filter: string;
    state: "ok" | "firing" | "disabled" | "unknown";
    url: string;
  }>;
}

function endpoint(): string | null {
  const raw =
    process.env.SIGNOZ_ENDPOINT?.trim() ||
    process.env.SIGNOZ_INSTANCE_URL?.trim() ||
    process.env.NEXT_PUBLIC_SIGNOZ_INSTANCE_URL?.trim();
  return raw ? raw.replace(/\/$/, "") : null;
}

function apiKey(): string | null {
  return (
    process.env.SIGNOZ_ACCESS_TOKEN?.trim() ||
    process.env.SIGNOZ_API_KEY?.trim() ||
    null
  );
}

function alertEditUrl(base: string, id: string): string {
  return `${base}/alerts/edit/${id}`;
}

async function signozJson<T>(path: string, init?: RequestInit): Promise<T | null> {
  const base = endpoint();
  const key = apiKey();
  if (!base || !key) return null;

  try {
    const res = await fetchWithTimeout(
      `${base}${path}`,
      {
        ...init,
        cache: "no-store",
        headers: {
          "Content-Type": "application/json",
          "SIGNOZ-API-KEY": key,
          ...(init?.headers ?? {}),
        },
      },
      8000
    );
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

function windowRange(): { start: number; end: number } {
  const end = Date.now();
  return { start: end - QUERY_WINDOW_MS, end };
}

function scalarFromResponse(body: unknown): number | null {
  if (!body || typeof body !== "object") return null;
  const data = (body as { data?: { result?: unknown[] } }).data?.result;
  if (!Array.isArray(data) || data.length === 0) return null;

  for (const item of data) {
    if (!item || typeof item !== "object") continue;
    const table = (item as { table?: { rows?: unknown[][] } }).table;
    const row = table?.rows?.[0];
    if (Array.isArray(row) && row.length > 0) {
      const value = row[0];
      if (typeof value === "number" && Number.isFinite(value)) return value;
      if (typeof value === "string" && value.trim() !== "") {
        const parsed = Number(value);
        if (Number.isFinite(parsed)) return parsed;
      }
    }
    const series = (item as { series?: Array<{ values?: Array<{ value?: number | string }> }> }).series;
    const point = series?.[0]?.values?.[series[0].values.length - 1]?.value;
    if (typeof point === "number" && Number.isFinite(point)) return point;
    if (typeof point === "string") {
      const parsed = Number(point);
      if (Number.isFinite(parsed)) return parsed;
    }
  }
  return null;
}

function groupedCountsFromResponse(body: unknown): Record<string, number> {
  const out: Record<string, number> = {};
  if (!body || typeof body !== "object") return out;
  const data = (body as { data?: { result?: unknown[] } }).data?.result;
  if (!Array.isArray(data)) return out;

  for (const item of data) {
    if (!item || typeof item !== "object") continue;
    const table = (item as { table?: { columns?: Array<{ name?: string }>; rows?: unknown[][] } }).table;
    if (!table?.rows?.length || !table.columns?.length) continue;

    const nameIdx = table.columns.findIndex((c) => c.name === "name" || c.name === "span_name");
    const countIdx = table.columns.findIndex((c) =>
      ["span_count", "trace_count", "count", "value"].includes(String(c.name))
    );
    if (nameIdx < 0 || countIdx < 0) continue;

    for (const row of table.rows) {
      const name = row[nameIdx];
      const count = row[countIdx];
      if (typeof name !== "string") continue;
      const n = typeof count === "number" ? count : Number(count);
      if (Number.isFinite(n)) out[name] = n;
    }
  }
  return out;
}

function timestampFromRawResponse(body: unknown): number | null {
  if (!body || typeof body !== "object") return null;
  const data = (body as { data?: { result?: unknown[] } }).data?.result;
  if (!Array.isArray(data)) return null;

  for (const item of data) {
    const list = (item as { list?: Array<{ timestamp?: number | string }> }).list;
    const ts = list?.[0]?.timestamp;
    if (typeof ts === "number" && Number.isFinite(ts)) return ts;
    if (typeof ts === "string") {
      const parsed = Number(ts);
      if (Number.isFinite(parsed)) return parsed;
    }
  }
  return null;
}

async function queryScalar(filter: string): Promise<number | null> {
  const { start, end } = windowRange();
  const body = await signozJson<unknown>("/api/v5/query_range", {
    method: "POST",
    body: JSON.stringify({
      start,
      end,
      requestType: "scalar",
      variables: {},
      compositeQuery: {
        queries: [
          {
            type: "builder_query",
            spec: {
              name: "A",
              signal: "traces",
              filter: { expression: filter },
              aggregations: [{ expression: "count()", alias: "trace_count" }],
              disabled: false,
            },
          },
        ],
      },
    }),
  });
  return scalarFromResponse(body);
}

async function querySpanCounts(filter: string): Promise<Record<string, number>> {
  const { start, end } = windowRange();
  const body = await signozJson<unknown>("/api/v5/query_range", {
    method: "POST",
    body: JSON.stringify({
      start,
      end,
      requestType: "scalar",
      variables: {},
      compositeQuery: {
        queries: [
          {
            type: "builder_query",
            spec: {
              name: "A",
              signal: "traces",
              filter: { expression: filter },
              aggregations: [{ expression: "count()", alias: "span_count" }],
              groupBy: [{ name: "name", fieldContext: "span" }],
              disabled: false,
            },
          },
        ],
      },
    }),
  });
  return groupedCountsFromResponse(body);
}

async function queryLastTraceAt(filter: string): Promise<number | null> {
  const { start, end } = windowRange();
  const body = await signozJson<unknown>("/api/v5/query_range", {
    method: "POST",
    body: JSON.stringify({
      start,
      end,
      requestType: "raw",
      variables: {},
      compositeQuery: {
        queries: [
          {
            type: "builder_query",
            spec: {
              name: "A",
              signal: "traces",
              filter: { expression: filter },
              selectFields: [{ name: "timestamp", fieldContext: "span" }],
              order: [{ key: { name: "timestamp", fieldContext: "span" }, direction: "desc" }],
              limit: 1,
              offset: 0,
              disabled: false,
            },
          },
        ],
      },
    }),
  });
  return timestampFromRawResponse(body);
}

interface SignozRuleRow {
  id?: string;
  alert?: string;
  alertName?: string;
  disabled?: boolean;
  state?: string;
  status?: string;
}

async function fetchAlertStates(): Promise<Map<string, "ok" | "firing" | "disabled" | "unknown">> {
  const states = new Map<string, "ok" | "firing" | "disabled" | "unknown">();
  for (const alert of SIGNOZ_ALERTS) states.set(alert.id, "unknown");

  const rulesBody = await signozJson<{ data?: SignozRuleRow[] } | SignozRuleRow[]>("/api/v1/rules");
  const rows = Array.isArray(rulesBody)
    ? rulesBody
    : Array.isArray(rulesBody?.data)
      ? rulesBody.data
      : [];

  for (const row of rows) {
    const id = row.id;
    if (!id || !states.has(id)) continue;
    if (row.disabled) {
      states.set(id, "disabled");
      continue;
    }
    const raw = String(row.state ?? row.status ?? "").toLowerCase();
    if (raw.includes("firing") || raw.includes("alerting") || raw.includes("active")) {
      states.set(id, "firing");
    } else if (raw.includes("disabled")) {
      states.set(id, "disabled");
    } else if (raw) {
      states.set(id, "ok");
    }
  }

  const triggeredBody = await signozJson<{ data?: Array<{ ruleId?: string; alert?: string }> }>(
    "/api/v1/alerts?active=true"
  );
  const triggered = triggeredBody?.data ?? [];
  for (const hit of triggered) {
    const id = hit.ruleId;
    if (id && states.has(id)) states.set(id, "firing");
  }

  return states;
}

export async function fetchSignozLiveSnapshot(): Promise<SignozLiveSnapshot> {
  const base = endpoint();
  const configured = Boolean(base && apiKey());
  const filter = SIGNOZ_WINNING_TRACE_FILTER;

  const [traceCount, spanCountsRaw, lastTraceAt, alertStates] = configured
    ? await Promise.all([
        queryScalar(filter),
        querySpanCounts(filter),
        queryLastTraceAt(filter),
        fetchAlertStates(),
      ])
    : [null, {} as Record<string, number>, null, new Map<string, "ok" | "firing" | "disabled" | "unknown">()];

  const spanCounts: Partial<Record<SignozSpanName, number>> = {};
  let totalSpans = 0;
  for (const name of SIGNOZ_SPAN_NAMES) {
    const count = spanCountsRaw[name];
    if (typeof count === "number" && count > 0) {
      spanCounts[name] = count;
      totalSpans += count;
    }
  }

  const spanGroups = Object.keys(spanCounts).length || null;

  return {
    configured,
    traceCount,
    lastTraceAt,
    spanCounts,
    totalSpans: totalSpans > 0 ? totalSpans : null,
    spanGroups: spanGroups && spanGroups > 0 ? spanGroups : null,
    alerts: SIGNOZ_ALERTS.map((alert) => ({
      id: alert.id,
      slug: alert.slug,
      name: alert.name,
      filter: alert.filter,
      state: alertStates.get(alert.id) ?? "unknown",
      url: base ? alertEditUrl(base, alert.id) : "",
    })),
  };
}
