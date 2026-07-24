"use client";

import { useQuery } from "@tanstack/react-query";
import type { SignozSpanName } from "@/lib/signoz-config";

export interface ObservabilityAlert {
  id: string;
  slug: string;
  name: string;
  filter: string;
  state: "ok" | "firing" | "disabled" | "unknown";
  url: string;
}

export interface ObservabilityData {
  ok: boolean;
  filter: string;
  signoz: {
    configured: boolean;
    live: boolean;
    traceCount: number | null;
    lastTraceAt: number | null;
    spanCounts: Partial<Record<SignozSpanName, number>>;
    totalSpans: number;
    spanGroups: number;
    alerts: ObservabilityAlert[];
  };
  recovery: {
    totalEvents: number;
    failures: number;
    recoveries: number;
    verdictLanded: boolean;
  } | null;
}

async function fetchObservability(): Promise<ObservabilityData> {
  const res = await fetch("/api/observability", { cache: "no-store" });
  if (!res.ok) throw new Error(`Observability fetch failed: ${res.status}`);
  return res.json();
}

export function useObservability() {
  return useQuery({
    queryKey: ["observability"],
    queryFn: fetchObservability,
    staleTime: 20_000,
    refetchInterval: 60_000,
  });
}
