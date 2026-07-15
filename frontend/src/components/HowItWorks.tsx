"use client";

import { useEffect, useRef, useState } from "react";
import { Lock, Code2, ShieldCheck, Coins } from "lucide-react";
import { usePrefersReducedMotion } from "../hooks/usePrefersReducedMotion";
import styles from "./HowItWorks.module.css";

const STEPS = [
  {
    icon: Lock,
    label: "Lock",
    title: "Funder escrows the tranche",
    body: "A program office or sponsor locks capital against a specific deliverable and evidence template. Funds stay escrowed until verification.",
    actor: "Funder",
  },
  {
    icon: Code2,
    label: "Ship",
    title: "Builder delivers checkable work",
    body: "The builder ships against the template — deployment + usage on the public wedge, or institutional checklist items on Canton. Weft verifies what was agreed, not subjective scope.",
    actor: "Builder",
  },
  {
    icon: ShieldCheck,
    label: "Verify",
    title: "Agents evaluate the evidence",
    body: "Independent verifier nodes collect evidence against the fixed template, reach peer consensus, and sign a verdict. Deterministic gates — not LLM judgment.",
    actor: "Agent",
  },
  {
    icon: Coins,
    label: "Release",
    title: "Capital releases at quorum",
    body: "When verifiers agree the template passed, settlement releases to the builder (or refunds funders). The agent earns a success fee on released capital.",
    actor: "Settlement",
  },
];

export function HowItWorks() {
  const reduced = usePrefersReducedMotion();
  const [activeStep, setActiveStep] = useState(-1);
  const stepRefs = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    if (reduced) {
      setActiveStep(STEPS.length - 1); // all done
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        // Find the entry closest to the center of the viewport
        let bestIdx = -1;
        let bestDist = Infinity;
        for (const entry of entries) {
          if (entry.isIntersecting) {
            const idx = Number(entry.target.getAttribute("data-step-idx"));
            const rect = entry.boundingClientRect;
            const center = rect.top + rect.height / 2;
            const dist = Math.abs(center - window.innerHeight / 2);
            if (dist < bestDist) {
              bestDist = dist;
              bestIdx = idx;
            }
          }
        }
        if (bestIdx >= 0) setActiveStep(bestIdx);
      },
      { threshold: 0.4, rootMargin: "-20% 0px -20% 0px" },
    );

    stepRefs.current.forEach((el) => el && observer.observe(el));
    return () => observer.disconnect();
  }, [reduced]);

  return (
    <div className={styles.container}>
      <div className={styles.stepsRow}>
        {STEPS.map((step, i) => {
          const Icon = step.icon;
          const isActive = i === activeStep;
          const isDone = reduced || i < activeStep;
          return (
            <div key={step.label} className={styles.stepWrapper}>
              <div
                ref={(el) => { stepRefs.current[i] = el; }}
                data-step-idx={i}
                className={styles.stepCard}
                data-active={isActive}
                data-done={isDone}
              >
                <div className={styles.stepIconWrap}>
                  <Icon size={22} className={styles.stepIcon} />
                </div>
                <div className={styles.stepLabel}>{step.label}</div>
                <h3 className={styles.stepTitle}>{step.title}</h3>
                <p className={styles.stepBody}>{step.body}</p>
                <div className={styles.stepActor}>{step.actor}</div>
              </div>
              {i < STEPS.length - 1 && (
                <div className={styles.connector} aria-hidden="true" data-done={isDone}>
                  <svg viewBox="0 0 48 12" fill="none" className={styles.connectorSvg}>
                    <line
                      x1="0" y1="6" x2="40" y2="6"
                      stroke="var(--c-accent)"
                      strokeWidth="2"
                      strokeLinecap="round"
                      opacity={isDone ? "0.5" : "0.18"}
                      className={styles.connectorLine}
                    />
                    <path
                      d="M36 2 L44 6 L36 10"
                      stroke="var(--c-accent)"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      fill="none"
                      opacity={isDone ? "0.8" : "0.35"}
                    />
                  </svg>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
