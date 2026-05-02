"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowRight, Search, Sparkles, CheckCircle2, Coins, Users } from "lucide-react";
import styles from "./page.module.css";

const EXAMPLE_BUILDERS = [
  { label: "vitalik.eth", hint: "Ethereum co-founder" },
  { label: "nick.eth", hint: "ENS creator" },
  { label: "brantly.eth", hint: "ENS ecosystem" },
];

export default function BuilderIndexPage() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [error, setError] = useState("");

  function handleLookup(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = query.trim();
    if (!trimmed) {
      setError("Enter an ENS name or Ethereum address.");
      return;
    }
    const isAddress = /^0x[0-9a-fA-F]{40}$/.test(trimmed);
    const isEns = trimmed.includes(".");
    if (!isAddress && !isEns) {
      setError("Enter a valid ENS name (e.g. alice.eth) or 0x address.");
      return;
    }
    setError("");
    router.push(`/builder/${encodeURIComponent(trimmed)}`);
  }

  return (
    <div className={styles.page}>
      <div className={styles.shell}>

        <Link href="/" className={styles.backLink}>← Back to system view</Link>

        <header className={styles.header}>
          <div className={styles.eyebrow}>
            <Sparkles size={15} />
            Portable reputation
          </div>
          <h1 className={styles.title}>
            Every thread tells a story.
          </h1>
          <p className={styles.subtitle}>
            Weft weaves onchain evidence — shipped milestones, released capital, peer corroboration — into a portable trust profile tied to your identity. Look up any builder to see their fabric.
          </p>
        </header>

        <section className={styles.lookupCard}>
          <form onSubmit={handleLookup} className={styles.lookupForm}>
            <div className={styles.inputWrap}>
              <Search size={18} className={styles.inputIcon} />
              <input
                className={styles.input}
                type="text"
                placeholder="alice.eth or 0x1234…"
                value={query}
                onChange={(e) => { setQuery(e.target.value); setError(""); }}
                autoFocus
                autoComplete="off"
                spellCheck={false}
              />
            </div>
            <button type="submit" className={styles.lookupBtn}>
              View profile
              <ArrowRight size={16} />
            </button>
          </form>
          {error && <p className={styles.errorMsg}>{error}</p>}

          <div className={styles.examples}>
            <span className={styles.examplesLabel}>Try an example:</span>
            {EXAMPLE_BUILDERS.map(({ label, hint }) => (
              <button
                key={label}
                className={styles.exampleChip}
                onClick={() => router.push(`/builder/${encodeURIComponent(label)}`)}
                title={hint}
              >
                {label}
              </button>
            ))}
          </div>
        </section>

        <section className={styles.explainerGrid}>
          <article className={styles.explainerCard}>
            <div className={styles.explainerIcon}><CheckCircle2 size={20} /></div>
            <h3>Verified outcomes</h3>
            <p>Each milestone a builder ships is attested by an autonomous verifier swarm — not a single trusted party. The evidence is persistent and inspectable.</p>
          </article>
          <article className={styles.explainerCard}>
            <div className={styles.explainerIcon}><Coins size={20} /></div>
            <h3>Capital released, not promised</h3>
            <p>Trust profiles show real capital that moved — not pledges or intentions. Released ETH is the signal that matters.</p>
          </article>
          <article className={styles.explainerCard}>
            <div className={styles.explainerIcon}><Users size={20} /></div>
            <h3>Portable across teams</h3>
            <p>Reputation is tied to your ENS identity, not a platform account. Take it to the next project, the next sponsor, the next collaboration.</p>
          </article>
        </section>

        <section className={styles.onboardingSection}>
          <div className={styles.onboardingHeader}>
            <span className={styles.sectionKicker}>Are you a builder?</span>
            <h2>Start weaving your trust fabric.</h2>
            <p>
              Create a milestone, lock capital behind an outcome, and let the verifier network do the rest. When you ship, the evidence becomes part of your permanent, portable reputation.
            </p>
          </div>
          <div className={styles.onboardingSteps}>
            <div className={styles.onboardingStep}>
              <span className={styles.stepNum}>01</span>
              <div>
                <h4>Define your outcome</h4>
                <p>Describe what you will ship and by when. A sponsor or DAO locks capital behind it.</p>
              </div>
            </div>
            <div className={styles.onboardingStep}>
              <span className={styles.stepNum}>02</span>
              <div>
                <h4>Ship and get verified</h4>
                <p>Autonomous verifiers collect evidence — deployments, usage, commits — and reach consensus via peer corroboration.</p>
              </div>
            </div>
            <div className={styles.onboardingStep}>
              <span className={styles.stepNum}>03</span>
              <div>
                <h4>Capital releases, reputation grows</h4>
                <p>Verified outcomes release capital and add a permanent thread to your trust profile. Each milestone strengthens the fabric.</p>
              </div>
            </div>
          </div>
          <div className={styles.onboardingCta}>
            <a
              href="https://github.com/thisyearnofear/weft#builder-onboarding"
              target="_blank"
              rel="noopener noreferrer"
              className={styles.ctaBtn}
            >
              Read the builder guide
              <ArrowRight size={16} />
            </a>
            <Link href="/" className={styles.ctaSecondary}>
              Explore live milestones
            </Link>
          </div>
        </section>

      </div>
    </div>
  );
}
