"use client";

import { useMemo } from "react";
import styles from "./TileFlip.module.css";

type TileFlipProps = {
  /** Grid columns (default 8) */
  cols?: number;
  /** Grid rows (default 5) */
  rows?: number;
  /** Per-tile stagger in ms (default 25) */
  stagger?: number;
  /** Total animation duration in ms — after this, the overlay unmounts */
  duration?: number;
};

/**
 * One-time hero entrance: a grid of accent-gradient tiles flips in
 * (assembling like woven threads), then fades to reveal the hero
 * content underneath. Inspired by Codrops AnimatedImagePieces.
 *
 * Pure CSS animation — no runtime deps. Respects prefers-reduced-motion
 * via the global override in globals.css (animation-duration: 0.01ms).
 */
export function TileFlip({
  cols = 8,
  rows = 5,
  stagger = 25,
  duration = 1400,
}: TileFlipProps) {
  const tiles = useMemo(
    () => Array.from({ length: cols * rows }, (_, i) => i),
    [cols, rows],
  );

  // Diagonal sweep delay — tiles assemble from top-left to bottom-right,
  // like a weave being pulled into shape.
  const delayFor = (i: number) => {
    const col = i % cols;
    const row = Math.floor(i / cols);
    return (col + row) * stagger;
  };

  return (
    <div
      className={styles.overlay}
      aria-hidden="true"
      style={{ animationDuration: `${duration}ms` }}
    >
      <div
        className={styles.grid}
        style={{
          gridTemplateColumns: `repeat(${cols}, 1fr)`,
          gridTemplateRows: `repeat(${rows}, 1fr)`,
        }}
      >
        {tiles.map((i) => (
          <div
            key={i}
            className={styles.tile}
            style={{ animationDelay: `${delayFor(i)}ms` }}
          />
        ))}
      </div>
    </div>
  );
}
