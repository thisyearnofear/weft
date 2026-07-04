"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Lock, FileCheck2, ShieldCheck, Coins, ArrowRight } from "lucide-react";
import { usePrefersReducedMotion } from "../hooks/usePrefersReducedMotion";
import { track } from "../lib/track";
import styles from "./HeroProof.module.css";

/**
 * HeroProof — the "aha moment" that plays automatically above the fold.
 *
 * A scripted 4-beat sequence that shows the ONE thing that makes Weft magic:
 * money that releases itself on evidence.
 *
 *   1. Locked      — capital escrowed behind a deliverable
 *   2. Evidence    — agents gather onchain proof
 *   3. Consensus   — 2 of 3 verifiers agree
 *   4. Released    — capital pays the builder + proof is minted
 *
 * The sequence loops so a passive visitor sees the whole mechanic without
 * clicking anything. Reduced-motion users see the resolved final state.
 */

const DEMO = {
  hash: "0x516975afcb46acf3ea2265789ea0a64516db9f1d8e6cfb65737fc9cfafb1c16f",
  builder: "weft.thisyearnofear.eth",
  amount: "0.01",
};

const BEATS = [
  { key: "locked", label: "Locked", icon: Lock, caption: "0.01 ETH escrowed behind a deliverable" },
  { key: "evidence", label: "Evidence", icon: FileCheck2, caption: "Agents gather onchain proof" },
  { key: "consensus", label: "Consensus", icon: ShieldCheck, caption: "2 of 3 verifiers agree" },
  { key: "released", label: "Released", icon: Coins, caption: "Capital pays the builder — automatically" },
] as const;

const EVIDENCE = ["Contract deployed", "12 unique callers", "GitHub commits verified"];

export function HeroProof() {
  const reduced = usePrefersReducedMotion();
  // When motion is reduced, hold the resolved final beat.
  const [step, setStep] = useState(reduced ? 3 : 0);
  const sawPayoff = useRef(false);

  useEffect(() => {
    if (reduced) return;
    const timings = [1600, 2200, 2200, 2600]; // ms each beat holds
    let alive = true;
    let t: ReturnType<typeof setTimeout>;
    const advance = (i: number) => {
      if (!alive) return;
      setStep(i);
      if (i === 3 && !sawPayoff.current) {
        sawPayoff.current = true;
        track("heroproof_loop");
      }
      t = setTimeout(() => advance((i + 1) % BEATS.length), timings[i]);
    };
    // Kick off asynchronously so the first state update isn't synchronous-in-effect.
    t = setTimeout(() => advance(0), 400);
    return () => {
      alive = false;
      clearTimeout(t);
    };
  }, [reduced]);

  const released = step >= 3;

  return (
    <div className={styles.card} data-step={step}>
      {/* Progress rail of the 4 beats */}
      <div className={styles.rail} aria-hidden="true">
        {BEATS.map((b, i) => {
          const Icon = b.icon;
          const state = i < step ? "done" : i === step ? "active" : "idle";
          return (
            <div key={b.key} className={styles.railStep} data-state={state}>
              <span className={styles.railDot}>
                <Icon size={13} />
              </span>
              <span className={styles.railLabel}>{b.label}</span>
            </div>
          );
        })}
      </div>

      {/* Stage — the currently-playing beat */}
      <div className={styles.stage}>
        {/* Beat 1–2: escrow + evidence */}
        <div className={styles.escrowRow} data-dim={released}>
          <div className={styles.escrowAmount}>
            <span className={styles.escrowValue}>{DEMO.amount}</span>
            <span className={styles.escrowUnit}>ETH</span>
          </div>
          <span className={styles.escrowState} data-released={released}>
            {released ? "Released" : "Locked"}
          </span>
        </div>

        <div className={styles.evidenceList}>
          {EVIDENCE.map((e, i) => (
            <div
              key={e}
              className={styles.evidenceChip}
              data-on={step >= 1 && (step > 1 || i <= 1)}
            >
              <span className={styles.evidenceCheck}>✓</span>
              {e}
            </div>
          ))}
        </div>

        {/* Beat 3: consensus nodes */}
        <div className={styles.nodes} data-active={step >= 2}>
          {[0, 1, 2].map((n) => (
            <span
              key={n}
              className={styles.node}
              data-agreed={step >= 2 && n < 2}
            >
              V{n + 1}
            </span>
          ))}
          <span className={styles.quorum} data-on={step >= 2}>
            2 / 3 agree
          </span>
        </div>

        {/* Beat 4: payoff */}
        <div className={styles.payoff} data-on={released}>
          <Coins size={15} />
          <span>
            {DEMO.amount} ETH → <strong>{DEMO.builder}</strong>
          </span>
        </div>
      </div>

      {/* Live caption + CTA into the real proof */}
      <div className={styles.footer}>
        <p className={styles.caption} aria-live="polite">
          {reduced ? "Capital releases itself when the evidence clears." : BEATS[step].caption}
        </p>
        <Link
          href={`/project/${DEMO.hash}`}
          className={styles.proofLink}
          onClick={() => track("heroproof_proof_click")}
        >
          See this exact proof onchain <ArrowRight size={14} />
        </Link>
      </div>
    </div>
  );
}
