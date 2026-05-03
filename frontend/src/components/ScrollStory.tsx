"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import styles from "./ScrollStory.module.css";

gsap.registerPlugin(ScrollTrigger);

const CHAPTERS = [
  {
    badge: "Thread",
    title: "Raw evidence, gathered automatically.",
    body: "Onchain events, GitHub commits, and usage signals are collected by the verifier swarm — no screenshots, no manual uploads.",
    visual: "thread",
    bg: "rgba(99,102,241,0.08)",
    accent: "#6366f1",
  },
  {
    badge: "Interlace",
    title: "Peer nodes compare and reach consensus.",
    body: "Independent verifiers inspect the same evidence over encrypted P2P channels. No single party controls the verdict.",
    visual: "interlace",
    bg: "rgba(139,92,246,0.10)",
    accent: "#8b5cf6",
  },
  {
    badge: "Fabric",
    title: "Capital releases. Reputation is woven in.",
    body: "Verified outcomes unlock staked capital automatically and attach to your ENS identity as permanent, portable proof of delivery.",
    visual: "fabric",
    bg: "rgba(34,197,94,0.08)",
    accent: "#22c55e",
  },
];

function ThreadVisual() {
  return (
    <svg viewBox="0 0 320 220" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      {[0, 1, 2, 3, 4].map((i) => (
        <line
          key={i}
          x1={40 + i * 56}
          y1="20"
          x2={40 + i * 56}
          y2="200"
          stroke="#6366f1"
          strokeWidth="2"
          strokeDasharray="6 6"
          opacity={0.3 + i * 0.12}
        />
      ))}
      {[0, 1, 2].map((i) => (
        <circle key={i} cx={40 + i * 112} cy={60 + i * 50} r="8" fill="#6366f1" opacity="0.7" />
      ))}
      <text x="16" y="215" fill="#6366f1" fontSize="11" opacity="0.5">onchain events · commits · usage</text>
    </svg>
  );
}

function InterlaceVisual() {
  const nodes = [
    [60, 60], [260, 60], [160, 160],
  ] as [number, number][];
  return (
    <svg viewBox="0 0 320 220" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      {nodes.map(([x1, y1], i) =>
        nodes.slice(i + 1).map(([x2, y2], j) => (
          <line key={`${i}-${j}`} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#8b5cf6" strokeWidth="1.5" opacity="0.4" />
        ))
      )}
      {nodes.map(([cx, cy], i) => (
        <g key={i}>
          <circle cx={cx} cy={cy} r="18" fill="#8b5cf6" opacity="0.15" />
          <circle cx={cx} cy={cy} r="10" fill="#8b5cf6" opacity="0.7" />
          <text x={cx} y={cy + 4} textAnchor="middle" fill="white" fontSize="10" fontWeight="700">V{i + 1}</text>
        </g>
      ))}
      <text x="16" y="215" fill="#8b5cf6" fontSize="11" opacity="0.5">encrypted P2P · AXL transport · consensus</text>
    </svg>
  );
}

function FabricVisual() {
  return (
    <svg viewBox="0 0 320 220" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      {[0, 1, 2, 3, 4].map((i) => (
        <line key={`v${i}`} x1={40 + i * 56} y1="20" x2={40 + i * 56} y2="180" stroke="#22c55e" strokeWidth="2" opacity="0.25" />
      ))}
      {[0, 1, 2, 3].map((i) => (
        <path
          key={`w${i}`}
          d={`M 40 ${50 + i * 40} Q 96 ${40 + i * 40} 152 ${50 + i * 40} Q 208 ${60 + i * 40} 264 ${50 + i * 40} Q 292 ${45 + i * 40} 296 ${50 + i * 40}`}
          stroke="#22c55e"
          strokeWidth="2.5"
          opacity={0.4 + i * 0.12}
          fill="none"
        />
      ))}
      <rect x="100" y="80" width="120" height="60" rx="10" fill="#22c55e" opacity="0.12" />
      <text x="160" y="106" textAnchor="middle" fill="#22c55e" fontSize="11" fontWeight="700">✓ Verified</text>
      <text x="160" y="124" textAnchor="middle" fill="#22c55e" fontSize="10" opacity="0.8">Capital released</text>
      <text x="16" y="215" fill="#22c55e" fontSize="11" opacity="0.5">ENS reputation · KeeperHub · 0G storage</text>
    </svg>
  );
}

const VISUALS = { thread: ThreadVisual, interlace: InterlaceVisual, fabric: FabricVisual };

export function ScrollStory() {
  const containerRef = useRef<HTMLDivElement>(null);
  const rightRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const mm = gsap.matchMedia();

    mm.add("(min-width: 769px)", () => {
      const sections = gsap.utils.toArray<HTMLElement>(`.${styles.chapter}`);
      const visuals = gsap.utils.toArray<HTMLElement>(`.${styles.visual}`);
      const bgColors = CHAPTERS.map((c) => c.bg);

      // Pin the right column while left scrolls
      ScrollTrigger.create({
        trigger: containerRef.current,
        start: "top top",
        end: "bottom bottom",
        pin: rightRef.current,
      });

      // For each chapter, fade in its visual and shift bg
      sections.forEach((section, i) => {
        ScrollTrigger.create({
          trigger: section,
          start: "top center",
          end: "bottom center",
          onEnter: () => {
            gsap.to(visuals, { opacity: 0, duration: 0.3 });
            gsap.to(visuals[i], { opacity: 1, duration: 0.5 });
            gsap.to(containerRef.current, { backgroundColor: bgColors[i], duration: 0.6, ease: "power2.inOut" });
          },
          onEnterBack: () => {
            gsap.to(visuals, { opacity: 0, duration: 0.3 });
            gsap.to(visuals[i], { opacity: 1, duration: 0.5 });
            gsap.to(containerRef.current, { backgroundColor: bgColors[i], duration: 0.6, ease: "power2.inOut" });
          },
        });
      });

      // Show first visual immediately
      gsap.set(visuals[0], { opacity: 1 });
      gsap.set(visuals.slice(1), { opacity: 0 });
    });

    return () => mm.revert();
  }, []);

  return (
    <section className={styles.storySection} ref={containerRef} aria-label="How Weft works">
      <div className={styles.storyInner}>
        {/* Left: scrolling chapters */}
        <div className={styles.left}>
          {CHAPTERS.map((ch) => (
            <div key={ch.badge} className={styles.chapter}>
              <span className={styles.badge} style={{ color: ch.accent, borderColor: ch.accent }}>
                {ch.badge}
              </span>
              <h3 className={styles.chapterTitle}>{ch.title}</h3>
              <p className={styles.chapterBody}>{ch.body}</p>
            </div>
          ))}
        </div>

        {/* Right: pinned visuals */}
        <div className={styles.right} ref={rightRef}>
          <div className={styles.visualStack}>
            {CHAPTERS.map((ch) => {
              const Visual = VISUALS[ch.visual as keyof typeof VISUALS];
              return (
                <div key={ch.badge} className={styles.visual}>
                  <Visual />
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
