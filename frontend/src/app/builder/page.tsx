"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowRight, Search, Sparkles, CheckCircle2, Coins, Users, Rocket, ChevronDown, ChevronUp } from "lucide-react";
import { useCurvedScrollbar } from "@/hooks/useCurvedScrollbar";
import type { RefObject } from "react";
import styles from "./page.module.css";

function GuideSteps({ steps }: { steps: { num: string; title: string; detail: string }[] }) {
  return (
    <ol className={styles.guideSteps}>
      {steps.map((s) => (
        <li key={s.num} className={styles.guideStep}>
          <span className={styles.guideNum}>{s.num}</span>
          <div>
            <strong>{s.title}</strong>
            <p>{s.detail}</p>
          </div>
        </li>
      ))}
    </ol>
  );
}

const BUILDER_STEPS = [
  { num: "01", title: "Define your outcome", detail: "Describe what you will ship — a deployed contract, a product feature, a usage threshold. Be specific: verifiers will check this automatically." },
  { num: "02", title: "Set a deadline", detail: "Choose a realistic deadline. The verifier swarm will inspect evidence after this date and decide whether the outcome was met." },
  { num: "03", title: "Get a sponsor to lock capital", detail: "Share your milestone hash with a sponsor or DAO. They lock ETH into the contract — it only moves when verifiers confirm delivery." },
  { num: "04", title: "Ship the work", detail: "Deploy your contract, hit your usage targets, push your commits. The evidence is collected automatically — no screenshots needed." },
  { num: "05", title: "Capital releases automatically", detail: "Once verifiers reach consensus, capital releases to you onchain. Your verified milestone attaches to your ENS identity as permanent reputation." },
];

const SPONSOR_STEPS = [
  { num: "01", title: "Agree on an outcome with the builder", detail: "Define what success looks like — a deployed contract address, a unique caller threshold, a GitHub commit range. Specificity is what makes automated verification possible." },
  { num: "02", title: "Lock capital into a milestone contract", detail: "Call createMilestone() with the agreed outcome parameters and lock your ETH. The funds are held in escrow — neither party can move them unilaterally." },
  { num: "03", title: "Verifiers do the review", detail: "After the deadline, autonomous verifier nodes collect onchain evidence, compare signals, and reach consensus. No manual review required from you." },
  { num: "04", title: "Capital moves on proof", detail: "If the outcome is verified, capital releases to the builder automatically. If not, it returns to you via the refund path. Either way, you get a permanent evidence record." },
];

export default function BuilderIndexPage() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [error, setError] = useState("");
  const [showLookup, setShowLookup] = useState(false);
  const [builderGuideOpen, setBuilderGuideOpen] = useState(false);
  const [sponsorGuideOpen, setSponsorGuideOpen] = useState(false);
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

        {/* Role split — primary entry point */}
        <section className={styles.roleGrid}>
          <article className={styles.roleCard} ref={builderCardRef as RefObject<HTMLElement>} style={{ position: "relative" }}>
            <div className={styles.roleIcon}><Rocket size={24} /></div>
            <h2>I&apos;m a builder</h2>
            <p>You shipped something — a contract, a product, a milestone. Weft collects the evidence automatically and releases the capital you were promised.</p>
            <button
              className={styles.ctaBtn}
              onClick={() => setBuilderGuideOpen((v) => !v)}
              aria-expanded={builderGuideOpen}
            >
              {builderGuideOpen ? "Hide guide" : "How it works for builders"}
              {builderGuideOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>
            {builderGuideOpen && (
              <div data-scroll-content style={{ maxHeight: "260px", overflowY: "auto", paddingRight: "1rem" }}>
                <GuideSteps steps={BUILDER_STEPS} />
              </div>
            )}
          </article>

          <article className={styles.roleCard} ref={sponsorCardRef as RefObject<HTMLElement>} style={{ position: "relative" }}>
            <div className={styles.roleIcon}><Coins size={24} /></div>
            <h2>I&apos;m a sponsor or DAO</h2>
            <p>You want to fund a team without manual review. Lock capital behind a specific outcome — it only moves when autonomous verifiers confirm the work happened.</p>
            <button
              className={styles.ctaBtn}
              onClick={() => setSponsorGuideOpen((v) => !v)}
              aria-expanded={sponsorGuideOpen}
            >
              {sponsorGuideOpen ? "Hide guide" : "How it works for sponsors"}
              {sponsorGuideOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>
            {sponsorGuideOpen && (
              <div data-scroll-content style={{ maxHeight: "260px", overflowY: "auto", paddingRight: "1rem" }}>
                <GuideSteps steps={SPONSOR_STEPS} />
              </div>
            )}
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
          <article className={styles.explainerCard}>
            <div className={styles.explainerIcon}><CheckCircle2 size={20} /></div>
            <h3>No manual review</h3>
            <p>Autonomous verifiers collect onchain evidence — deployments, usage signals, commits — and reach consensus independently. No screenshots, no trust-me-bro.</p>
          </article>
          <article className={styles.explainerCard}>
            <div className={styles.explainerIcon}><Coins size={20} /></div>
            <h3>Capital moves on proof, not promises</h3>
            <p>Funds are locked in a smart contract and only release when verifiers confirm the outcome. Both sides are protected from the start.</p>
          </article>
          <article className={styles.explainerCard}>
            <div className={styles.explainerIcon}><Users size={20} /></div>
            <h3>Reputation that travels with you</h3>
            <p>Verified milestones attach to your ENS name. Your track record follows you to the next project, the next sponsor, the next team.</p>
          </article>
        </section>

      </div>
    </div>
  );
}
