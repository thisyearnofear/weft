"use client";

import { useEffect, useRef } from "react";
import styles from "./ConsensusVisual.module.css";

/**
 * Animated 3-node consensus visualization for the hero panel.
 *
 * Shows three verifier nodes (A, B, C) in a triangle, with:
 * - Pulsing connection lines (AXL encrypted P2P)
 * - Animated evidence packets flowing between nodes
 * - A "Gather → Consensus → Verified" phase indicator
 * - Fabric-weaving background pattern that builds over time
 */
export function ConsensusVisual() {
  const containerRef = useRef<HTMLDivElement>(null);
  const nodeRefs = useRef<(SVGCircleElement | null)[]>([]);
  const packetRefs = useRef<(SVGCircleElement | null)[]>([]);
  const labelRefs = useRef<(SVGTextElement | null)[]>([]);
  const animRef = useRef<number>(0);

  useEffect(() => {
    // Respect prefers-reduced-motion — render static state
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReduced) {
      // Show all elements in their final state
      labelRefs.current.forEach((l, i) => {
        if (!l) return;
        l.setAttribute('opacity', i === 2 ? '1' : '0.25');
        l.setAttribute('font-weight', i === 2 ? '700' : '400');
      });
      return;
    }

    const nodes = nodeRefs.current.filter(Boolean) as SVGCircleElement[];
    const packets = packetRefs.current.filter(Boolean) as SVGCircleElement[];
    const labels = labelRefs.current.filter(Boolean) as SVGTextElement[];
    if (nodes.length < 3 || packets.length < 6) return;

    let start = 0;
    const CYCLE = 5000; // ms per full consensus cycle

    function animate(ts: number) {
      if (!start) start = ts;
      const t = ((ts - start) % CYCLE) / CYCLE; // 0 → 1

      // Phase indicators
      // 0.0–0.33: Gather Evidence (phase 0)
      // 0.33–0.66: Peer Consensus (phase 1)
      // 0.66–1.0: Verified (phase 2)
      const phase = t < 0.33 ? 0 : t < 0.66 ? 1 : 2;

      // Update phase labels
      labels.forEach((l, i) => {
        const isActive = i === phase;
        l.setAttribute("opacity", isActive ? "1" : "0.25");
        if (isActive) {
          l.setAttribute("font-weight", "700");
        } else {
          l.setAttribute("font-weight", "400");
        }
      });

      // Nodes pulse rhythmically
      nodes.forEach((n, i) => {
        const pulse = 1 + Math.sin(t * Math.PI * 2 + i * 2.1) * 0.06;
        n.setAttribute("r", String(14 * pulse));
        const opacity = 0.6 + Math.sin(t * Math.PI * 2 + i * 2.1) * 0.3;
        n.setAttribute("opacity", String(Math.max(0.4, opacity)));
      });

      // Packets travel along connections
      // 6 packets: A→B, B→C, C→A, A→C, C→B, B→A
      const paths = [
        { from: [60, 55], to: [60, 140] },    // A → B
        { from: [60, 140], to: [140, 100] },   // B → C
        { from: [140, 100], to: [60, 55] },    // C → A
        { from: [60, 55], to: [140, 100] },    // A → C
        { from: [140, 100], to: [60, 140] },   // C → B
        { from: [60, 140], to: [60, 55] },     // B → A
      ];

      packets.forEach((pkt, i) => {
        // Stagger packet starts so they don't all move together
        const offset = i * 0.12;
        const p = ((t + offset) % 1);
        const path = paths[i % paths.length];
        const x = path.from[0] + (path.to[0] - path.from[0]) * p;
        const y = path.from[1] + (path.to[1] - path.from[1]) * p;
        pkt.setAttribute("cx", String(x));
        pkt.setAttribute("cy", String(y));

        // Fade in/out at endpoints
        const fade = p < 0.08 ? p / 0.08 : p > 0.92 ? (1 - p) / 0.08 : 1;
        pkt.setAttribute("opacity", String(fade * 0.9));
      });

      animRef.current = requestAnimationFrame(animate);
    }

    animRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animRef.current);
  }, []);

  return (
    <div className={styles.container} ref={containerRef}>
      <svg viewBox="0 0 200 185" fill="none" className={styles.svg}>
        <defs>
          <radialGradient id="nodeGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#818cf8" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#6366f1" stopOpacity="0" />
          </radialGradient>
          <linearGradient id="lineGrad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#6366f1" stopOpacity="0.1" />
            <stop offset="50%" stopColor="#8b5cf6" stopOpacity="0.5" />
            <stop offset="100%" stopColor="#6366f1" stopOpacity="0.1" />
          </linearGradient>
          <linearGradient id="verifiedGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#22c55e" />
            <stop offset="100%" stopColor="#16a34a" />
          </linearGradient>
        </defs>

        {/* Background fabric pattern */}
        <g opacity="0.08">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <line
              key={`warp-${i}`}
              x1={25 + i * 28}
              y1={10}
              x2={25 + i * 28}
              y2={170}
              stroke="#6366f1"
              strokeWidth="1"
              opacity={0.3 + i * 0.1}
            />
          ))}
          {[0, 1, 2, 3, 4].map((i) => (
            <path
              key={`weft-${i}`}
              d={`M 20 ${30 + i * 30} Q 60 ${20 + i * 30} 100 ${30 + i * 30} Q 140 ${40 + i * 30} 180 ${30 + i * 30}`}
              stroke="#8b5cf6"
              strokeWidth="1"
              fill="none"
              opacity={0.2 + i * 0.08}
            />
          ))}
        </g>

        {/* Phase labels at top */}
        <g>
          <text
            ref={(el) => { labelRefs.current[0] = el; }}
            x="33"
            y="14"
            textAnchor="middle"
            fill="#818cf8"
            fontSize="7"
            fontFamily="monospace"
            fontWeight="700"
            opacity="1"
          >
            📡 Gather
          </text>
          <text
            ref={(el) => { labelRefs.current[1] = el; }}
            x="100"
            y="14"
            textAnchor="middle"
            fill="#818cf8"
            fontSize="7"
            fontFamily="monospace"
            fontWeight="400"
            opacity="0.25"
          >
            🔄 Consensus
          </text>
          <text
            ref={(el) => { labelRefs.current[2] = el; }}
            x="170"
            y="14"
            textAnchor="middle"
            fill="#22c55e"
            fontSize="7"
            fontFamily="monospace"
            fontWeight="400"
            opacity="0.25"
          >
            ✅ Verified
          </text>
        </g>

        {/* Glow underlay for nodes */}
        <circle cx="60" cy="55" r="30" fill="url(#nodeGlow)" opacity="0.5" />
        <circle cx="60" cy="140" r="30" fill="url(#nodeGlow)" opacity="0.5" />
        <circle cx="140" cy="100" r="30" fill="url(#nodeGlow)" opacity="0.5" />

        {/* Connection lines with gradient */}
        <line x1="60" y1="55" x2="60" y2="140" stroke="url(#lineGrad)" strokeWidth="1.5" strokeDasharray="4 3" />
        <line x1="60" y1="140" x2="140" y2="100" stroke="url(#lineGrad)" strokeWidth="1.5" strokeDasharray="4 3" />
        <line x1="140" y1="100" x2="60" y2="55" stroke="url(#lineGrad)" strokeWidth="1.5" strokeDasharray="4 3" />

        {/* Animated packets */}
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <circle
            key={`pkt-${i}`}
            ref={(el) => { packetRefs.current[i] = el; }}
            r="3"
            fill="#a78bfa"
            opacity="0"
            className={styles.packet}
          />
        ))}

        {/* Node A (top left) */}
        <g>
          <circle
            ref={(el) => { nodeRefs.current[0] = el; }}
            cx="60" cy="55" r="14"
            fill="#6366f1"
            opacity="0.8"
            className={styles.node}
          />
          <text x="60" y="58" textAnchor="middle" fill="white" fontSize="8" fontWeight="700" fontFamily="monospace">
            V₁
          </text>
        </g>

        {/* Node B (bottom left) */}
        <g>
          <circle
            ref={(el) => { nodeRefs.current[1] = el; }}
            cx="60" cy="140" r="14"
            fill="#6366f1"
            opacity="0.8"
            className={styles.node}
          />
          <text x="60" y="143" textAnchor="middle" fill="white" fontSize="8" fontWeight="700" fontFamily="monospace">
            V₂
          </text>
        </g>

        {/* Node C (middle right) */}
        <g>
          <circle
            ref={(el) => { nodeRefs.current[2] = el; }}
            cx="140" cy="100" r="14"
            fill="#6366f1"
            opacity="0.8"
            className={styles.node}
          />
          <text x="140" y="103" textAnchor="middle" fill="white" fontSize="8" fontWeight="700" fontFamily="monospace">
            V₃
          </text>
        </g>

        {/* Verified stamp overlay (bottom) */}
        <rect x="135" y="158" width="60" height="20" rx="10" fill="url(#verifiedGrad)" opacity="0.9" className={styles.verifiedBadge} />
        <text x="165" y="171" textAnchor="middle" fill="white" fontSize="8" fontWeight="700" fontFamily="monospace">
          ✓ Verified
        </text>
      </svg>

      <div className={styles.legend}>
        <div className={styles.legendItem}>
          <span className={styles.legendDot} style={{ background: "#6366f1" }} />
          <span className={styles.legendLabel}>Verifier Path</span>
        </div>
        <div className={styles.legendItem}>
          <span className={styles.legendDot} style={{ background: "#8b5cf6" }} />
          <span className={styles.legendLabel}>AXL P2P Mesh</span>
        </div>
        <div className={styles.legendItem}>
          <span className={styles.legendDot} style={{ background: "#22c55e" }} />
          <span className={styles.legendLabel}>Consensus</span>
        </div>
      </div>

      <div className={styles.statusRow}>
        <div className={styles.pulse}>
          <span className={styles.pulseDot} />
          Status API · AXL path active
        </div>
      </div>

      <p className={styles.caption}>
        Three independent agents verify the same evidence.
        If 2 of 3 agree, capital releases — no human approval required.
      </p>
    </div>
  );
}
