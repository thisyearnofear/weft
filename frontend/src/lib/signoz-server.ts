import "server-only";

import { fetchWithTimeout } from "@/lib/fetchWithTimeout";
import {
  SIGNOZ_ALERTS,
  SIGNOZ_SPAN_NAMES,
  SIGNOZ_WINNING_TRACE_FILTER,
  type SignozSpanName,
} from "@/lib/signoz-config";

const QUERY_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

export interface LlmSpanAttrs {
  backend: string | null;
  model: string | null;
  inputTokens: number | null;
  outputTokens: number | null;
  totalTokens: number | null;
  costUsd: number | null;
  outcome: string | null;
}

export interface ObservabilitySeries {
  traceCount: number[];
  spanGroups: number[];
  llmSpans: number[];
  toolSpans: number[];
  recoveryEvents: number[];
}

export interface SignozLiveSnapshot {
  configured: boolean;
  traceCount: number | null;
  lastTraceAt: number | null;
  spanCounts: Partial<Record<SignozSpanName, number>>;
  totalSpans: number | null;
  spanGroups: number | null;
  llmSpan: LlmSpanAttrs | null;
  series: ObservabilitySeries | null;
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

function parseNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

function normalizeTimestamp(value: unknown): number | null {
  const n = parseNumber(value);
  if (n == null) return null;
  if (n > 1e15) return Math.round(n / 1_000_000);
  if (n > 1e12) return Math.round(n / 1_000);
  return Math.round(n);
}

function scalarFromResponse(body: unknown): number | null {
  if (!body || typeof body !== "object") return null;

  const v5Results = (body as { data?: { data?: { results?: unknown[] } } }).data?.data?.results;
  if (Array.isArray(v5Results) && v5Results.length > 0) {
    const first = v5Results[0] as { data?: unknown[][] };
    const cell = first.data?.[0]?.[0];
    const n = parseNumber(cell);
    if (n != null) return n;
  }

  const data = (body as { data?: { result?: unknown[] } }).data?.result;
  if (!Array.isArray(data) || data.length === 0) return null;

  for (const item of data) {
    if (!item || typeof item !== "object") continue;
    const table = (item as { table?: { rows?: unknown[][] } }).table;
    const row = table?.rows?.[0];
    if (Array.isArray(row)) {
      for (const cell of row) {
        const n = parseNumber(cell);
        if (n != null) return n;
      }
    }
    const series = (item as { series?: Array<{ values?: Array<{ value?: number | string }> }> }).series;
    if (series?.length) {
      for (const s of series) {
        const values = s.values ?? [];
        for (let i = values.length - 1; i >= 0; i -= 1) {
          const n = parseNumber(values[i]?.value);
          if (n != null) return n;
        }
      }
    }
    const aggValue = (item as { aggStats?: Array<{ value?: unknown }> }).aggStats?.[0]?.value;
    const aggN = parseNumber(aggValue);
    if (aggN != null) return aggN;
  }
  return null;
}

function groupedCountsFromResponse(body: unknown): Record<string, number> {
  const out: Record<string, number> = {};
  if (!body || typeof body !== "object") return out;

  const v5Results = (body as { data?: { data?: { results?: unknown[] } } }).data?.data?.results;
  if (Array.isArray(v5Results)) {
    for (const result of v5Results) {
      if (!result || typeof result !== "object") continue;
      const rows = (result as { data?: unknown[][] }).data;
      if (!Array.isArray(rows)) continue;
      for (const row of rows) {
        if (!Array.isArray(row) || row.length < 2) continue;
        const name = row[0];
        const count = row[row.length - 1];
        if (typeof name !== "string") continue;
        const n = parseNumber(count);
        if (n != null) out[name] = n;
      }
    }
    if (Object.keys(out).length > 0) return out;
  }

  const data = (body as { data?: { result?: unknown[] } }).data?.result;
  if (!Array.isArray(data)) return out;

  for (const item of data) {
    if (!item || typeof item !== "object") continue;
    const table = (item as { table?: { columns?: Array<{ name?: string }>; rows?: unknown[][] } }).table;
    if (table?.rows?.length && table.columns?.length) {
      const nameIdx = table.columns.findIndex((c) =>
        ["name", "span_name", "span.name", "attribute.name"].includes(String(c.name))
      );
      const countIdx = table.columns.findIndex((c) =>
        ["span_count", "trace_count", "count", "value", "A"].includes(String(c.name))
      );
      if (nameIdx >= 0 && countIdx >= 0) {
        for (const row of table.rows) {
          const name = row[nameIdx];
          const count = row[countIdx];
          if (typeof name !== "string") continue;
          const n = parseNumber(count);
          if (n != null) out[name] = n;
        }
        continue;
      }
      for (const row of table.rows) {
        if (!Array.isArray(row) || row.length < 2) continue;
        const name = row.find((cell) => typeof cell === "string");
        const count = row.map(parseNumber).find((n) => n != null);
        if (typeof name === "string" && count != null) out[name] = count;
      }
    }
    const series = (item as { series?: Array<{ labels?: Record<string, string>; values?: Array<{ value?: unknown }> }> }).series;
    for (const s of series ?? []) {
      const name = s.labels?.name ?? s.labels?.["span.name"];
      const last = s.values?.[s.values.length - 1]?.value;
      const n = parseNumber(last);
      if (name && n != null) out[name] = n;
    }
  }
  return out;
}

function timestampFromRawResponse(body: unknown): number | null {
  if (!body || typeof body !== "object") return null;

  const v5Results = (body as { data?: { data?: { results?: unknown[] } } }).data?.data?.results;
  if (Array.isArray(v5Results)) {
    for (const result of v5Results) {
      const rows = (result as { rows?: Array<Record<string, unknown>> }).rows;
      for (const entry of rows ?? []) {
        const iso =
          (typeof entry.timestamp === "string" ? entry.timestamp : null) ??
          (typeof entry.data === "object" && entry.data && typeof (entry.data as { timestamp?: unknown }).timestamp === "string"
            ? (entry.data as { timestamp: string }).timestamp
            : null);
        if (iso) {
          const parsed = Date.parse(iso);
          if (Number.isFinite(parsed)) return parsed;
        }
      }
    }
  }

  const data = (body as { data?: { result?: unknown[] } }).data?.result;
  if (!Array.isArray(data)) return null;

  for (const item of data) {
    if (!item || typeof item !== "object") continue;
    const list = (item as { list?: Array<Record<string, unknown>> }).list;
    for (const entry of list ?? []) {
      const ts =
        normalizeTimestamp(entry.timestamp) ??
        normalizeTimestamp(entry.startTime) ??
        normalizeTimestamp(entry.startTimeUnixNano) ??
        normalizeTimestamp(entry.timeUnixNano);
      if (ts != null) return ts;
      const dataField = entry.data;
      if (dataField && typeof dataField === "object") {
        const nested = normalizeTimestamp((dataField as { timestamp?: unknown }).timestamp);
        if (nested != null) return nested;
      }
    }
    const records = (item as { records?: Array<Record<string, unknown>> }).records;
    for (const entry of records ?? []) {
      const ts = normalizeTimestamp(entry.timestamp) ?? normalizeTimestamp(entry.time);
      if (ts != null) return ts;
    }
  }
  return null;
}

function attrsFromRawResponse(body: unknown): Record<string, string | number | boolean> {
  const out: Record<string, string | number | boolean> = {};
  if (!body || typeof body !== "object") return out;

  const v5Results = (body as { data?: { data?: { results?: unknown[] } } }).data?.data?.results;
  if (Array.isArray(v5Results)) {
    for (const result of v5Results) {
      const rows = (result as { rows?: Array<Record<string, unknown>> }).rows;
      const entry = rows?.[0];
      if (!entry) continue;
      const dataField = entry.data;
      if (dataField && typeof dataField === "object") {
        for (const [key, value] of Object.entries(dataField as Record<string, unknown>)) {
          if (key.startsWith("weft.") || key.startsWith("gen_ai.")) {
            if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
              out[key] = value;
            }
          }
        }
      }
      for (const [key, value] of Object.entries(entry)) {
        if (key.startsWith("weft.") || key.startsWith("gen_ai.")) {
          if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
            out[key] = value;
          }
        }
      }
    }
    if (Object.keys(out).length > 0) return out;
  }

  const data = (body as { data?: { result?: unknown[] } }).data?.result;
  if (!Array.isArray(data)) return out;

  for (const item of data) {
    const list = (item as { list?: Array<Record<string, unknown>> }).list;
    const entry = list?.[0];
    if (!entry) continue;
    const attrs =
      (entry.attributes as Record<string, unknown> | undefined) ??
      (entry.data as { attributes?: Record<string, unknown> } | undefined)?.attributes;
    if (!attrs || typeof attrs !== "object") continue;
    for (const [key, value] of Object.entries(attrs)) {
      if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
        out[key] = value;
      }
    }
    for (const [key, value] of Object.entries(entry)) {
      if (key.startsWith("weft.") || key.startsWith("gen_ai.")) {
        if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
          out[key] = value;
        }
      }
    }
  }
  return out;
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

function timeSeriesFromResponse(body: unknown): number[] {
  if (!body || typeof body !== "object") return [];
  const results = (body as { data?: { data?: { results?: unknown[] } } }).data?.data?.results;
  if (!Array.isArray(results) || results.length === 0) return [];

  const first = results[0] as {
    aggregations?: Array<{
      series?: Array<{
        values?: Array<{ value?: unknown }>;
      }>;
    }>;
  };
  const values = first.aggregations?.[0]?.series?.[0]?.values ?? [];
  return values
    .map((point) => parseNumber(point.value) ?? 0)
    .reverse();
}

async function queryTimeSeries(filter: string, hours = 24): Promise<number[]> {
  const end = Date.now();
  const start = end - hours * 3600 * 1000;
  const body = await signozJson<unknown>("/api/v5/query_range", {
    method: "POST",
    body: JSON.stringify({
      start,
      end,
      requestType: "time_series",
      variables: {},
      compositeQuery: {
        queries: [
          {
            type: "builder_query",
            spec: {
              name: "A",
              signal: "traces",
              filter: { expression: filter },
              aggregations: [{ expression: "count()" }],
              stepInterval: 3600,
              disabled: false,
            },
          },
        ],
      },
    }),
  });
  return timeSeriesFromResponse(body);
}

async function queryLlmSpanAttrs(filter: string): Promise<LlmSpanAttrs | null> {
  const llmFilter = `${filter} AND name = 'weft.llm.chat'`;
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
              filter: { expression: llmFilter },
              selectFields: [
                { name: "weft.llm.backend", fieldContext: "span" },
                { name: "weft.llm.model", fieldContext: "span" },
                { name: "gen_ai.usage.input_tokens", fieldContext: "span" },
                { name: "gen_ai.usage.output_tokens", fieldContext: "span" },
                { name: "gen_ai.usage.total_tokens", fieldContext: "span" },
                { name: "weft.llm.cost_usd", fieldContext: "span" },
                { name: "weft.llm.outcome", fieldContext: "span" },
              ],
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

  const attrs = attrsFromRawResponse(body);
  if (Object.keys(attrs).length === 0) return null;

  return {
    backend: typeof attrs["weft.llm.backend"] === "string" ? attrs["weft.llm.backend"] : null,
    model:
      typeof attrs["weft.llm.model"] === "string"
        ? attrs["weft.llm.model"]
        : typeof attrs["gen_ai.request.model"] === "string"
          ? attrs["gen_ai.request.model"]
          : null,
    inputTokens: parseNumber(attrs["gen_ai.usage.input_tokens"]),
    outputTokens: parseNumber(attrs["gen_ai.usage.output_tokens"]),
    totalTokens: parseNumber(attrs["gen_ai.usage.total_tokens"]),
    costUsd: parseNumber(attrs["weft.llm.cost_usd"]),
    outcome: typeof attrs["weft.llm.outcome"] === "string" ? attrs["weft.llm.outcome"] : null,
  };
}

interface SignozRuleRow {
  id?: string;
  alert?: string;
  alertName?: string;
  disabled?: boolean;
  state?: string;
  status?: string;
}

const ALERT_NAME_HINTS: Record<string, string[]> = {
  keeperhub_fallback: ["keeperhub", "fallback"],
  peer_quorum_degraded: ["quorum", "degraded", "consensus"],
  llm_narrative_failures: ["llm", "narrative", "failure"],
};

function ruleMatchesAlert(row: SignozRuleRow, alert: (typeof SIGNOZ_ALERTS)[number]): boolean {
  if (row.id === alert.id) return true;
  const label = String(row.alert ?? row.alertName ?? "").toLowerCase();
  if (!label) return false;
  const hints = ALERT_NAME_HINTS[alert.slug] ?? [];
  return hints.some((hint) => label.includes(hint)) || label.includes(alert.name.toLowerCase().slice(0, 12));
}

async function fetchAlertStates(): Promise<Map<string, "ok" | "firing" | "disabled" | "unknown">> {
  const states = new Map<string, "ok" | "firing" | "disabled" | "unknown">();
  for (const alert of SIGNOZ_ALERTS) states.set(alert.id, "unknown");

  const rulesBody = await signozJson<{ data?: { rules?: SignozRuleRow[] }; rules?: SignozRuleRow[] } | SignozRuleRow[]>(
    "/api/v1/rules"
  );
  const rows: SignozRuleRow[] = Array.isArray(rulesBody)
    ? rulesBody
    : Array.isArray(rulesBody?.data)
      ? rulesBody.data
      : Array.isArray(rulesBody?.data?.rules)
        ? rulesBody.data.rules
        : Array.isArray(rulesBody?.rules)
          ? rulesBody.rules
          : [];

  for (const row of rows) {
    for (const alert of SIGNOZ_ALERTS) {
      if (!ruleMatchesAlert(row, alert)) continue;
      if (row.disabled) {
        states.set(alert.id, "disabled");
        continue;
      }
      const raw = String(row.state ?? row.status ?? "").toLowerCase();
      if (raw.includes("firing") || raw.includes("alerting") || raw.includes("active")) {
        states.set(alert.id, "firing");
      } else if (raw.includes("disabled")) {
        states.set(alert.id, "disabled");
      } else if (raw) {
        states.set(alert.id, "ok");
      }
    }
  }

  const triggeredPaths = ["/api/v1/alerts?active=true", "/api/v1/alerts"];
  for (const path of triggeredPaths) {
    const triggeredBody = await signozJson<{
      data?: Array<{ ruleId?: string; alert?: string; labels?: Record<string, string> }>;
    }>(path);
    for (const hit of triggeredBody?.data ?? []) {
      const ruleId = hit.ruleId;
      if (ruleId && states.has(ruleId)) {
        states.set(ruleId, "firing");
        continue;
      }
      const alertLabel = String(hit.alert ?? "").toLowerCase();
      for (const alert of SIGNOZ_ALERTS) {
        const hints = ALERT_NAME_HINTS[alert.slug] ?? [];
        if (hints.some((hint) => alertLabel.includes(hint))) {
          states.set(alert.id, "firing");
        }
      }
    }
  }

  for (const alert of SIGNOZ_ALERTS) {
    if (states.get(alert.id) === "unknown") {
      states.set(alert.id, "ok");
    }
  }

  return states;
}

export async function fetchSignozLiveSnapshot(): Promise<SignozLiveSnapshot> {
  const base = endpoint();
  const configured = Boolean(base && apiKey());
  const filter = SIGNOZ_WINNING_TRACE_FILTER;

  const [traceCount, spanCountsRaw, lastTraceAt, alertStates, llmSpan, traceSeries, llmSeries, toolSeries, recoverySeries] =
    configured
    ? await Promise.all([
        queryScalar(filter),
        querySpanCounts(filter),
        queryLastTraceAt(filter),
        fetchAlertStates(),
        queryLlmSpanAttrs(filter),
        queryTimeSeries(filter, 24),
        queryTimeSeries(`${filter} AND name = 'weft.llm.chat'`, 24),
        queryTimeSeries(`${filter} AND name = 'weft.agent.tool_call'`, 24),
        queryTimeSeries(`${filter} AND name = 'weft.recovery'`, 24),
      ])
    : [
        null,
        {} as Record<string, number>,
        null,
        new Map<string, "ok" | "firing" | "disabled" | "unknown">(),
        null,
        [] as number[],
        [] as number[],
        [] as number[],
        [] as number[],
      ];

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

  const series: ObservabilitySeries | null =
    configured && traceSeries.length > 0
      ? {
          traceCount: traceSeries,
          spanGroups: Array.from({ length: traceSeries.length }, () => spanGroups ?? 0),
          llmSpans: llmSeries,
          toolSpans: toolSeries,
          recoveryEvents: recoverySeries,
        }
      : null;

  return {
    configured,
    traceCount,
    lastTraceAt,
    spanCounts,
    totalSpans: totalSpans > 0 ? totalSpans : null,
    spanGroups: spanGroups && spanGroups > 0 ? spanGroups : null,
    llmSpan,
    series,
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
