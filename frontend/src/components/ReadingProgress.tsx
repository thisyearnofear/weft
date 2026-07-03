"use client";

import { useEffect, useRef, type RefObject } from "react";
import styles from "./ReadingProgress.module.css";

interface ReadingProgressProps {
  /** The element whose scroll progress to track (e.g. the <article>). */
  targetRef: RefObject<HTMLElement | null>;
}

/**
 * A thin, fixed progress bar that fills as the reader scrolls through a long
 * article. Scroll-driven (rAF-throttled) — not an animation, so it stays on
 * for reduced-motion users as a static position indicator.
 */
export function ReadingProgress({ targetRef }: ReadingProgressProps) {
  const barRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let raf = 0;

    const update = () => {
      raf = 0;
      const el = targetRef.current;
      const bar = barRef.current;
      if (!el || !bar) return;
      const rect = el.getBoundingClientRect();
      const scrollable = rect.height - window.innerHeight;
      if (scrollable <= 0) {
        bar.style.transform = "scaleX(0)";
        return;
      }
      const scrolled = -rect.top;
      const progress = Math.max(0, Math.min(1, scrolled / scrollable));
      bar.style.transform = `scaleX(${progress})`;
    };

    const onScroll = () => {
      if (raf) return;
      raf = requestAnimationFrame(update);
    };

    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [targetRef]);

  return (
    <div className={styles.track} aria-hidden="true">
      <div ref={barRef} className={styles.bar} />
    </div>
  );
}
