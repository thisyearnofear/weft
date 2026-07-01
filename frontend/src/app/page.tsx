"use client";

import Link from "next/link";
import { useState, useMemo, FormEvent } from "react";
import { ArrowRight, Bot, Sparkles, Clock, Search, AlertTriangle, TrendingDown } from "lucide-react";

import { MilestoneCard } from "@/components/MilestoneCard";
import { SkeletonCard } from "@/components/SkeletonCard";
import { ChronicleShowcase } from "@/components/ChronicleShowcase";
import { AskWeft } from "@/components/AskWeft";
import { ConsensusVisual } from "@/components/ConsensusVisual";
import { TreasuryWidget } from "@/components/TreasuryWidget";
import { HowItWorks } from "@/components/HowItWorks";
import { Reveal } from "@/components/Reveal";
import { useMilestones, useMilestone } from "@/hooks/useMilestones";
import { useStatusOverview, useStatusMilestone } from "@/hooks/useStatusApi";
import { useBuilderPassport } from "@/hooks/useBuilderPassport";
import type { Milestone as MilestoneType, MilestoneState } from "@/lib/mock-data";
import styles from "./page.module.css";

/* ── Live Counters ── */
function StatCard({ value, label, suffix = "" }: { value: number | string; label: string; suffix?: string }) {
  const display = typeof value === "string" ? value : (value >= 1000 ? `${(value / 1000).toFixed(1)}k` : String(value));
  return (
    <div className={styles.statCard}>
      <span className={styles.statValue}>{display}{suffix}</span>
      <span className={styles.statLabel}>{label}</span>
    </div>
  );
}

/* ── Milestone Lookup ── */
function MilestoneLookup() {
  const [input, setInput] = useState("");
  const [hash, setHash] = useState("");
  const { data, isLoading, error } = useStatusMilestone(hash, true);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const trimmed = input.trim();
    const fullHash = trimmed.startsWith("0x") ? trimmed : `0x${trimmed}`;
    if (/^0x[a-fA-F0-9]{64}$/.test(fullHash)) {
      setHash(fullHash);
    }
  };

  const stakedEth = data ? (Number(data.totalStaked) / 1e18).toFixed(4) : null;
  const isVerified = data?.verified;
  const hasResult = data && !isLoading && !error;

  return (
    <div style={{ width: "100%", maxWidth: "480px" }}>
      <form onSubmit={handleSubmit} style={{
        display: "flex",
        gap: "8px",
        background: "var(--c-surface)",
        border: "1px solid var(--c-border-2)",
        borderRadius: "10px",
        padding: "4px",
      }}>
        <div style={{
          display: "flex",
          alignItems: "center",
          gap: "8px",
          flex: 1,
          paddingLeft: "12px",
        }}>
          <Search size={16} color="var(--c-text-3)" />
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Paste a milestone hash (0x...)"
            style={{
              flex: 1,
              border: "none",
              outline: "none",
              background: "transparent",
              fontSize: "14px",
              color: "var(--c-text)",
              padding: "10px 0",
            }}
          />
        </div>
        <button type="submit" style={{
          padding: "10px 20px",
          background: "var(--c-accent)",
          color: "#fff",
          border: "none",
          borderRadius: "8px",
          fontSize: "14px",
          fontWeight: 600,
          cursor: "pointer",
        }}>
          Check
        </button>
      </form>

      <div style={{
        display: "flex",
        alignItems: "center",
        gap: "8px",
        marginTop: "8px",
        fontSize: "13px",
        color: "var(--c-text-3)",
      }}>
        <span>Try:</span>
        <button
          type="button"
          onClick={() => {
            setInput("0x516975afcb46acf3ea2265789ea0a64516db9f1d8e6cfb65737fc9cfafb1c16f");
            setHash("0x516975afcb46acf3ea2265789ea0a64516db9f1d8e6cfb65737fc9cfafb1c16f");
          }}
          style={{
            fontFamily: "monospace",
            fontSize: "12px",
            padding: "4px 10px",
            background: "var(--c-surface-2)",
            border: "1px solid var(--c-border)",
            borderRadius: "6px",
            color: "var(--c-accent)",
            cursor: "pointer",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
            maxWidth: "220px",
          }}
          title="Click to check the demo milestone"
        >
          0x516975...b1c16f
        </button>
      </div>

      {isLoading && (
        <div style={{ padding: "12px 16px", fontSize: "14px", color: "var(--c-text-muted)" }}>
          Loading milestone data...
        </div>
      )}

      {error && (
        <div style={{ padding: "12px 16px", fontSize: "14px", color: "var(--c-error)" }}>
          Milestone not found. Check the hash and try again.
        </div>
      )}

      {hasResult && (
        <div style={{
          marginTop: "10px",
          background: "var(--c-surface)",
          border: "1px solid var(--c-border)",
          borderRadius: "10px",
          padding: "16px",
          display: "flex",
          flexDirection: "column",
          gap: "12px",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <span style={{ fontSize: "20px" }}>
              {isVerified ? "✅" : "⏳"}
            </span>
            <div>
              <div style={{ fontWeight: 700, fontSize: "15px", color: "var(--c-text)" }}>
                {isVerified ? "Verified" : data?.finalized ? "Failed" : "Pending"}
              </div>
              <div style={{ fontSize: "13px", color: "var(--c-text-muted)", fontFamily: "monospace" }}>
                {hash.slice(0, 10)}...{hash.slice(-6)}
              </div>
            </div>
            <div style={{ marginLeft: "auto", textAlign: "right" }}>
              <div style={{ fontWeight: 700, fontSize: "15px", color: "var(--c-text)" }}>
                {stakedEth} ETH
              </div>
              <div style={{ fontSize: "13px", color: "var(--c-text-muted)" }}>
                {data?.released ? "Released" : data?.finalized ? "Refundable" : "Locked"}
              </div>
            </div>
          </div>
          <div style={{
            display: "flex",
            gap: "16px",
            fontSize: "13px",
            color: "var(--c-text-muted)",
            flexWrap: "wrap",
          }}>
            {data?.builder && (
              <span>
                Builder: <strong style={{ color: "var(--c-accent)" }}>
                  {data.builder.slice(0, 6)}...{data.builder.slice(-4)}
                </strong>
              </span>
            )}
            {data?.deadline && (
              <span>
                Deadline: {new Date(Number(data.deadline) * 1000).toLocaleDateString()}
              </span>
            )}
          </div>
          {data?.verified && data?.verifiedVotes > 0 && (
            <div style={{
              display: "flex",
              gap: "8px",
              fontSize: "13px",
              color: "var(--c-verified)",
            }}>
              ✓ {data.verifiedVotes} of {data.verifierCount} verifier votes
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ── Milestone from contract ── */
function MilestoneFromContract({ hash, index }: { hash: `0x${string}`; index: number }) {
  const { data, isLoading, error } = useMilestone(hash);
  const { data: statusData } = useStatusMilestone(hash, true);

  if (isLoading) return <SkeletonCard key={hash} index={index} />;
  if (error || !data || !data.builder) return null;

  const state: MilestoneState = data.verified ? "verified" : data.finalized ? "failed" : "pending";
  const stakedEth = (Number(data.totalStaked ?? 0) / 1e18).toFixed(4);
  const builderShort = data.builder ? `${data.builder.slice(0, 6)}...${data.builder.slice(-4)}` : "Unknown";
  const demo = statusData?.demo;
  const liveTags = [
    data.verified ? "Capital Released" : data.finalized ? "Refundable" : "Capital Locked",
    demo?.tracks.gensyn.bestPeerGroup ? `${demo.tracks.gensyn.bestPeerGroup.peerCount} peer signers` : "Awaiting corroboration",
    demo?.tracks.keeperhub.configured ? "Reliable execution" : "Fallback execution",
  ];

  const milestone: MilestoneType = {
    hash,
    projectName: `Milestone ${hash.slice(0, 8)}...`,
    projectId: data.projectId,
    description: data.verified
      ? `Outcome verified. ${stakedEth} ETH unlocked for ${demo?.tracks.ens.builderEns || builderShort}.`
      : data.finalized
        ? `Outcome did not verify. ${stakedEth} ETH can move through the refund path.`
        : `${stakedEth} ETH is gated behind evidence collection and verifier corroboration.`,
    builder: { ens: demo?.tracks.ens.builderEns || builderShort, address: data.builder, type: "human" },
    coBuilders: [],
    deadline: Number(data.deadline) * 1000,
    totalStaked: stakedEth,
    state,
    verifiedVotes: data.verifiedVotes,
    verifierCount: data.verifierCount,
    tags: liveTags,
    evidenceRoot:
      data.finalEvidenceRoot !== "0x0000000000000000000000000000000000000000000000000000000000000000"
        ? data.finalEvidenceRoot
        : undefined,
  };

  const falImageUrl = statusData?.demo?.tracks?.fal?.available
    ? (statusData.demo.tracks.fal.falImageUrl || statusData.demo.tracks.fal.falCoverUrl || null)
    : null;

  return <MilestoneCard milestone={milestone} index={index} swatchUrl={falImageUrl} />;
}

/* ── Problem section cards ── */
const PROBLEM_CARDS = [
  {
    icon: Clock,
    title: "Reviews take weeks",
    body: "A sponsor receives a grant report. They need to manually verify deployments, check usage, review code. Weeks pass. The builder waits.",
    stat: "3+ weeks",
    statLabel: "Average manual review time",
  },
  {
    icon: TrendingDown,
    title: "Capital sits idle",
    body: "ETH locked in a multisig or waiting for a sponsor's approval earns nothing for the builder. Every day of delay is opportunity cost.",
    stat: "100%",
    statLabel: "Capital frozen during review",
  },
  {
    icon: AlertTriangle,
    title: "Trust is subjective",
    body: "Did the builder actually ship? Did users actually come? Without onchain evidence, the sponsor guesses. The builder argues. Disputes escalate.",
    stat: "0",
    statLabel: "Objective proof in manual reviews",
  },
];

export default function Home() {
  const { data: hashes, isLoading } = useMilestones();
  const { data: overview } = useStatusOverview();
  const builderEns = overview?.demoHints?.builderEns || "weft.thisyearnofear.eth";
  const { data: builderPassport } = useBuilderPassport(builderEns);

  const milestoneHashes = useMemo(() => {
    const statusMilestones = overview?.demoHints?.milestones ?? [];
    const source = hashes && hashes.length > 0 ? hashes : statusMilestones;
    return Array.from(new Set(source));
  }, [hashes, overview?.demoHints?.milestones]);
  const verifiedOutcomeCount = Math.max(milestoneHashes.length, builderPassport?.weftMilestonesVerified ?? 0);

  return (
    <div className={styles.container}>
      {/* ════════════════════════════════════════════════════════════════
          HERO — What is Weft? (one sentence + how it works visual)
          ════════════════════════════════════════════════════════════════ */}
      <section className={styles.hero}>
        <div className={styles.heroCopy}>
          <div className={`${styles.eyebrow} stagger stagger-1`}>
            <Bot size={15} />
            {overview?.pitch || "Autonomous milestone funding on 0G Chain"}
          </div>
          <h1 className={`${styles.title} stagger stagger-2`}>
            Autonomous escrow for{" "}
            <span className={styles.accent}>onchain builders.</span>
          </h1>
          <p className={`${styles.subtitle} stagger stagger-3`}>
            A sponsor locks ETH behind a deliverable. The builder ships.
            AI agents verify the work onchain — deployment, usage, code activity.
            If 2 of 3 agents agree, capital releases instantly.
            No manual reviews. No chasing sponsors. No payment politics.
          </p>

          <div className={`${styles.heroActions} stagger stagger-4`}>
            <Link href="/sponsor" className={styles.primaryAction}>
              Fund a milestone <ArrowRight size={16} />
            </Link>
            <Link href="/builder" className={styles.secondaryAction}>
              I&apos;m a builder
            </Link>
          </div>

          {/* Live stats strip */}
          <div className={`${styles.statsStrip} stagger stagger-5`}>
            <StatCard value={1} label="Verified milestone" />
            <div className={styles.statDivider} />
            <StatCard value={"0.01"} label="ETH capital released" />
            <div className={styles.statDivider} />
            <StatCard value={2} label="Verifier votes cast" />
            <div className={styles.statDivider} />
            <StatCard value={"2/3"} label="Quorum reached" />
          </div>
        </div>

        <div className={styles.heroPanel}>
          <ConsensusVisual />
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════════
          THE PROBLEM — Why this matters
          ════════════════════════════════════════════════════════════════ */}
      <Reveal as="section" className={styles.problemSection}>
        <div className={styles.sectionHeader}>
          <div>
            <span className={styles.sectionKicker}>The problem</span>
            <h2 className={styles.sectionTitle}>Builders ship. Sponsors ghost.</h2>
          </div>
        </div>
        <p className={styles.sectionText} style={{ maxWidth: "640px" }}>
          Every day, builders in crypto deliver work — contracts deployed, code shipped,
          users acquired. And every day, payment sits behind a sponsor&apos;s inbox.
          Manual reviews take weeks. Capital freezes. Trust is subjective. Weft replaces
          that entire process with autonomous agents that verify evidence and release
          capital without a human in the loop.
        </p>
        <div className={styles.problemGrid}>
          {PROBLEM_CARDS.map((card) => {
            const Icon = card.icon;
            return (
              <div key={card.title} className={styles.problemCard}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <Icon size={18} color="var(--c-failed)" />
                  <h3 className={styles.problemCardTitle}>{card.title}</h3>
                </div>
                <p className={styles.problemCardBody}>{card.body}</p>
                <div style={{ marginTop: "auto", paddingTop: "0.5rem" }}>
                  <div className={styles.problemStat}>{card.stat}</div>
                  <div className={styles.problemStatLabel}>{card.statLabel}</div>
                </div>
              </div>
            );
          })}
        </div>
      </Reveal>

      {/* ════════════════════════════════════════════════════════════════
          HOW IT WORKS — 4-step visual
          ════════════════════════════════════════════════════════════════ */}
      <Reveal as="section" className={styles.howItWorksSection} delay={100}>
        <div className={styles.sectionHeader}>
          <div>
            <span className={styles.sectionKicker}>How it works</span>
            <h2 className={styles.sectionTitle}>From lock to release in four steps</h2>
          </div>
        </div>
        <HowItWorks />
      </Reveal>

      {/* ════════════════════════════════════════════════════════════════
          SEE IT IN ACTION — hash lookup + live consensus
          ════════════════════════════════════════════════════════════════ */}
      <Reveal as="section" className={styles.demoSection} delay={100}>
        <div className={styles.sectionHeader}>
          <div>
            <span className={styles.sectionKicker}>Live demo</span>
            <h2 className={styles.sectionTitle}>See it in action</h2>
          </div>
        </div>
        <p className={styles.sectionText} style={{ maxWidth: "640px", marginBottom: "0.5rem" }}>
          A real milestone has been verified on 0G Testnet. 0.01 ETH was released to the
          builder after 2 of 3 verifier nodes reached consensus. Check the onchain proof
          yourself, or talk to the agent that verified it.
        </p>
        <div className={styles.demoGrid}>
          {/* Left: hash lookup */}
          <div className={styles.demoCol}>
            <span className={styles.demoColTitle}>Check a milestone</span>
            <MilestoneLookup />
          </div>
          {/* Right: Ask Weft */}
          <div className={styles.demoCol}>
            <span className={styles.demoColTitle}>Talk to the agent</span>
            <AskWeft />
          </div>
        </div>
      </Reveal>

      {/* ════════════════════════════════════════════════════════════════
          THE AGENT RUNS A COMPANY — Treasury + autonomous ops
          ════════════════════════════════════════════════════════════════ */}
      <Reveal as="section" className={styles.agentSection} delay={100}>
        <div className={styles.sectionHeader}>
          <div>
            <span className={styles.sectionKicker}>Autonomous operations</span>
            <h2 className={styles.sectionTitle}>Weft is an agent-run company</h2>
          </div>
        </div>
        <div className={styles.agentIntro}>
          <div className={styles.agentIntroText}>
            <p className={styles.sectionText}>
              Weft isn&apos;t just a smart contract. It&apos;s a self-sustaining business
              operated by autonomous agents. Every time a milestone is verified, the agent
              earns 3% of the released capital. It uses that revenue to pay for its own
              infrastructure — LLM inference, image generation, onchain execution.
            </p>
            <ul className={styles.agentFeatureList}>
              <li className={styles.agentFeatureItem}>
                <span className={styles.agentFeatureCheck}>✓</span>
                <span><strong>Earns</strong> 3% of every milestone it verifies (onchain revenue)</span>
              </li>
              <li className={styles.agentFeatureItem}>
                <span className={styles.agentFeatureCheck}>✓</span>
                <span><strong>Spends</strong> that revenue via Stripe to pay for Kimi, fal.ai, KeeperHub</span>
              </li>
              <li className={styles.agentFeatureItem}>
                <span className={styles.agentFeatureCheck}>✓</span>
                <span><strong>Provisions</strong> its own SaaS when it needs to scale</span>
              </li>
              <li className={styles.agentFeatureItem}>
                <span className={styles.agentFeatureCheck}>✓</span>
                <span><strong>Reports</strong> its P&amp;L transparently — no human touches the finances</span>
              </li>
            </ul>
          </div>
          <TreasuryWidget />
        </div>
      </Reveal>

      {/* ════════════════════════════════════════════════════════════════
          EVERY VERIFICATION BECOMES A STORY — Chronicle
          ════════════════════════════════════════════════════════════════ */}
      <ChronicleShowcase />

      {/* ════════════════════════════════════════════════════════════════
          LIVE MILESTONES
          ════════════════════════════════════════════════════════════════ */}
      {milestoneHashes.length > 0 || verifiedOutcomeCount > 0 ? (
        <Reveal as="section" className={styles.section} delay={100}>
        <div className={styles.sectionHeader}>
          <div>
            <span className={styles.sectionKicker}>Live trust decisions</span>
            <h2 className={styles.sectionTitle}>Milestones being verified right now</h2>
          </div>
          <span className={styles.sectionCount}>
            {isLoading ? "Loading..." : `${verifiedOutcomeCount > 0 ? verifiedOutcomeCount : '—'} verified`}
          </span>
        </div>
        <div className={styles.grid}>
          {isLoading
            ? Array.from({ length: 3 }).map((_, i) => <SkeletonCard key={i} index={i} />)
            : milestoneHashes.length > 0
              ? milestoneHashes.map((hash, i) => (
                  <MilestoneFromContract key={hash} hash={hash} index={i} />
                ))
              : verifiedOutcomeCount > 0
                ? (
                  <div className={styles.profileMilestoneCard}>
                    <div>
                      <span className={styles.profileMilestoneKicker}>Verified trust profile</span>
                      <h3>{builderEns}</h3>
                      <p>
                        This identity already has {verifiedOutcomeCount} verified outcome{verifiedOutcomeCount === 1 ? "" : "s"}.
                        Open the profile to show judges the portable reputation record while onchain milestone discovery catches up.
                      </p>
                    </div>
                    <Link href={`/builder/${builderEns}`} className={styles.emptyCta}>
                      View verified profile <ArrowRight size={16} />
                    </Link>
                  </div>
                )
              : (
                <div className={styles.emptyState}>
                  <div className={styles.emptyStateInner}>
                    <Sparkles size={28} className={styles.emptyIcon} />
                    <h3 className={styles.emptyTitle}>No milestones yet</h3>
                    <p className={styles.emptyBody}>
                      Be the first to create a milestone and experience autonomous verification.
                      Weft handles evidence collection, peer consensus, and capital release —
                      you just ship the work.
                    </p>
                    <Link href="/builder" className={styles.emptyCta}>
                      Create your first milestone <ArrowRight size={16} />
                    </Link>
                  </div>
                </div>
              )}
        </div>
      </Reveal>) : null}

      {/* ════════════════════════════════════════════════════════════════
          BOTTOM CTA — two paths
          ════════════════════════════════════════════════════════════════ */}
      <Reveal as="section" className={styles.bottomPanel} delay={100}>
        <div className={styles.bottomCard}>
          <div className={styles.bottomHeader}>
            <Sparkles size={18} />
            <span>Ready to ship without friction?</span>
          </div>
          <h3>Two ways to use Weft</h3>
          <p>
            <strong>Sponsors</strong> lock capital behind a deliverable and get cryptographic
            proof when it&apos;s done. <strong>Builders</strong> ship work and get paid
            automatically when verifiers confirm the outcome.
          </p>
          <div className={styles.heroActions} style={{ marginTop: "1.5rem" }}>
            <Link href="/sponsor" className={styles.primaryAction}>
              Fund a milestone <ArrowRight size={16} />
            </Link>
            <Link href="/builder" className={styles.secondaryAction}>
              Create a milestone
            </Link>
          </div>
        </div>
      </Reveal>

      {/* ── Pricing ── */}
      <div style={{
        textAlign: "center",
        padding: "0.5rem 1rem 2rem",
        fontSize: "0.8rem",
        color: "var(--c-text-3)",
      }}>
        Protocol fee: 3% of released capital → funds the agent&apos;s autonomous operations
      </div>
    </div>
  );
}
