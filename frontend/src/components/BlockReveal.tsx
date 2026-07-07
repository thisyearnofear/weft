"use client";

import { useEffect, useRef, useState, type ReactNode, type ElementType } from "react";
import styles from "./BlockReveal.module.css";

type BlockRevealProps = {
  children: ReactNode;
  as?: ElementType;
  className?: string;
  /** Delay before the block sweep starts (ms) */
  delay?: number;
  /** Block color (defaults to accent gradient) */
  color?: string;
};

/**
 * Block-reveal wrapper inspired by Codrops BlockRevealers.
 *
 * When the section enters the viewport, a colored block sweeps
 * left-to-right across the content, revealing it from behind.
 * The content also slides in slightly from the left.
 *
 * Uses IntersectionObserver — no runtime deps. Respects
 * prefers-reduced-motion via the global override.
 */
export function BlockReveal({
  children,
  as: Tag = "section",
  className = "",
  delay = 0,
  color,
}: BlockRevealProps) {
  const ref = useRef<HTMLElement>(null);
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setRevealed(true);
            observer.disconnect();
          }
        }
      },
      { threshold: 0.15 },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <Tag
      ref={ref as never}
      className={`${styles.wrap} ${className}`}
      style={{ animationDelay: `${delay}ms` }}
    >
      <div
        className={`${styles.block} ${revealed ? styles.blockSweep : ""}`}
        style={color ? { background: color } : undefined}
        aria-hidden="true"
      />
      <div className={`${styles.content} ${revealed ? styles.contentRevealed : ""}`}>
        {children}
      </div>
    </Tag>
  );
}
