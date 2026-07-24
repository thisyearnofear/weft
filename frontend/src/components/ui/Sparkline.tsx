"use client";

import { useId, useMemo } from "react";
import styles from "./weft-ui.module.css";

interface SparklineProps {
  values: number[];
  width?: number;
  height?: number;
  className?: string;
}

export function Sparkline({ values, width = 120, height = 36, className = "" }: SparklineProps) {
  const reactId = useId();
  const lineGradId = `spark-line-${reactId}`;
  const areaGradId = `spark-area-${reactId}`;

  const path = useMemo(() => {
    if (!values.length) return null;

    const max = Math.max(...values, 1);
    const min = Math.min(...values, 0);
    const range = max - min || 1;
    const pad = 2;
    const innerW = width - pad * 2;
    const innerH = height - pad * 2;

    const points = values.map((v, i) => {
      const x = pad + (values.length <= 1 ? innerW / 2 : (i / (values.length - 1)) * innerW);
      const y = pad + innerH - ((v - min) / range) * innerH;
      return [x, y] as const;
    });

    const line = points.map((p, i) => `${i === 0 ? "M" : "L"}${p[0].toFixed(2)},${p[1].toFixed(2)}`).join(" ");
    const area = `${line} L${(pad + innerW).toFixed(2)},${(pad + innerH).toFixed(2)} L${pad},${(pad + innerH).toFixed(2)} Z`;
    return { line, area };
  }, [values, width, height]);

  if (!path) {
    return (
      <svg viewBox={`0 0 ${width} ${height}`} className={`${styles.sparkline} ${className}`} aria-hidden="true">
        <line x1={2} y1={height / 2} x2={width - 2} y2={height / 2} className={styles.sparklineEmpty} />
      </svg>
    );
  }

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className={`${styles.sparkline} ${className}`} aria-hidden="true">
      <defs>
        <linearGradient id={lineGradId} x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="var(--c-verified)" />
          <stop offset="100%" stopColor="var(--c-accent)" />
        </linearGradient>
        <linearGradient id={areaGradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="rgba(20, 184, 166, 0.35)" />
          <stop offset="100%" stopColor="rgba(20, 184, 166, 0)" />
        </linearGradient>
      </defs>
      <path d={path.area} style={{ fill: `url(#${areaGradId})` }} className={styles.sparklineArea} />
      <path d={path.line} style={{ stroke: `url(#${lineGradId})` }} className={styles.sparklineLine} />
    </svg>
  );
}
