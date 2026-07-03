"use client";

import { useEffect, type RefObject } from "react";

interface ProximityOptions {
  /** Radius (px) from the element center within which the effect ramps in. Default 160. */
  radius?: number;
  /** Maximum 3D tilt in degrees. Default 5. */
  tilt?: number;
}

/**
 * Cursor-proximity feedback — inspired by Codrops ProximityFeedback.
 *
 * Sets CSS custom properties on the element as the pointer approaches, so a
 * single CSS layer can drive the visual response (no direct style mutation):
 *
 *   --prox     0 → 1   (1 = cursor over the element, 0 = `radius` away)
 *   --mx       0 → 100 (% pointer x within the element, for a spotlight)
 *   --my       0 → 100 (% pointer y within the element)
 *   --tilt-x   deg      (rotateX — card leans away from cursor for parallax)
 *   --tilt-y   deg      (rotateY — card leans toward cursor for parallax)
 *
 * No-op on touch devices and when `prefers-reduced-motion: reduce` is set.
 * Throttled to one update per animation frame per element.
 */
export function useProximity<T extends HTMLElement>(
  ref: RefObject<T | null>,
  { radius = 160, tilt = 5 }: ProximityOptions = {},
) {
  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!finePointer || reducedMotion) return;

    let raf = 0;
    let latest: PointerEvent | null = null;

    const onMove = (e: PointerEvent) => {
      latest = e;
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        const ev = latest;
        if (!ev) return;
        const rect = el.getBoundingClientRect();
        const cx = rect.left + rect.width / 2;
        const cy = rect.top + rect.height / 2;
        const dist = Math.hypot(ev.clientX - cx, ev.clientY - cy);

        // 1 when the cursor is over the card, 0 at `radius` from center
        const prox = Math.max(0, Math.min(1, 1 - dist / radius));
        const mx = Math.max(0, Math.min(100, ((ev.clientX - rect.left) / rect.width) * 100));
        const my = Math.max(0, Math.min(100, ((ev.clientY - rect.top) / rect.height) * 100));

        // Parallax tilt: the card "leans" toward the cursor
        const tiltX = (my / 100 - 0.5) * -tilt * 2;
        const tiltY = (mx / 100 - 0.5) * tilt * 2;

        el.style.setProperty("--prox", prox.toFixed(3));
        el.style.setProperty("--mx", `${mx.toFixed(1)}%`);
        el.style.setProperty("--my", `${my.toFixed(1)}%`);
        el.style.setProperty("--tilt-x", `${tiltX.toFixed(2)}deg`);
        el.style.setProperty("--tilt-y", `${tiltY.toFixed(2)}deg`);
      });
    };

    // Listen on window so the card reacts *before* the cursor enters it
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => {
      window.removeEventListener("pointermove", onMove);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [ref, radius, tilt]);
}
