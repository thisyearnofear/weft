"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import styles from "./weft-ui.module.css";

export interface GuidedStep {
  id: string;
  title: string;
  blurb: string;
  anchor: string;
}

interface GuidedPresenterProps {
  steps: GuidedStep[];
  activeStep: number;
  onStepChange: (index: number) => void;
  presentMode?: boolean;
}

export function GuidedPresenter({ steps, activeStep, onStepChange, presentMode = false }: GuidedPresenterProps) {
  const go = (delta: number) => {
    const next = Math.max(0, Math.min(steps.length - 1, activeStep + delta));
    onStepChange(next);
    if (!presentMode) {
      document.getElementById(steps[next]?.anchor)?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  return (
    <div>
      <nav className={styles.guidedRail} aria-label="Guided demo steps">
        {steps.map((step, index) => (
          <button
            key={step.id}
            type="button"
            className={styles.guidedStep}
            data-active={index === activeStep ? "true" : "false"}
            onClick={() => onStepChange(index)}
          >
            <span>{index + 1}</span>
            <div>
              <strong>{step.title}</strong>
              <p>{step.blurb}</p>
            </div>
          </button>
        ))}
      </nav>
      <div className={styles.guidedNav}>
        <button type="button" className={styles.guidedNavBtn} onClick={() => go(-1)} disabled={activeStep === 0}>
          <ChevronLeft size={16} /> Previous
        </button>
        <button
          type="button"
          className={styles.guidedNavBtnPrimary}
          onClick={() => go(1)}
          disabled={activeStep >= steps.length - 1}
        >
          Next <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
}
