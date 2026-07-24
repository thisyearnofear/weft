"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, usePathname } from "next/navigation";
import { ArrowRight, ArrowLeft, X, Play } from "lucide-react";
import styles from "./GuidedDemoLauncher.module.css";

interface DemoStep {
  label: string;
  href: string;
  blurb: string;
}

const STEPS: DemoStep[] = [
  { label: "The problem", href: "/", blurb: "If an agent can release capital, it cannot be a black box." },
  { label: "Agent observatory", href: "/observability", blurb: "Watch the agent think — traces, LLM cost, evidence checks." },
  { label: "Operations", href: "/operations", blurb: "The agent earns 3% and spends it. Here are the books." },
  { label: "Explorer", href: "/explorer", blurb: "Browse every milestone and its evidence — including FHE demos." },
  { label: "Confidential", href: "/confidential", blurb: "Verifier votes stay encrypted until the result is final." },
  { label: "Try it", href: "/create-milestone", blurb: "Create a real milestone on 0G Testnet — the agent starts watching." },
];

const STORAGE_KEY = "weft-guided-demo";

export function GuidedDemoLauncher() {
  const router = useRouter();
  const pathname = usePathname();

  // Restore from sessionStorage via lazy initializer (avoids effect setState)
  const [active, setActive] = useState(() => {
    if (typeof window === "undefined") return false;
    try {
      const saved = sessionStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved).active ?? false : false;
    } catch {
      return false;
    }
  });
  const [step, setStep] = useState(() => {
    if (typeof window === "undefined") return 0;
    try {
      const saved = sessionStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved).step ?? 0 : 0;
    } catch {
      return 0;
    }
  });

  // Persist state
  useEffect(() => {
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ active, step }));
    } catch {
      // ignore
    }
  }, [active, step]);

  const start = useCallback(() => {
    setActive(true);
    setStep(0);
  }, []);

  const stop = useCallback(() => {
    setActive(false);
    try {
      sessionStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
  }, []);

  const next = useCallback(() => {
    const nextStep = Math.min(step + 1, STEPS.length - 1);
    setStep(nextStep);
    router.push(STEPS[nextStep].href);
  }, [step, router]);

  const prev = useCallback(() => {
    const prevStep = Math.max(step - 1, 0);
    setStep(prevStep);
    router.push(STEPS[prevStep].href);
  }, [step, router]);

  if (!active) {
    // Only show the start button on the landing page
    if (pathname !== "/") return null;
    return (
      <button type="button" className={styles.startBtn} onClick={start}>
        <Play size={14} />
        Start guided demo
      </button>
    );
  }

  const current = STEPS[step];
  const isLast = step === STEPS.length - 1;

  return (
    <div className={styles.bar}>
      <button type="button" className={styles.closeBtn} onClick={stop} aria-label="Exit guided demo">
        <X size={16} />
      </button>
      <div className={styles.progress}>
        {STEPS.map((s, i) => (
          <span
            key={s.href}
            className={styles.dot}
            data-state={i < step ? "done" : i === step ? "active" : "idle"}
          />
        ))}
      </div>
      <div className={styles.content}>
        <span className={styles.stepLabel}>
          Step {step + 1} of {STEPS.length}: {current.label}
        </span>
        <p className={styles.stepBlurb}>{current.blurb}</p>
      </div>
      <div className={styles.nav}>
        <button
          type="button"
          className={styles.navBtn}
          onClick={prev}
          disabled={step === 0}
        >
          <ArrowLeft size={14} /> Back
        </button>
        {!isLast ? (
          <button type="button" className={styles.navBtnPrimary} onClick={next}>
            Next <ArrowRight size={14} />
          </button>
        ) : (
          <button type="button" className={styles.navBtnPrimary} onClick={stop}>
            Done <ArrowRight size={14} />
          </button>
        )}
      </div>
    </div>
  );
}
