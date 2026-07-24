"use client";

import { useState, useRef, type ReactNode } from "react";
import { usePrefersReducedMotion } from "../hooks/usePrefersReducedMotion";
import styles from "./ExpandableGrid.module.css";

type ExpandableGridProps = {
  children: ReactNode[];
  className?: string;
};

/**
 * Interactive milestone grid — GridLayoutSlideshow energy.
 *
 * On desktop: hovering a cell expands it slightly and dims neighbors.
 * Clicking a cell expands it fully (spanning 2 columns) and pushes
 * neighbors to the next row. Click again or click another to collapse.
 *
 * On mobile: tap to expand a card in place, tap again to collapse.
 *
 * This replaces the static `repeat(auto-fill, minmax(320px, 1fr))` grid
 * with a living fabric where cells interact with each other.
 *
 * Zero deps. Respects prefers-reduced-motion (no expansion, just a
 * normal grid).
 */
export function ExpandableGrid({ children, className = "" }: ExpandableGridProps) {
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null);
  const reduced = usePrefersReducedMotion();
  const gridRef = useRef<HTMLDivElement>(null);

  const handleClick = (i: number) => {
    if (reduced) return;
    setExpandedIdx((prev) => (prev === i ? null : i));
  };

  if (reduced) {
    // Reduced motion: plain grid, no expansion
    return (
      <div className={`${styles.grid} ${className}`}>
        {children}
      </div>
    );
  }

  return (
    <div
      ref={gridRef}
      className={`${styles.grid} ${styles.interactive} ${className}`}
      data-expanded={expandedIdx !== null}
    >
      {children.map((child, i) => (
        <div
          key={i}
          className={styles.cell}
          data-expanded={expandedIdx === i}
          data-dimmed={expandedIdx !== null && expandedIdx !== i}
          onClick={() => handleClick(i)}
        >
          {child}
        </div>
      ))}
    </div>
  );
}
