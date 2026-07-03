"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import styles from "./ChronicleScrollRig.module.css";

gsap.registerPlugin(ScrollTrigger);

interface Chapter {
  heading: string;
  body: string;
}

interface ChronicleScrollRigProps {
  chapters: Chapter[];
  epilogue?: string;
  isVerified?: boolean;
}

const WEFT_COLORS_VERIFIED = ["#8b5cf6", "#7c6fe0", "#5eb8a8", "#4ade80"];
const WEFT_COLORS_PENDING = ["#8b5cf6", "#9d7ef0", "#a78bfa", "#a78bfa"];

/**
 * Scroll-rig chronicle layout — a pinned weaving SVG on the left that
 * progresses as the reader scrolls through chapters on the right.
 *
 * Desktop only (>768px). Mobile renders chapters in a single column.
 * Reduced-motion: all GSAP disabled, content renders statically.
 */
export function ChronicleScrollRig({ chapters, epilogue, isVerified }: ChronicleScrollRigProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const visualRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  const weftColors = isVerified ? WEFT_COLORS_VERIFIED : WEFT_COLORS_PENDING;
  const finalColor = isVerified ? "#22c55e" : "#f59e0b";

  useEffect(() => {
    const container = containerRef.current;
    const visual = visualRef.current;
    const svg = svgRef.current;
    if (!container || !visual || !svg) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (chapters.length === 0) return;

    const mm = gsap.matchMedia();

    mm.add("(min-width: 769px)", () => {
      const sections = gsap.utils.toArray<HTMLElement>(`.${styles.chapter}`);
      const warpLines = svg.querySelectorAll("[data-warp]");
      const weftThreads = svg.querySelectorAll("[data-weft]");
      const intersections = svg.querySelectorAll("[data-intersection]");
      const finalNode = svg.querySelector("[data-final]");

      ScrollTrigger.create({
        trigger: container, start: "top top", end: "bottom bottom",
        pin: visual, pinSpacing: false,
      });

      gsap.fromTo(warpLines,
        { strokeDashoffset: 360, opacity: 0.15 },
        { strokeDashoffset: 0, opacity: 0.55, ease: "power2.out", stagger: 0.08,
          scrollTrigger: { trigger: container, start: "top 75%", end: "top 25%", scrub: 1 } });

      weftThreads.forEach((thread, i) => {
        const trig = sections[Math.min(i, sections.length - 1)] || container;
        gsap.fromTo(thread,
          { strokeDashoffset: 250, opacity: 0 },
          { strokeDashoffset: 0, opacity: 0.5, ease: "power2.out",
            scrollTrigger: { trigger: trig, start: "top center", end: "bottom center", scrub: 1 } });
      });

      intersections.forEach((node, i) => {
        const trig = sections[Math.min(i, sections.length - 1)] || container;
        gsap.fromTo(node,
          { scale: 0, opacity: 0, transformOrigin: "center center" },
          { scale: 1, opacity: 0.8, duration: 0.4, ease: "back.out(2)",
            scrollTrigger: { trigger: trig, start: "top center", toggleActions: "play none none reverse" } });
      });

      if (finalNode) {
        gsap.fromTo(finalNode,
          { scale: 0, opacity: 0, transformOrigin: "center center" },
          { scale: 1, opacity: 1, duration: 0.6, ease: "back.out(1.7)",
            scrollTrigger: { trigger: sections[sections.length - 1] || container, start: "bottom center", toggleActions: "play none none reverse" } });
      }

      sections.forEach((section) => {
        const badge = section.querySelector(`.${styles.chapterNum}`);
        const heading = section.querySelector(`.${styles.chapterHeading}`);
        const paragraphs = section.querySelectorAll(`.${styles.chapterBody} p`);
        gsap.timeline({ scrollTrigger: { trigger: section, start: "top 75%", end: "bottom 75%", toggleActions: "play none none reverse" } })
          .fromTo(badge, { opacity: 0, x: -15 }, { opacity: 1, x: 0, duration: 0.4, ease: "power2.out" })
          .fromTo(heading, { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.5, ease: "power2.out" }, "-=0.15")
          .fromTo(paragraphs, { opacity: 0, y: 12 }, { opacity: 1, y: 0, duration: 0.35, ease: "power2.out", stagger: 0.08 }, "-=0.2");
      });

      const total = sections.length;
      sections.forEach((section, i) => {
        const p = total > 1 ? i / (total - 1) : 0;
        const bg = isVerified
          ? `rgba(${Math.round(99 + (34 - 99) * p)}, ${Math.round(102 + (197 - 102) * p)}, ${Math.round(241 + (94 - 241) * p)}, 0.05)`
          : `rgba(139, 92, 246, ${0.03 + p * 0.04})`;
        ScrollTrigger.create({
          trigger: section, start: "top center", end: "bottom center",
          onEnter: () => gsap.to(container, { backgroundColor: bg, duration: 0.6, ease: "power2.inOut" }),
          onEnterBack: () => gsap.to(container, { backgroundColor: bg, duration: 0.6, ease: "power2.inOut" }),
        });
      });

      ScrollTrigger.refresh();
    });

    return () => mm.revert();
  }, [chapters.length, isVerified]);

  return (
    <div className={styles.rig} ref={containerRef}>
      <div className={styles.visual} ref={visualRef} aria-hidden="true">
        <svg ref={svgRef} viewBox="0 0 280 420" fill="none" xmlns="http://www.w3.org/2000/svg" className={styles.weaveSvg}>
          {[0, 1, 2, 3, 4].map((i) => (
            <line key={`warp-${i}`} data-warp x1={30 + i * 55} y1="25" x2={30 + i * 55} y2="385"
              stroke="#6366f1" strokeWidth="2" strokeDasharray="360" strokeDashoffset="360" opacity="0.15" />
          ))}
          {[0, 1, 2, 3].map((i) => (
            <line key={`weft-${i}`} data-weft x1="15" y1={95 + i * 72} x2="265" y2={95 + i * 72}
              stroke={weftColors[i]} strokeWidth="1.5" strokeDasharray="250" strokeDashoffset="250" opacity="0" />
          ))}
          {[0, 1, 2].map((row) =>
            [1, 2, 3].map((col) => (
              <circle key={`node-${row}-${col}`} data-intersection cx={30 + col * 55} cy={95 + row * 72 + 72}
                r="4" fill={weftColors[Math.min(row, weftColors.length - 1)]} opacity="0" />
            )),
          )}
          <g data-final transform="translate(140, 360)">
            <circle r="20" fill={finalColor} opacity="0" />
            <path d="M -7 0 L -2 5 L 7 -5" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
          </g>
          <text x="140" y="410" fill="#6366f1" fontSize="9" opacity="0.35" fontFamily="monospace" textAnchor="middle">
            evidence · consensus · fabric
          </text>
        </svg>
      </div>
      <div className={styles.chapters}>
        {chapters.map((ch, i) => (
          <section key={i} className={styles.chapter}>
            <h3 className={styles.chapterHeading}>
              <span className={styles.chapterNum}>Chapter {i + 1}</span>
              {ch.heading}
            </h3>
            <div className={styles.chapterBody}>
              {ch.body.split("\n").map((p, j) => (<p key={j}>{p}</p>))}
            </div>
          </section>
        ))}
        {epilogue && (
          <section className={styles.epilogue}>
            <h3 className={styles.epilogueHeading}>Epilogue</h3>
            <p>{epilogue}</p>
          </section>
        )}
      </div>
    </div>
  );
}

