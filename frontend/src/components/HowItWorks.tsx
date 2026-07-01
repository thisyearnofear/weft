"use client";

import { Lock, Code2, ShieldCheck, Coins } from "lucide-react";
import styles from "./HowItWorks.module.css";

const STEPS = [
  {
    icon: Lock,
    label: "Lock",
    title: "Sponsor funds the milestone",
    body: "A sponsor locks ETH into a smart contract against a specific deliverable. Capital stays escrowed — no one can move it until verification.",
    actor: "Sponsor",
  },
  {
    icon: Code2,
    label: "Ship",
    title: "Builder delivers the work",
    body: "The builder deploys contracts, pushes commits, hits usage targets. The work happens offchain — Weft doesn't dictate how, it verifies what.",
    actor: "Builder",
  },
  {
    icon: ShieldCheck,
    label: "Verify",
    title: "Autonomous agents check the evidence",
    body: "Three independent verifier nodes collect onchain evidence (deployments, usage, GitHub activity), reach peer consensus over encrypted P2P, and sign a verdict.",
    actor: "Agent",
  },
  {
    icon: Coins,
    label: "Release",
    title: "Capital releases automatically",
    body: "When 2 of 3 agents agree the work is done, the contract releases ETH to the builder. No manual approval. No disputes. The agent earns 3%.",
    actor: "Contract",
  },
];

export function HowItWorks() {
  return (
    <div className={styles.container}>
      <div className={styles.stepsRow}>
        {STEPS.map((step, i) => {
          const Icon = step.icon;
          return (
            <div key={step.label} className={styles.stepWrapper}>
              <div className={styles.stepCard}>
                <div className={styles.stepIconWrap}>
                  <Icon size={22} className={styles.stepIcon} />
                </div>
                <div className={styles.stepLabel}>{step.label}</div>
                <h3 className={styles.stepTitle}>{step.title}</h3>
                <p className={styles.stepBody}>{step.body}</p>
                <div className={styles.stepActor}>{step.actor}</div>
              </div>
              {i < STEPS.length - 1 && (
                <div className={styles.connector} aria-hidden="true">
                  <svg viewBox="0 0 40 12" fill="none" className={styles.connectorSvg}>
                    <line x1="0" y1="6" x2="36" y2="6" stroke="var(--c-accent)" strokeWidth="2" strokeDasharray="4 3" opacity="0.4" />
                    <path d="M32 2 L38 6 L32 10" stroke="var(--c-accent)" strokeWidth="2" fill="none" opacity="0.5" />
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
