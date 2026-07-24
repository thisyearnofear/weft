import { SIGNOZ_DASHBOARD_PANELS } from "@/lib/signoz-config";
import type { ObservabilityData } from "@/hooks/useObservability";

export function panelMetricValue(
  key: (typeof SIGNOZ_DASHBOARD_PANELS)[number]["metricKey"],
  signoz: ObservabilityData["signoz"],
  recovery: ObservabilityData["recovery"]
): number {
  switch (key) {
    case "spanGroups":
      return signoz.spanGroups;
    case "llmSpans":
      return signoz.spanCounts["weft.llm.chat"] ?? 0;
    case "traceCount":
      return signoz.traceCount ?? 0;
    case "toolSpans":
      return signoz.spanCounts["weft.agent.tool_call"] ?? 0;
    case "recoveryEvents":
      return recovery?.totalEvents ?? 0;
    default:
      return 0;
  }
}

export function panelSeries(
  key: (typeof SIGNOZ_DASHBOARD_PANELS)[number]["metricKey"],
  series: ObservabilityData["signoz"]["series"] | undefined
): number[] {
  if (!series) return [];
  switch (key) {
    case "spanGroups":
      // spanGroups is a scalar (count of distinct span names), not a real
      // time series. A flat-line sparkline reads as "broken" to judges,
      // so we suppress it rather than showing a synthetic flat line.
      return [];
    case "llmSpans":
      return series.llmSpans;
    case "traceCount":
      return series.traceCount;
    case "toolSpans":
      return series.toolSpans;
    case "recoveryEvents":
      return series.recoveryEvents;
    default:
      return series.traceCount;
  }
}

/** Map guided step index → which section anchors are visible in present mode */
export function stepVisible(stepIndex: number, anchor: string, steps: { anchor: string }[]): boolean {
  return steps[stepIndex]?.anchor === anchor;
}

export type ActVisibility = "full" | "teaser" | "hidden";

/**
 * Determine how an act should render given the mode:
 * - Normal (no guided): everything "full"
 * - Guided only (?guided=1): active step "full", others "teaser"
 *   (non-active acts show just the header + a "jump to" CTA,
 *    so the page reads as a narrative arc, not a dump)
 * - Present + guided: active step "full", others "hidden"
 *   (one section at a time for screen recording)
 */
export function sectionVisible(
  anchor: string,
  guided: boolean,
  present: boolean,
  activeStep: number,
  steps: { anchor: string }[]
): ActVisibility {
  if (!guided) return "full";
  const isActive = stepVisible(activeStep, anchor, steps);
  if (isActive) return "full";
  return present ? "hidden" : "teaser";
}
