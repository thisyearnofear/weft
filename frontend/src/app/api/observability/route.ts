import { NextResponse } from "next/server";
import { fetchJsonWithTimeout } from "@/lib/fetchWithTimeout";
import {
  SIGNOZ_DEMO_SPAN_COUNTS,
  SIGNOZ_SPAN_NAMES,
  SIGNOZ_WINNING_TRACE_FILTER,
} from "@/lib/signoz-config";
import { fetchSignozLiveSnapshot } from "@/lib/signoz-server";

const DEFAULT_STATUS_API = process.env.WEFT_STATUS_API_URL || "http://127.0.0.1:9010";

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

    const spanCounts = live?.spanCounts && Object.keys(live.spanCounts).length > 0
      ? live.spanCounts
      : SIGNOZ_DEMO_SPAN_COUNTS;

    const totalSpans =
      live?.totalSpans ??
      SIGNOZ_SPAN_NAMES.reduce((sum, name) => sum + (spanCounts[name] ?? 0), 0);

    const spanGroups = live?.spanGroups ?? SIGNOZ_SPAN_NAMES.length;

    return NextResponse.json(
      {
        ok: true,
        filter: SIGNOZ_WINNING_TRACE_FILTER,
        signoz: {
          configured: live?.configured ?? false,
          live: live?.configured ? true : false,
          traceCount: live?.traceCount ?? null,
          lastTraceAt: live?.lastTraceAt ?? null,
          spanCounts,
          totalSpans,
          spanGroups,
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
