"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowRight, Search, Sparkles, CheckCircle2, Coins, Users, Rocket } from "lucide-react";
import { useCurvedScrollbar } from "@/hooks/useCurvedScrollbar";
import type { RefObject } from "react";
import styles from "./page.module.css";

export default function BuilderIndexPage() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [error, setError] = useState("");
  const [showLookup, setShowLookup] = useState(false);
  const builderCardRef = useCurvedScrollbar("#6366f1") as RefObject<HTMLElement>;
  const sponsorCardRef = useCurvedScrollbar("#22c55e") as RefObject<HTMLElement>;

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

        <Link href="/" className={styles.backLink}>← Back</Link>

        <header className={styles.header}>
          <div className={styles.eyebrow}>
            <Sparkles size={15} />
            Get started
          </div>
          <h1 className={styles.title}>
            What brings you here?
          </h1>
          <p className={styles.subtitle}>
            Weft works for builders who want to prove their work and get paid, and for sponsors who want to fund outcomes — not promises.
          </p>
        </header>

        {/* Role split — primary entry point with direct CTAs */}
        <section className={styles.roleGrid}>
          <article className={`${styles.roleCard} lift`} ref={builderCardRef as RefObject<HTMLElement>} style={{ position: "relative" }}>
            <div className={styles.roleIcon}><Rocket size={24} /></div>
            <h2>I&apos;m a builder</h2>
            <p>You shipped something — a contract, a product, a milestone. Weft collects the evidence automatically and releases the capital you were promised.</p>
            <Link href="/create-milestone" className={styles.ctaBtn}>
              Create a milestone <ArrowRight size={16} />
            </Link>
          </article>

          <article className={`${styles.roleCard} lift`} ref={sponsorCardRef as RefObject<HTMLElement>} style={{ position: "relative" }}>
            <div className={styles.roleIcon}><Coins size={24} /></div>
            <h2>I&apos;m a sponsor or DAO</h2>
            <p>You want to fund a team without manual review. Lock capital behind a specific outcome — it only moves when autonomous verifiers confirm the work happened.</p>
            <Link href="/sponsor" className={styles.ctaBtn}>
              Fund a milestone <ArrowRight size={16} />
            </Link>
          </article>
        </section>

        {/* Lookup — secondary, for people who already have a profile */}
        <section className={styles.lookupSection}>
          {!showLookup ? (
            <button className={styles.lookupToggle} onClick={() => setShowLookup(true)}>
              <Search size={16} />
              Look up an existing builder profile
            </button>
          ) : (
            <div className={styles.lookupCard}>
              <p className={styles.lookupLabel}>Enter an ENS name or 0x address to view a builder&apos;s trust profile:</p>
              <form onSubmit={handleLookup} className={styles.lookupForm}>
                <div className={styles.inputWrap}>
                  <Search size={18} className={styles.inputIcon} />
                  <input
                    className={styles.input}
                    type="text"
                    placeholder="weft.thisyearnofear.eth or 0x1234..."
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
              <div className={styles.exampleChips}>
                <span className={styles.exampleLabel}>Try:</span>
                {["weft.thisyearnofear.eth", "thisyearnofear.eth"].map((name) => (
                  <button
                    key={name}
                    className={styles.chip}
                    onClick={() => { setQuery(name); setError(""); router.push(`/builder/${encodeURIComponent(name)}`); }}
                  >
                    {name}
                  </button>
                ))}
              </div>
            </div>
          )}
        </section>

        <section className={styles.explainerGrid}>
          <article className={`${styles.explainerCard} stagger stagger-1`}>
            <div className={styles.explainerIcon}><CheckCircle2 size={20} /></div>
            <h3>No manual review</h3>
            <p>Autonomous verifiers collect onchain evidence — deployments, usage signals, commits — and reach consensus independently. No screenshots, no trust-me-bro.</p>
          </article>
          <article className={`${styles.explainerCard} stagger stagger-2`}>
            <div className={styles.explainerIcon}><Coins size={20} /></div>
            <h3>Capital moves on proof, not promises</h3>
            <p>Funds are locked in a smart contract and only release when verifiers confirm the outcome. Both sides are protected from the start.</p>
          </article>
          <article className={`${styles.explainerCard} stagger stagger-3`}>
            <div className={styles.explainerIcon}><Users size={20} /></div>
            <h3>Reputation that travels with you</h3>
            <p>Verified milestones attach to your ENS name. Your track record follows you to the next project, the next sponsor, the next team.</p>
          </article>
        </section>

      </div>
    </div>
  );
}
