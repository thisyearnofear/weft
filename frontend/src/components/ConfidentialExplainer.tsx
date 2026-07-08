"use client";

import { Lock, ShieldCheck, LockOpen, Cpu, Zap, Info } from "lucide-react";
import styles from "./ConfidentialExplainer.module.css";

type Variant = "v1" | "v2";
export type Status = "sealed" | "decryptable" | "verified" | "rejected";

const OP_CLASS: Record<Variant, { label: string; ops: string; icon: typeof Cpu; blurb: string }> = {
  v1: {
    label: "Addition-class FHE",
    ops: "FHE.add · FHE.ge · FHE.select",
    icon: Cpu,
    blurb: "Each verifier casts an encrypted yes/no ballot; the contract adds votes and checks quorum on ciphertext.",
  },
  v2: {
    label: "Multiplication-class FHE",
    ops: "FHE.mul · FHE.add · FHE.and",
    icon: Zap,
    blurb: "Each verifier casts an encrypted ballot and an encrypted confidence score; the contract multiplies them on ciphertext.",
  },
};

export function ConfidentialExplainer({ variant, status }: { variant: Variant; status: Status }) {
  const op = OP_CLASS[variant];
  const OpIcon = op.icon;

  const steps: { n: number; icon: typeof Lock; title: string; body: string }[] = [
    {
      n: 1,
      icon: Lock,
      title: "Seal",
      body:
        variant === "v1"
          ? "Each verifier casts an encrypted yes/no ballot. The vote is a Zama ciphertext — never plaintext."
          : "Each verifier casts an encrypted ballot and an encrypted confidence score. Neither is ever plaintext.",
    },
    {
      n: 2,
      icon: ShieldCheck,
      title: "Tally",
      body:
        variant === "v1"
          ? "The contract adds ballots and checks quorum on ciphertext with FHE.add / FHE.ge. No individual vote is decrypted."
          : "The contract computes weightedVote = FHE.mul(ballot, confidence), accumulates it, and checks both quorums — all on ciphertext.",
    },
    {
      n: 3,
      icon: LockOpen,
      title: "Reveal",
      body: "Only the final result becomes decryptable — after all 3 ballots are in. You decrypt it yourself via the Zama relayer.",
    },
  ];

  const statusLabel: Record<Status, string> = {
    sealed: "Ballots being collected",
    decryptable: "Result decryptable now",
    verified: "Verified onchain",
    rejected: "Quorum not reached",
  };

  return (
    <section className={styles.wrap} aria-label="How confidential verification works">
      <div className={styles.head}>
        <span className={styles.demoBadge}>
          <Info size={12} /> Demo milestone · live on Sepolia
        </span>
        <span className={styles.statusPill} data-status={status}>
          {statusLabel[status]}
        </span>
        <span className={styles.opClass}>
          <OpIcon size={13} /> {op.label}
        </span>
      </div>

      <p className={styles.note}>
        Reference milestone on a deployed Zama FHEVM contract. The ballots are real encrypted votes
        cast by the verifier agents — {variant === "v1" ? "a yes/no" : "a ballot + confidence score"}{" "}
        per verifier. No vote, and no confidence score, is ever decrypted by anyone.
      </p>

      {/* Seal → Tally → Reveal tour */}
      <ol className={styles.steps}>
        {steps.map((s) => {
          const Icon = s.icon;
          return (
            <li key={s.n} className={styles.step}>
              <div className={styles.stepIcon}>
                <Icon size={18} />
                <span className={styles.stepNum}>{s.n}</span>
              </div>
              <h4 className={styles.stepTitle}>{s.title}</h4>
              <p className={styles.stepBody}>{s.body}</p>
            </li>
          );
        })}
      </ol>

      {/* Diagram: verifier nodes → contract → revealed result */}
      <div className={styles.diagram}>
        <div className={styles.nodeGroup}>
          {[1, 2, 3].map((i) => (
            <div key={i} className={styles.node}>
              <Lock size={14} />
              <span>Verifier {i}</span>
              <em>encrypted</em>
            </div>
          ))}
        </div>
        <div className={styles.connector} aria-hidden="true">
          <span />
        </div>
        <div className={styles.contract}>
          <ShieldCheck size={18} />
          <span>Contract tallies on ciphertext</span>
          <code>{op.ops}</code>
        </div>
        <div className={styles.connector} aria-hidden="true">
          <span />
        </div>
        <div className={styles.result}>
          <LockOpen size={16} />
          <span>You decrypt the result</span>
        </div>
      </div>

      <p className={styles.opBlurb}>
        <OpIcon size={13} /> {op.blurb}
      </p>
    </section>
  );
}
