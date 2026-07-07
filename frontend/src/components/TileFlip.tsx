"use client";

import { useMemo, useState, useEffect } from "react";
import styles from "./TileFlip.module.css";

type TileFlipProps = {
  /** Grid columns (default 8, auto-reduces on mobile) */
  cols?: number;
  /** Grid rows (default 5, auto-reduces on mobile) */
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
 *
 * Mobile: uses fewer, larger tiles (4×4) to avoid visual noise on
 * small screens. Desktop: 8×5 for a finer weave texture.
 */
export function TileFlip({
  cols = 8,
  rows = 5,
  stagger = 25,
  duration = 1400,
}: TileFlipProps) {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 640px)");
    const update = () => setIsMobile(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  const actualCols = isMobile ? 4 : cols;
  const actualRows = isMobile ? 4 : rows;
  const actualStagger = isMobile ? 40 : stagger;

  const tiles = useMemo(
    () => Array.from({ length: actualCols * actualRows }, (_, i) => i),
    [actualCols, actualRows],
  );

  // Diagonal sweep delay — tiles assemble from top-left to bottom-right,
  // like a weave being pulled into shape.
  const delayFor = (i: number) => {
    const col = i % actualCols;
    const row = Math.floor(i / actualCols);
    return (col + row) * actualStagger;
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
          gridTemplateColumns: `repeat(${actualCols}, 1fr)`,
          gridTemplateRows: `repeat(${actualRows}, 1fr)`,
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
