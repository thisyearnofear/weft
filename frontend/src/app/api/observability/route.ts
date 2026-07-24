import { NextResponse } from "next/server";
import { fetchJsonWithTimeout } from "@/lib/fetchWithTimeout";
import {
  SIGNOZ_DEMO_SPAN_COUNTS,
  SIGNOZ_SPAN_NAMES,
  SIGNOZ_WINNING_TRACE_FILTER,
} from "@/lib/signoz-config";
import { fetchSignozLiveSnapshot, type ObservabilitySeries } from "@/lib/signoz-server";

const DEFAULT_STATUS_API = process.env.WEFT_STATUS_API_URL || "http://127.0.0.1:9010";

function demoSeries(base: number, points = 24): number[] {
  return Array.from({ length: points }, (_, i) =>
    Math.max(0, Math.round(base * (0.65 + 0.35 * Math.sin(i / 2.5))))
  );
}

function buildDemoSeries(spanGroups: number, spanCounts: Record<string, number>): ObservabilitySeries {
  const traceBase = 12;
  const llmBase = spanCounts["weft.llm.chat"] ?? 2;
  const toolBase = spanCounts["weft.agent.tool_call"] ?? 3;
  return {
    traceCount: demoSeries(traceBase),
    spanGroups: demoSeries(spanGroups, 24).map(() => spanGroups),
    llmSpans: demoSeries(llmBase),
    toolSpans: demoSeries(toolBase),
    recoveryEvents: demoSeries(1, 24).map((v) => (v > 0 ? 1 : 0)),
  };
}

export async function GET() {
  try {
    const [signoz, recoveryRes] = await Promise.allSettled([
      fetchSignozLiveSnapshot(),
      fetchJsonWithTimeout(`${DEFAULT_STATUS_API}/recovery`, 5000),
    ]);

    const live = signoz.status === "fulfilled" ? signoz.value : null;
    const recoveryRaw =
      recoveryRes.status === "fulfilled" ? (recoveryRes.value as Record<string, unknown>) : null;
    const recoverySummary = recoveryRaw?.summary as Record<string, unknown> | undefined;

    const useDemoFallback = !(live?.configured);
    const spanCounts =
      useDemoFallback && (!live?.spanCounts || Object.keys(live.spanCounts).length === 0)
        ? SIGNOZ_DEMO_SPAN_COUNTS
        : (live?.spanCounts ?? {});

    const totalSpans =
      live?.totalSpans ??
      (useDemoFallback
        ? SIGNOZ_SPAN_NAMES.reduce((sum, name) => sum + (spanCounts[name] ?? 0), 0)
        : 0);

    const spanGroups =
      live?.spanGroups ??
      (useDemoFallback ? SIGNOZ_SPAN_NAMES.length : Object.keys(spanCounts).length);

    const series =
      live?.series ??
      (useDemoFallback ? buildDemoSeries(spanGroups, spanCounts as Record<string, number>) : null);

    // "live" means we actually got data from SigNoz in the query window,
    // not just that credentials are configured. A configured-but-empty
    // SigNoz should still show "Demo snapshot" so judges aren't misled.
    const actuallyLive = Boolean(
      live?.configured && (live.traceCount != null || (live.totalSpans ?? 0) > 0)
    );

    return NextResponse.json(
      {
        ok: true,
        filter: SIGNOZ_WINNING_TRACE_FILTER,
        signoz: {
          configured: live?.configured ?? false,
          live: actuallyLive,
          traceCount: live?.traceCount ?? null,
          lastTraceAt: live?.lastTraceAt ?? null,
          spanCounts,
          totalSpans,
          spanGroups,
          llmSpan: live?.llmSpan ?? null,
          series,
          alerts: live?.alerts ?? [],
        },
        recovery: recoveryRaw
          ? {
              totalEvents: Number(recoverySummary?.totalEvents ?? 0),
              failures: Number(recoverySummary?.failures ?? 0),
              recoveries: Number(recoverySummary?.recoveries ?? 0),
              verdictLanded: Boolean(recoverySummary?.verdictLanded),
            }
          : null,
      },
      { headers: { "cache-control": "no-store" } }
    );
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: "observability_fetch_failed",
        detail: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
