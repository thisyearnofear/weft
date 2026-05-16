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
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;

    const lines = svg.querySelectorAll("line");
    const circles = svg.querySelectorAll("circle");

    const ctx = gsap.context(() => {
      // Lines draw in sequentially
      gsap.fromTo(
        lines,
        { strokeDashoffset: (i) => 200 * (i + 1) },
        {
          strokeDashoffset: 0,
          duration: 1.2,
          ease: "power2.out",
          stagger: 0.15,
          scrollTrigger: {
            trigger: svg,
            start: "top 85%",
            toggleActions: "play none none reverse",
          },
        }
      );
      // Circles pop in
      gsap.fromTo(
        circles,
        { scale: 0, opacity: 0 },
        {
          scale: 1,
          opacity: 0.7,
          duration: 0.5,
          ease: "back.out(2)",
          stagger: 0.2,
          scrollTrigger: {
            trigger: svg,
            start: "top 80%",
            toggleActions: "play none none reverse",
          },
        }
      );
    }, svg);

    return () => ctx.revert();
  }, []);

  return (
    <svg ref={svgRef} viewBox="0 0 320 220" fill="none" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Thread visualization — vertical warp lines being drawn in, representing raw evidence collection.">
      {[0, 1, 2, 3, 4].map((i) => (
        <line
          key={i}
          x1={40 + i * 56}
          y1="20"
          x2={40 + i * 56}
          y2="200"
          stroke="#6366f1"
          strokeWidth="2"
          strokeDasharray="200"
          strokeDashoffset="200"
          opacity={0.3 + i * 0.12}
        />
      ))}
      {[0, 1, 2].map((i) => (
        <circle key={i} cx={40 + i * 112} cy={60 + i * 50} r="8" fill="#6366f1" opacity="0" />
      ))}
      <text x="16" y="215" fill="#6366f1" fontSize="11" opacity="0.5" fontFamily="monospace">onchain events · commits · usage</text>
    </svg>
  );
}

function InterlaceVisual() {
  const svgRef = useRef<SVGSVGElement>(null);
  const nodes = [
    [60, 60], [260, 60], [160, 160],
  ] as [number, number][];

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;

    const lines = svg.querySelectorAll("line");
    const circles = svg.querySelectorAll("circle");
    const labels = svg.querySelectorAll("text");

    const ctx = gsap.context(() => {
      // Mesh lines draw in
      gsap.fromTo(
        lines,
        { strokeDashoffset: 120 },
        {
          strokeDashoffset: 0,
          duration: 0.8,
          ease: "power2.out",
          stagger: 0.12,
          scrollTrigger: {
            trigger: svg,
            start: "top 85%",
            toggleActions: "play none none reverse",
          },
        }
      );
      // Node glow circles scale up
      gsap.fromTo(
        circles,
        { scale: 0, opacity: 0 },
        {
          scale: 1,
          opacity: 1,
          duration: 0.6,
          ease: "back.out(2.5)",
          stagger: 0.15,
          scrollTrigger: {
            trigger: svg,
            start: "top 80%",
            toggleActions: "play none none reverse",
          },
        }
      );
      // Labels fade in
      gsap.fromTo(
        labels,
        { opacity: 0, y: 5 },
        {
          opacity: 1,
          y: 0,
          duration: 0.4,
          stagger: 0.12,
          scrollTrigger: {
            trigger: svg,
            start: "top 78%",
            toggleActions: "play none none reverse",
          },
        }
      );
    }, svg);

    return () => ctx.revert();
  }, []);

  return (
    <svg ref={svgRef} viewBox="0 0 320 220" fill="none" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Interlace visualization — three verifier nodes forming a mesh network with encrypted P2P connections.">
      {nodes.map(([x1, y1], i) =>
        nodes.slice(i + 1).map(([x2, y2], j) => (
          <line key={`${i}-${j}`}
            x1={x1} y1={y1} x2={x2} y2={y2}
            stroke="#8b5cf6" strokeWidth="1.5" opacity="0.4"
            strokeDasharray="120" strokeDashoffset="120"
          />
        ))
      )}
      {nodes.map(([cx, cy], i) => (
        <g key={i}>
          <circle cx={cx} cy={cy} r="18" fill="#8b5cf6" opacity="0" />
          <circle cx={cx} cy={cy} r="10" fill="#8b5cf6" opacity="0" />
        </g>
      ))}
      {nodes.map(([cx, cy], i) => (
        <text key={`l${i}`}
          x={cx} y={cy + 4} textAnchor="middle" fill="white" fontSize="10" fontWeight="700" fontFamily="monospace"
          opacity="0"
        >
          V{i + 1}
        </text>
      ))}
      <text x="16" y="215" fill="#8b5cf6" fontSize="11" opacity="0.5" fontFamily="monospace">encrypted P2P · AXL transport · consensus</text>
    </svg>
  );
}

function FabricVisual() {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;

    const warpLines = svg.querySelectorAll('[data-warp]');
    const weftPaths = svg.querySelectorAll('[data-weft]');
    const verifiedBox = svg.querySelector('[data-verified-box]');
    const verifiedLabel = svg.querySelector('[data-verified-label]');
    const verifiedSub = svg.querySelector('[data-verified-sub]');

    const ctx = gsap.context(() => {
      // Warp lines draw in
      gsap.fromTo(
        warpLines,
        { strokeDashoffset: 160 },
        {
          strokeDashoffset: 0,
          duration: 0.8,
          ease: "power2.out",
          stagger: 0.1,
          scrollTrigger: {
            trigger: svg,
            start: "top 85%",
            toggleActions: "play none none reverse",
          },
        }
      );
      // Weft paths weave in sequentially
      gsap.fromTo(
        weftPaths,
        { scaleX: 0, opacity: 0, transformOrigin: "left center" },
        {
          scaleX: 1,
          opacity: 1,
          duration: 0.6,
          ease: "power3.out",
          stagger: 0.15,
          scrollTrigger: {
            trigger: svg,
            start: "top 82%",
            toggleActions: "play none none reverse",
          },
        }
      );
      // Verified badge scales in
      if (verifiedBox) {
        gsap.fromTo(
          verifiedBox,
          { scale: 0, opacity: 0 },
          {
            scale: 1,
            opacity: 0.12,
            duration: 0.5,
            ease: "back.out(2)",
            scrollTrigger: {
              trigger: svg,
              start: "top 78%",
              toggleActions: "play none none reverse",
            },
          }
        );
      }
      // Labels fade up
      gsap.fromTo(
        [verifiedLabel, verifiedSub].filter(Boolean),
        { opacity: 0, y: 8 },
        {
          opacity: 1,
          y: 0,
          duration: 0.4,
          stagger: 0.1,
          scrollTrigger: {
            trigger: svg,
            start: "top 75%",
            toggleActions: "play none none reverse",
          },
        }
      );
    }, svg);

    return () => ctx.revert();
  }, []);

  return (
    <svg ref={svgRef} viewBox="0 0 320 220" fill="none" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Fabric visualization — woven warp and weft threads forming a verified badge, representing completed reputation.">
      {[0, 1, 2, 3, 4].map((i) => (
        <line key={`v${i}`}
          data-warp
          x1={40 + i * 56} y1="20" x2={40 + i * 56} y2="180"
          stroke="#22c55e" strokeWidth="2" opacity="0.25"
          strokeDasharray="160" strokeDashoffset="160"
        />
      ))}
      {[0, 1, 2, 3].map((i) => (
        <path key={`w${i}`}
          data-weft
          d={`M 40 ${50 + i * 40} Q 96 ${40 + i * 40} 152 ${50 + i * 40} Q 208 ${60 + i * 40} 264 ${50 + i * 40} Q 292 ${45 + i * 40} 296 ${50 + i * 40}`}
          stroke="#22c55e" strokeWidth="2.5" fill="none"
          opacity={0.4 + i * 0.12}
        />
      ))}
      <rect data-verified-box x="100" y="80" width="120" height="60" rx="10" fill="#22c55e" opacity="0" />
      <text data-verified-label x="160" y="106" textAnchor="middle" fill="#22c55e" fontSize="11" fontWeight="700" fontFamily="monospace" opacity="0">
        ✓ Verified
      </text>
      <text data-verified-sub x="160" y="124" textAnchor="middle" fill="#22c55e" fontSize="10" opacity="0" fontFamily="monospace">
        Capital released
      </text>
      <text x="16" y="215" fill="#22c55e" fontSize="11" opacity="0.5" fontFamily="monospace">ENS reputation · KeeperHub · 0G storage</text>
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

    // Refresh ScrollTrigger after layout settles
    ScrollTrigger.refresh();

    return () => mm.revert();
  }, []);

  return (
    <section className={styles.storySection} ref={containerRef} aria-labelledby="scroll-story-heading">
      <h2 id="scroll-story-heading" style={{ position: 'absolute', width: '1px', height: '1px', overflow: 'hidden', clip: 'rect(0,0,0,0)' }}>
        How Weft works — three steps
      </h2>
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
