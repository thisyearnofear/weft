"use client";

import { useMemo, useState, useEffect } from "react";
import styles from "./SVGPathMarquee.module.css";

type SVGPathMarqueeProps = {
  /** Number of swatch chips traveling the path */
  count?: number;
  /** Animation duration per loop in seconds (default 18) */
  duration?: number;
  className?: string;
};

/**
 * Ambient "evidence thread" — small swatch chips travel along a
 * self-crossing SVG path using CSS offset-path. Inspired by the
 * Codrops "Infinite Marquee Along an SVG Path" tutorial.
 *
 * The path is a woven figure-8 that crosses itself, evoking the
 * weft metaphor. Chips are small colored squares (indigo + teal
 * swatches) that loop infinitely.
 *
 * Mobile: uses a shorter, tighter path so it doesn't stretch weirdly.
 * Pure CSS — no runtime deps. Respects prefers-reduced-motion.
 */
export function SVGPathMarquee({
  count = 8,
  duration = 18,
  className = "",
}: SVGPathMarqueeProps) {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 640px)");
    const update = () => setIsMobile(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  // Self-crossing woven path — a figure-8 that loops through the
  // container, evoking threads interlocking.
  // Mobile path is shorter/tighter to avoid stretching.
  const path = isMobile
    ? "M0 30 C 40 30, 60 10, 100 30 S 160 50, 200 30 S 280 10, 320 30"
    : "M0 40 C 60 40, 80 10, 120 40 S 180 70, 240 40 S 360 10, 420 40 S 540 70, 600 40";

  const viewBox = isMobile ? "0 0 320 60" : "0 0 600 80";
  const chipCount = isMobile ? 5 : count;

  const chips = useMemo(
    () =>
      Array.from({ length: chipCount }, (_, i) => ({
        i,
        delay: (i * duration) / chipCount,
        isAccent: i % 2 === 0,
      })),
    [chipCount, duration],
  );

  return (
    <div className={`${styles.container} ${className}`} aria-hidden="true">
      <svg
        width="100%"
        height="100%"
        viewBox={viewBox}
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        preserveAspectRatio="none"
      >
        <path
          d={path}
          stroke="var(--c-border-2)"
          strokeWidth="1"
          fill="none"
          strokeDasharray="3 4"
          opacity="0.4"
        />
      </svg>
      {chips.map(({ i, delay, isAccent }) => (
        <div
          key={i}
          className={styles.chip}
          style={{
            offsetPath: `path('${path}')`,
            offsetRotate: "0deg",
            animationDelay: `-${delay}s`,
            animationDuration: `${duration}s`,
            background: isAccent
              ? "var(--c-accent)"
              : "var(--c-verified)",
          }}
        />
      ))}
    </div>
  );
}
