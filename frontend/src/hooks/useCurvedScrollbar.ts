"use client";

import { useEffect, useRef } from "react";

const OFFSET = 7;
const EXTRA_INSET = 2;
const MIN_START_RATIO = 0.8;
const MIN_THUMB = 20;
const SEGMENTS = 50;

const SVG_NS = "http://www.w3.org/2000/svg";

/**
 * Attaches a curved SVG scrollbar that follows the border-radius of the
 * container. The scrollbar is purely decorative/interactive — native scroll
 * still works. Zero external dependencies.
 *
 * @param thumbColor  CSS colour for the scrollbar thumb (default: #6366f1)
 */
export function useCurvedScrollbar(thumbColor = "#6366f1") {
  const containerRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const content = container.querySelector<HTMLElement>("[data-scroll-content]");
    if (!content) return;

    // Hide native scrollbar
    content.style.scrollbarWidth = "none";
    (content.style as CSSStyleDeclaration & { msOverflowStyle: string }).msOverflowStyle = "none";

    // Build SVG overlay
    const svg = document.createElementNS(SVG_NS, "svg");
    svg.style.cssText =
      "position:absolute;inset:0;width:100%;height:100%;pointer-events:none;overflow:visible;";
    svg.setAttribute("aria-hidden", "true");

    const trackPath = document.createElementNS(SVG_NS, "path");
    trackPath.setAttribute("fill", "none");
    trackPath.setAttribute("stroke", "transparent");
    trackPath.setAttribute("stroke-width", "4");
    trackPath.setAttribute("stroke-linecap", "round");

    const thumbPath = document.createElementNS(SVG_NS, "path");
    thumbPath.setAttribute("fill", "none");
    thumbPath.setAttribute("stroke", thumbColor);
    thumbPath.setAttribute("stroke-width", "3");
    thumbPath.setAttribute("stroke-linecap", "round");
    thumbPath.style.pointerEvents = "auto";
    thumbPath.style.cursor = "grab";

    svg.appendChild(trackPath);
    svg.appendChild(thumbPath);
    container.appendChild(svg);

    let pathLength = 0;
    let thumbLength = MIN_THUMB;
    let dragging = false;
    let pointerId: number | null = null;

    function buildPath() {
      const w = container!.clientWidth;
      const h = container!.clientHeight;
      const r = parseFloat(getComputedStyle(container!).borderRadius) || 0;
      const effectiveRadius = Math.max(r - OFFSET, 0);
      const trackX = w - OFFSET;
      const topY = OFFSET;
      const bottomY = h - OFFSET;
      const cornerX = trackX - effectiveRadius;
      const minStartX = w * MIN_START_RATIO;
      let startX = trackX - effectiveRadius * EXTRA_INSET;
      if (startX < minStartX) startX = minStartX;
      if (startX > cornerX) startX = cornerX;

      const d = `
        M ${startX} ${topY}
        L ${cornerX} ${topY}
        A ${effectiveRadius} ${effectiveRadius} 0 0 1 ${trackX} ${topY + effectiveRadius}
        L ${trackX} ${bottomY - effectiveRadius}
        A ${effectiveRadius} ${effectiveRadius} 0 0 1 ${cornerX} ${bottomY}
        L ${startX} ${bottomY}
      `;
      trackPath.setAttribute("d", d);

      pathLength = trackPath.getTotalLength();
      const ratio = content!.clientHeight / content!.scrollHeight;
      thumbLength = Math.max(MIN_THUMB, pathLength * ratio);
      updateThumb();
    }

    function updateThumb() {
      const scrollable = content!.scrollHeight - content!.clientHeight || 1;
      const ratio = content!.scrollTop / scrollable;
      const startOffset = (pathLength - thumbLength) * ratio;
      const endOffset = startOffset + thumbLength;

      const points: string[] = [];
      for (let i = 0; i <= SEGMENTS; i++) {
        const t = startOffset + ((endOffset - startOffset) / SEGMENTS) * i;
        const p = trackPath.getPointAtLength(t);
        points.push(`${p.x} ${p.y}`);
      }
      thumbPath.setAttribute("d", `M ${points[0]} ${points.slice(1).map((pt) => `L ${pt}`).join(" ")}`);
    }

    thumbPath.addEventListener("pointerdown", (e) => {
      e.preventDefault();
      dragging = true;
      pointerId = e.pointerId;
      thumbPath.setPointerCapture(e.pointerId);
      thumbPath.style.cursor = "grabbing";
    });

    const onMove = (e: PointerEvent) => {
      if (!dragging || e.pointerId !== pointerId) return;
      const rect = container!.getBoundingClientRect();
      const ratio = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height));
      content!.scrollTop = ratio * (content!.scrollHeight - content!.clientHeight);
      updateThumb();
    };

    const onUp = (e: PointerEvent) => {
      if (!dragging || e.pointerId !== pointerId) return;
      dragging = false;
      pointerId = null;
      thumbPath.style.cursor = "grab";
      try { thumbPath.releasePointerCapture(e.pointerId); } catch {}
    };

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    content.addEventListener("scroll", updateThumb);

    let resizeTimer: ReturnType<typeof setTimeout>;
    const onResize = () => { clearTimeout(resizeTimer); resizeTimer = setTimeout(buildPath, 100); };
    window.addEventListener("resize", onResize);

    buildPath();

    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("resize", onResize);
      content.removeEventListener("scroll", updateThumb);
      svg.remove();
    };
  }, [thumbColor]);

  return containerRef;
}
