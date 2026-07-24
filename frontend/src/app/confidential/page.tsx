"use client";

import Link from "next/link";
import {
  ArrowRight,
  Cpu,
  Eye,
  EyeOff,
  Lock,
  LockOpen,
  ShieldCheck,
  Vote,
  Zap,
} from "lucide-react";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { ConfidentialExplainer } from "@/components/ConfidentialExplainer";
import { SealedReveal } from "@/components/SealedReveal";
import { AgentHelper } from "@/components/AgentHelper";
import { DEMO_FHE_V1_HASH, DEMO_FHE_V2_HASH } from "@/lib/demo-milestones";
import styles from "./page.module.css";

const STEPS = [
  {
    icon: Lock,
    title: "Seal",
    body: "Each verifier encrypts a ballot — and optionally a confidence score — as Zama ciphertext. Individual votes never appear in plaintext.",
  },
  {
    icon: ShieldCheck,
    title: "Tally",
    body: "The contract adds or multiplies on ciphertext. Quorum checks run homomorphically; no vote is decrypted mid-flight.",
  },
  {
    icon: LockOpen,
    title: "Reveal",
    body: "Only the final pass/fail becomes publicly decryptable after all ballots are in. You decrypt it yourself via the Zama relayer.",
  },
];

export default function ConfidentialPage() {
  return (
    <div className={styles.container}>
      <div className={styles.inner}>
        <Breadcrumbs items={[{ label: "Confidential verification" }]} />

        <section className={styles.hero}>
          <div className={styles.heroCopy}>
            <div className={styles.eyebrow}>
              <Lock size={15} /> Encrypted verification · Sepolia
            </div>
            <h1>Verifier votes stay encrypted until the result is final.</h1>
            <p>
              On public milestones, every verifier vote is visible onchain. On
              confidential milestones, each vote is encrypted before it leaves the
              agent. The contract tallies on ciphertext — no one sees individual
              votes, only the final pass/fail. You decrypt the result yourself
              once all ballots are in.
            </p>
            <div className={styles.heroActions}>
              <Link href={`/project/${DEMO_FHE_V1_HASH}?confidential=1`} className={styles.primaryAction}>
                Open v1 demo <ArrowRight size={16} />
              </Link>
              <Link href={`/project/${DEMO_FHE_V2_HASH}?weighted=1`} className={styles.secondaryAction}>
                Open v2 weighted demo <ArrowRight size={16} />
              </Link>
              <Link href="/explorer#fhe-demos" className={styles.secondaryAction}>
                Browse in explorer <ArrowRight size={16} />
              </Link>
            </div>
          </div>

          <div className={styles.visualPanel}>
            <div className={styles.visualHeader}>
              <Vote size={18} />
              <span>Sealed → decryptable → verified</span>
            </div>
            <SealedReveal revealed={false} />
            <p className={styles.visualCaption}>
              The knot holds while ballots are collected. After quorum, the relayer decrypts
              only the final result — individual votes stay sealed forever.
            </p>
          </div>
        </section>

        <section className={styles.stepsSection}>
          <div className={styles.sectionHeader}>
            <span>How it works</span>
            <h2>Encrypt, tally, reveal — three steps, no plaintext votes.</h2>
          </div>
          <div className={styles.stepsGrid}>
            {STEPS.map((step, index) => {
              const Icon = step.icon;
              return (
                <div key={step.title} className={styles.stepCard}>
                  <span className={styles.stepIndex}>{String(index + 1).padStart(2, "0")}</span>
                  <div className={styles.stepIcon}><Icon size={18} /></div>
                  <h3>{step.title}</h3>
                  <p>{step.body}</p>
                </div>
              );
            })}
          </div>
        </section>

        <section className={styles.variantSection}>
          <div className={styles.sectionHeader}>
            <span>Two live demos</span>
            <h2>Addition-class and multiplication-class FHE.</h2>
          </div>
          <div className={styles.variantGrid}>
            <Link href={`/project/${DEMO_FHE_V1_HASH}?confidential=1`} className={styles.variantCard}>
              <div className={styles.variantIcon}><Lock size={20} /></div>
              <span className={styles.variantKicker}>v1 · FHE.add</span>
              <h3>Boolean quorum</h3>
              <p>
                Each verifier casts an encrypted yes/no ballot. The contract adds votes and
                checks quorum on ciphertext with <code>FHE.add</code> / <code>FHE.ge</code>.
              </p>
              <span className={styles.variantLink}>Open &amp; decrypt <ArrowRight size={14} /></span>
            </Link>
            <Link href={`/project/${DEMO_FHE_V2_HASH}?weighted=1`} className={styles.variantCard}>
              <div className={styles.variantIcon}><Zap size={20} /></div>
              <span className={styles.variantKicker}>v2 · FHE.mul</span>
              <h3>Confidence-weighted votes</h3>
              <p>
                Each verifier encrypts a ballot and a confidence score. The contract computes
                <code> FHE.mul(ballot, confidence)</code> before revealing only the weighted outcome.
              </p>
              <span className={styles.variantLink}>Open &amp; decrypt <ArrowRight size={14} /></span>
            </Link>
          </div>
        </section>

        <section className={styles.explainerSection}>
          <ConfidentialExplainer variant="v1" status="decryptable" />
        </section>

        <section className={styles.compareSection}>
          <div className={styles.compareCard}>
            <EyeOff size={18} />
            <h2>What stays hidden</h2>
            <p>Individual verifier ballots, interim tallies, and confidence scores until the contract marks the result decryptable.</p>
          </div>
          <div className={styles.compareCard}>
            <Eye size={18} />
            <h2>What stays public</h2>
            <p>Final verified/rejected outcome, evidence root, stake amounts, and the fact that quorum was reached on ciphertext.</p>
          </div>
          <div className={styles.compareCard}>
            <Cpu size={18} />
            <h2>What you can try</h2>
            <p>
              Stake on a demo milestone, watch sealed ballots arrive, then click{" "}
              <strong>Decrypt sealed result</strong> once finalized — the relayer refuses early requests by design.
            </p>
          </div>
        </section>

        <AgentHelper
          context="confidential verification"
          faqs={[
            { q: "What is FHE?", a: "Fully Homomorphic Encryption. It lets the contract compute on encrypted data without decrypting it. Weft uses Zama's FHEVM on Sepolia for sealed-ballot verification." },
            { q: "Why encrypt verifier votes?", a: "So late voters can't copy early ones, and so no one can pressure a verifier by seeing how they voted. Only the final consensus result is decryptable." },
            { q: "What's the difference between v1 and v2?", a: "V1 uses addition (FHE.add) for boolean yes/no ballots. V2 uses multiplication (FHE.mul) to weight each ballot by the verifier's confidence score before tallying." },
            { q: "Can I decrypt the result early?", a: "No. The relayer refuses decryption requests until the contract marks the result as final. This is enforced onchain." },
          ]}
        />

        <section className={styles.crossLink}>
          <p>
            Need the agent trace story too?{" "}
            <Link href="/observability">Open the Agent Observatory</Link> for SigNoz-powered verification telemetry.
          </p>
        </section>
      </div>
    </div>
  );
}
