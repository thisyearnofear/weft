"use client";

import { ChevronDown } from "lucide-react";
import { CountUp } from "@/components/CountUp";
import { Sparkline } from "./Sparkline";
import styles from "./weft-ui.module.css";

export interface MetricCardProps {
  label: string;
  value: number | string;
  detail?: string;
  series?: number[];
  isLoading?: boolean;
  expandable?: boolean;
  expanded?: boolean;
  onToggle?: () => void;
  staggerIndex?: number;
}

export function MetricCard({
  label,
  value,
  detail,
  series = [],
  isLoading = false,
  expandable = true,
  expanded = false,
  onToggle,
  staggerIndex,
}: MetricCardProps) {
  const numeric = typeof value === "number" ? value : Number(value);
  const showCountUp = Number.isFinite(numeric);

  return (
    <article
      className={`${styles.metricCard} stagger ${staggerIndex != null ? `stagger-${Math.min(staggerIndex + 1, 6)}` : ""}`}
      data-expanded={expanded ? "true" : "false"}
    >
      <div className={styles.metricHead}>
        <div>
          <span className={styles.metricLabel}>{label}</span>
          <strong className={styles.metricValue}>
            {isLoading ? "…" : showCountUp ? <CountUp value={numeric} /> : value}
          </strong>
        </div>
        {expandable && detail && onToggle && (
          <button
            type="button"
            className={styles.metricExpand}
            data-open={expanded ? "true" : "false"}
            onClick={onToggle}
            aria-expanded={expanded}
            aria-label={expanded ? "Collapse details" : "Expand details"}
          >
            <ChevronDown size={14} />
          </button>
        )}
      </div>
      {series.length > 0 && (
        <div className={styles.metricSpark}>
          <Sparkline values={series} width={160} height={40} />
        </div>
      )}
      {detail && (
        <div className={`${styles.metricDetail} ${expanded ? styles.metricDetailOpen : ""}`}>
          <div className={styles.metricDetailInner}>
            <p>{detail}</p>
          </div>
        </div>
      )}
    </article>
  );
}
