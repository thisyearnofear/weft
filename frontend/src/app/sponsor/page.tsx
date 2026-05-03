"use client";

import Link from "next/link";
import { ArrowRight, CheckCircle2, Coins, Lock, ShieldCheck, Users } from "lucide-react";
import styles from "../builder/page.module.css";

export default function SponsorPage() {
  return (
    <div className={styles.page}>
      <div className={styles.shell}>

        <Link href="/" className={styles.backLink}>← Back</Link>

        <header className={styles.header}>
          <div className={styles.eyebrow}>
            <Coins size={15} />
            For sponsors &amp; DAOs
          </div>
          <h1 className={styles.title}>
            Fund outcomes, not promises.
          </h1>
          <p className={styles.subtitle}>
            Lock capital behind a deliverable. It only moves when independent verifiers confirm the work happened — no manual reviews, no politics, no disputes.
          </p>
        </header>

        {/* How it works for sponsors */}
        <section className={styles.roleGrid}>
          <article className={styles.roleCard}>
            <div className={styles.roleIcon}><Lock size={24} /></div>
            <h2>Lock capital behind an outcome</h2>
            <p>Agree on a specific, measurable deliverable with a builder. Escrow the funding into a milestone contract — it stays locked until the outcome is verified.</p>
            <div className={styles.roleSteps}>
              <div className={styles.roleStep}><span>01</span> Agree on a deliverable and deadline with the builder</div>
              <div className={styles.roleStep}><span>02</span> Lock capital into the milestone contract</div>
              <div className={styles.roleStep}><span>03</span> Verifiers confirm delivery — capital releases automatically</div>
            </div>
            <a
              href="https://github.com/thisyearnofear/weft#builder-onboarding"
              target="_blank"
              rel="noopener noreferrer"
              className={styles.ctaBtn}
            >
              Read the sponsor guide
              <ArrowRight size={16} />
            </a>
          </article>

          <article className={styles.roleCard}>
            <div className={styles.roleIcon}><ShieldCheck size={24} /></div>
            <h2>What you get as a sponsor</h2>
            <p>No more chasing builders for screenshots or status updates. The evidence is collected automatically and stored permanently — you can inspect it any time.</p>
            <div className={styles.roleSteps}>
              <div className={styles.roleStep}><span>✓</span> Onchain evidence: deployments, usage signals, commits</div>
              <div className={styles.roleStep}><span>✓</span> Multi-node consensus — no single party can fake a verdict</div>
              <div className={styles.roleStep}><span>✓</span> Full audit trail via KeeperHub — transactions don&apos;t fail silently</div>
            </div>
            <a
              href="https://github.com/thisyearnofear/weft"
              target="_blank"
              rel="noopener noreferrer"
              className={styles.ctaBtn}
            >
              View the architecture
              <ArrowRight size={16} />
            </a>
          </article>
        </section>

        {/* Why sponsors trust Weft */}
        <section className={styles.explainerGrid}>
          <article className={styles.explainerCard}>
            <div className={styles.explainerIcon}><CheckCircle2 size={20} /></div>
            <h3>No manual review</h3>
            <p>Autonomous verifiers collect onchain evidence and reach consensus independently. You get a cryptographic proof of delivery, not a builder&apos;s word.</p>
          </article>
          <article className={styles.explainerCard}>
            <div className={styles.explainerIcon}><Lock size={20} /></div>
            <h3>Capital is protected both ways</h3>
            <p>Funds only move on verified delivery. If the outcome doesn&apos;t clear the threshold, capital can be refunded — no disputes, no lawyers, no politics.</p>
          </article>
          <article className={styles.explainerCard}>
            <div className={styles.explainerIcon}><Users size={20} /></div>
            <h3>Fund teams, not individuals</h3>
            <p>Milestones can have multiple builders. Verified outcomes attach to each contributor&apos;s ENS identity — reputation is distributed fairly.</p>
          </article>
        </section>

        <div style={{ textAlign: "center", marginTop: "2rem" }}>
          <p style={{ color: "var(--c-text-muted)", marginBottom: "1rem", fontSize: "0.9rem" }}>
            Already working with a builder? Ask them to create a milestone and share the hash with you.
          </p>
          <Link href="/builder" className={styles.ctaBtn} style={{ display: "inline-flex" }}>
            View builder profiles
            <ArrowRight size={16} />
          </Link>
        </div>

      </div>
    </div>
  );
}
