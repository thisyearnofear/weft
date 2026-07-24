"use client";

import { ExternalLink } from "lucide-react";
import { getSignozSpanExplorerUrl } from "@/lib/signoz";
import type { SignozSpanName } from "@/lib/signoz-config";
import { TRACE_WATERFALL_SPANS } from "@/lib/trace-waterfall";
import styles from "./TraceWaterfall.module.css";

interface TraceWaterfallProps {
  spanCounts?: Partial<Record<SignozSpanName, number>>;
  isLoading?: boolean;
  showDeepLinks?: boolean;
  compact?: boolean;
}

export function TraceWaterfall({
  spanCounts = {},
  isLoading = false,
  showDeepLinks = true,
  compact = false,
}: TraceWaterfallProps) {
  return (
    <div className={compact ? styles.compactTimeline : styles.timeline} aria-label="Trace waterfall">
      {TRACE_WATERFALL_SPANS.map((span, index) => {
        const Icon = span.icon;
        const count = spanCounts[span.name] ?? (isLoading ? "…" : 0);
        const row = (
          <>
            <div className={styles.timelineIndex}>{String(index + 1).padStart(2, "0")}</div>
            <div className={styles.timelineIcon} data-highlight={span.highlight ? "true" : undefined}>
              <Icon size={16} />
            </div>
            <div className={styles.timelineBody}>
              <div className={styles.timelineTitle}>
                <span>{span.label}</span>
                <code>{span.name}</code>
              </div>
              <p>{span.detail}</p>
            </div>
            <strong className={styles.timelineCount}>{count}</strong>
            {showDeepLinks && (
              <a
                href={getSignozSpanExplorerUrl(span.name)}
                target="_blank"
                rel="noopener noreferrer"
                className={styles.spanLink}
                aria-label={`Open ${span.name} in SigNoz`}
                title="Open span in SigNoz"
              >
                <ExternalLink size={14} />
              </a>
            )}
          </>
        );

        if (showDeepLinks) {
          return (
            <div
              key={span.name}
              className={`${styles.timelineItem} ${span.highlight ? styles.timelineHighlight : ""}`}
            >
              {row}
            </div>
          );
        }

        return (
          <div key={span.name} className={styles.timelineItem}>
            {row}
          </div>
        );
      })}
    </div>
  );
}
