"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import { useMemo } from "react";
import { ArrowRight, Bot, Coins, ShieldCheck, Sparkles, MessageCircle, Zap, Clock, XCircle, CheckCircle, BarChart3 } from "lucide-react";

import { MilestoneCard } from "@/components/MilestoneCard";
import { SkeletonCard } from "@/components/SkeletonCard";
import { ChronicleShowcase } from "@/components/ChronicleShowcase";
import { AskWeft } from "@/components/AskWeft";
import { ConsensusVisual } from "@/components/ConsensusVisual";
import { useMilestones, useMilestone } from "@/hooks/useMilestones";
import { useStatusOverview, useStatusMilestone } from "@/hooks/useStatusApi";
import { useBuilderPassport } from "@/hooks/useBuilderPassport";
import type { Milestone as MilestoneType, MilestoneState } from "@/lib/mock-data";
import styles from "./page.module.css";

const ScrollStory = dynamic(
  () => import("@/components/ScrollStory").then((m) => ({ default: m.ScrollStory })),
  { ssr: false }
);

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

/* ── Pain/Solution comparison items ── */
const CONTRAST_ITEMS = [
  {
    pain: { icon: <Clock size={14} />, text: "Manual reviews that take weeks" },
    solution: { icon: <Zap size={14} />, text: "Autonomous verification in minutes" },
  },
  {
    pain: { icon: <XCircle size={14} />, text: "Chasing sponsors for payment" },
    solution: { icon: <CheckCircle size={14} />, text: "Capital releases automatically on proof" },
  },
  {
    pain: { icon: <BarChart3 size={14} />, text: "Reputation that resets every project" },
    solution: { icon: <ShieldCheck size={14} />, text: "Portable reputation attached to ENS" },
  },
];

export default function Home() {
  const { data: hashes, isLoading } = useMilestones();
  const { data: overview } = useStatusOverview();
  const builderEns = overview?.demoHints?.builderEns || "weft.thisyearnofear.eth";
  const { data: builderPassport } = useBuilderPassport(builderEns);

  const statusMilestones = overview?.demoHints?.milestones ?? [];
  const milestoneHashes = useMemo(() => {
    const source = hashes && hashes.length > 0 ? hashes : statusMilestones;
    return Array.from(new Set(source));
  }, [hashes, statusMilestones]);
  const verifiedOutcomeCount = Math.max(milestoneHashes.length, builderPassport?.weftMilestonesVerified ?? 0);

  return (
    <div className={styles.container}>
      {/* ── HERO ── */}
      <section className={styles.hero}>
        <div className={styles.heroCopy}>
          <div className={styles.eyebrow}>
            <Bot size={15} />
            {overview?.pitch || "Autonomous milestone funding on 0G Chain"}
          </div>
          <h1 className={styles.title}>
            Ship work.{" "}
            <span className={styles.accent}>Get paid.</span>
            <br />
            No chasing. No politics.
          </h1>
          <p className={styles.subtitle}>
            Lock capital behind a deliverable. When you ship, autonomous verifier nodes
            collect evidence, reach consensus over encrypted P2P, and release funds
            automatically — no screenshots, no manual reviews, no trust-me-bro.
          </p>
          <div className={styles.heroActions}>
            <Link href="/builder" className={styles.primaryAction}>
              Start building <ArrowRight size={16} />
            </Link>
            <Link href="#how-it-works" className={styles.secondaryAction}>
              See how it works
            </Link>
          </div>

          {/* Live stats strip */}
          <div className={styles.statsStrip}>
          <StatCard value={3} label="Verifier nodes" />
          <div className={styles.statDivider} />
          <StatCard value={isLoading ? 0 : verifiedOutcomeCount} label="Verified outcomes" suffix={isLoading ? "…" : ""} />
          <div className={styles.statDivider} />
          <StatCard value={7} label="Hermes skills" />
          <div className={styles.statDivider} />
          <StatCard value={150} label="Prize pool" suffix="k" />
          </div>
        </div>

        <div className={styles.heroPanel}>
          <ConsensusVisual />
        </div>
      </section>

      {/* ── PAIN / SOLUTION ── */}
      <section className={styles.contrastSection} id="how-it-works">
        <div className={styles.contrastInner}>
          <div className={styles.contrastHeader}>
            <span className={styles.sectionKicker}>The old way vs. Weft</span>
            <h2 className={styles.sectionTitle}>
              Funding shouldn&apos;t feel like pulling teeth.
            </h2>
          </div>
          <div className={styles.contrastGrid}>
            {CONTRAST_ITEMS.map((item, i) => (
              <div key={i} className={styles.contrastCard}>
                <div className={styles.contrastCol}>
                  <div className={styles.contrastBadge}>Before</div>
                  <div className={styles.contrastPain}>
                    {item.pain.icon}
                    <span>{item.pain.text}</span>
                  </div>
                </div>
                <div className={styles.contrastArrow}>
                  <ArrowRight size={18} />
                </div>
                <div className={styles.contrastCol}>
                  <div className={styles.contrastBadge + " " + styles.contrastBadgeGreen}>After</div>
                  <div className={styles.contrastSolution}>
                    {item.solution.icon}
                    <span>{item.solution.text}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── SCROLL STORY ── */}
      <ScrollStory />

      {/* ── ASK WEFT (promoted above the fold) ── */}
      <section className={styles.chatPromoSection}>
        <div className={styles.chatPromoHeader}>
          <MessageCircle size={16} />
          <span>Try the Weft Agent</span>
        </div>
        <p className={styles.chatPromoSub}>
          Ask about any milestone, generate a Builder Journey story, or check verification status —
          all in natural language.
        </p>
        <AskWeft />
      </section>

      {/* ── CHRONICLE SHOWCASE ── */}
      <ChronicleShowcase />

      {/* ── LIVE MILESTONES ── */}
      <section id="live-milestones" className={styles.section} aria-label="Milestones under verification and settlement">
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
      </section>

      {/* ── BOTTOM CTA ── */}
      <section className={styles.bottomPanel}>
        <div className={styles.bottomCard}>
          <div className={styles.bottomHeader}>
            <Sparkles size={18} />
            <span>Ready to ship without friction?</span>
          </div>
          <h3>Create a milestone in under 5 minutes.</h3>
          <p>
            Define what you&apos;ll ship, set a deadline, and let verifiers handle the rest.
            When the evidence checks out, capital releases automatically.
          </p>
          <div className={styles.heroActions} style={{ marginTop: "1.5rem" }}>
            <Link href="/builder" className={styles.primaryAction}>
              Get started <ArrowRight size={16} />
            </Link>
            <Link href="/sponsor" className={styles.secondaryAction}>
              Fund a milestone
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
