"use client";

import { useEffect } from "react";
import { usePrefersReducedMotion } from "../hooks/usePrefersReducedMotion";

/**
 * Scroll-driven woven backdrop — as the user scrolls deeper into the
 * page, the woven grid tightens (spacing decreases) and the thread
 * opacity increases. The fabric "comes together" as you go deeper,
 * making the weave metaphor literal.
 *
 * Sets CSS custom properties on :root so the global body backdrop
 * (which reads --woven-grid, --woven-warp, --woven-weft) responds
 * without any DOM manipulation.
 *
 * Pure vanilla scroll listener with rAF throttle. No deps.
 * Respects prefers-reduced-motion (no adjustment).
 */
export function ScrollWeave() {
  const reduced = usePrefersReducedMotion();

  useEffect(() => {
    if (reduced) return;

    let ticking = false;
    const update = () => {
      ticking = false;
      const scrollY = window.scrollY;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      const progress = docHeight > 0 ? Math.min(scrollY / docHeight, 1) : 0;

      // Grid tightens from 14px → 10px as you scroll
      const grid = 14 - progress * 4;
      // Thread opacity increases from base → 1.6x base
      const warpOpacity = 0.06 + progress * 0.04;
      const weftOpacity = 0.045 + progress * 0.03;

      const root = document.documentElement;
      root.style.setProperty("--woven-grid", `${grid}px`);
      root.style.setProperty("--woven-warp", `rgba(99, 102, 241, ${warpOpacity})`);
      root.style.setProperty("--woven-weft", `rgba(20, 184, 166, ${weftOpacity})`);
    };

    const onScroll = () => {
      if (!ticking) {
        requestAnimationFrame(update);
        ticking = true;
      }
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [reduced]);

  return null;
}
