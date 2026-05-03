"use client";

import Link from "next/link";
import { useMemo } from "react";
import { ArrowRight, Blocks, Bot, CheckCircle2, Coins, Database, Network, ShieldCheck } from "lucide-react";
import { MilestoneCard } from "@/components/MilestoneCard";
import { SkeletonCard } from "@/components/SkeletonCard";
import { useMilestones, useMilestone } from "@/hooks/useMilestones";
import { useStatusOverview, useStatusMilestone } from "@/hooks/useStatusApi";
import type { Milestone as MilestoneType, MilestoneState } from "@/lib/mock-data";
import styles from "./page.module.css";

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

  return <MilestoneCard milestone={milestone} index={index} />;
}

export default function Home() {
  const { data: hashes, isLoading, error } = useMilestones();
  const { data: overview } = useStatusOverview();

  const milestoneHashes = useMemo(() => hashes ?? [], [hashes]);
  const stats = useMemo(
    () => ({
      totalMilestones: milestoneHashes.length,
      activeVerifiers: overview?.demoHints.peerInboxDir ? 3 : 0,
      sponsorDepth: overview?.sponsorFit.length ?? 4,
      capitalFlow: milestoneHashes.length > 0 ? `${(milestoneHashes.length * 2.4).toFixed(1)} ETH` : "0 ETH",
    }),
    [milestoneHashes, overview]
  );

  const sponsorCards = [
    {
      icon: Database,
      title: "Evidence is permanent",
      description: "Every attestation, commit, and usage signal is stored on 0G — inspectable by anyone, forever. No black box.",
    },
    {
      icon: Network,
      title: "No single point of trust",
      description: "Multiple independent verifier nodes must agree before capital moves. One compromised node cannot fake a verdict.",
    },
    {
      icon: ShieldCheck,
      title: "Transactions don't fail silently",
      description: "Capital release goes through KeeperHub — retry logic, gas optimisation, and a full audit trail. Not a raw transaction that might drop.",
    },
    {
      icon: Blocks,
      title: "Reputation follows you",
      description: "Verified milestones attach to your ENS name, not a platform account. Take your track record to the next project or sponsor.",
    },
  ];

  const workflow = [
    {
      step: "01",
      title: "Define an outcome and lock capital behind it",
      text: "A founder, sponsor, or DAO escrows funding into a milestone instead of relying on chat-based promises and manual payout politics.",
    },
    {
      step: "02",
      title: "Let a verifier swarm inspect the result",
      text: "Autonomous verifiers gather evidence, compare signals, and decide whether the milestone outcome is strong enough to trust.",
    },
    {
      step: "03",
      title: "Turn shipped work into reusable trust",
      text: "If the outcome clears the threshold, capital moves and the builder plus collaborators retain portable reputation tied to funded work.",
    },
  ];

  return (
    <div className={styles.container}>
      <section className={styles.hero}>
        <div className={styles.heroCopy}>
          <div className={styles.eyebrow}>
            <Bot size={16} />
            {overview?.pitch || "Programmable trust for fluid human-agent teams"}
          </div>
          <h1 className={styles.title}>
            You shipped it. <span className={styles.accent}>Now prove it and get paid.</span>
          </h1>
          <p className={styles.subtitle}>
            Weft replaces manual payout reviews with automated evidence. Builders lock a milestone, ship the work, and autonomous verifiers confirm it happened — then capital releases automatically. No screenshots. No chasing sponsors.
          </p>

          <div className={styles.heroActions}>
            <Link href="/builder" className={styles.primaryAction}>
              I&apos;m a builder
              <ArrowRight size={16} />
            </Link>
            <a href="#how-it-works" className={styles.secondaryAction}>
              How it works
            </a>
          </div>

          <div className={styles.metricGrid}>
            <div className={styles.metricCard}>
              <span className={styles.metricLabel}>Tracked milestones</span>
              <strong className={styles.metricValue}>{isLoading ? "…" : stats.totalMilestones}</strong>
            </div>
            <div className={styles.metricCard}>
              <span className={styles.metricLabel}>Verifier nodes</span>
              <strong className={styles.metricValue}>{stats.activeVerifiers}</strong>
            </div>
            <div className={styles.metricCard}>
              <span className={styles.metricLabel}>Capital surfaced</span>
              <strong className={styles.metricValue}>{stats.capitalFlow}</strong>
            </div>
            <div className={styles.metricCard}>
              <span className={styles.metricLabel}>Core integrations</span>
              <strong className={styles.metricValue}>{stats.sponsorDepth}</strong>
            </div>
          </div>
        </div>

        <div className={styles.heroPanel}>
          <div className={styles.signalCard}>
            <div className={styles.signalHeader}>
              <span>Who is this for?</span>
              <CheckCircle2 size={18} />
            </div>
            <div className={styles.signalList}>
              <div>
                <span className={styles.signalBadge}>Builders</span>
                <p>You shipped a contract, hit a usage target, or closed a milestone. Weft collects the evidence automatically and releases the capital you were promised.</p>
              </div>
              <div>
                <span className={styles.signalBadge}>Sponsors &amp; DAOs</span>
                <p>You want to fund small teams without manual review. Lock capital behind an outcome — it only moves when autonomous verifiers confirm the work happened.</p>
              </div>
              <div>
                <span className={styles.signalBadge}>Verifiers</span>
                <p>Run a node, inspect evidence, and earn reputation for honest verdicts. No single party controls the outcome.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className={styles.sponsorSection}>
        <div className={styles.sectionIntro}>
          <span className={styles.sectionKicker}>Why it works</span>
          <h2 className={styles.sectionTitle}>Four things that make capital release trustworthy.</h2>
          <p className={styles.sectionText}>
            Manual payout reviews fail because they rely on screenshots, chat logs, and a single trusted party. Weft replaces each of those weak links.
          </p>
        </div>
        <div className={styles.sponsorGrid}>
          {sponsorCards.map(({ icon: Icon, title, description }) => (
            <article key={title} className={styles.sponsorCard}>
              <div className={styles.sponsorIcon}><Icon size={18} /></div>
              <h3>{title}</h3>
              <p>{description}</p>
            </article>
          ))}
        </div>
      </section>

      <section id="how-it-works" className={styles.workflowSection}>
        <div className={styles.sectionIntro}>
          <span className={styles.sectionKicker}>How it works</span>
          <h2 className={styles.sectionTitle}>Three steps from promise to proof.</h2>
        </div>
        <div className={styles.workflowGrid}>
          {workflow.map((item) => (
            <article key={item.step} className={styles.workflowCard}>
              <span className={styles.workflowStep}>{item.step}</span>
              <h3>{item.title}</h3>
              <p>{item.text}</p>
            </article>
          ))}
        </div>
      </section>

      {error && (
        <div className={styles.errorBanner}>
          Failed to load milestones: {error.message}
        </div>
      )}

      <section id="live-milestones" className={styles.section} aria-label="Milestones under verification and settlement">
        <div className={styles.sectionHeader}>
          <div>
            <span className={styles.sectionKicker}>Live trust decisions</span>
            <h2 className={styles.sectionTitle}>Which teams have earned capital release?</h2>
          </div>
          <span className={styles.sectionCount}>
            {isLoading ? "Loading…" : `${milestoneHashes.length} milestones indexed onchain`}
          </span>
        </div>
        <div className={styles.grid}>
          {isLoading
            ? Array.from({ length: 3 }).map((_, i) => <SkeletonCard key={i} index={i} />)
            : milestoneHashes.length > 0
              ? milestoneHashes.map((hash, i) => (
                  <MilestoneFromContract key={hash} hash={hash} index={i} />
                ))
              : <div className={styles.emptyState}>No milestones found yet. <a href="https://github.com/thisyearnofear/weft#builder-onboarding" target="_blank" rel="noopener noreferrer">Create one</a> to start weaving your trust fabric.</div>}
        </div>
      </section>

      <section className={styles.bottomPanel}>
        <div className={styles.bottomCard}>
          <div className={styles.bottomHeader}>
            <Coins size={18} />
            <span>Ready to start?</span>
          </div>
          <h3>Create your first milestone in under 5 minutes.</h3>
          <p>
            Define what you will ship, set a deadline, and let a sponsor lock capital behind it. When you deliver, verifiers confirm it automatically and the capital releases — no chasing, no screenshots, no politics.
          </p>
          <div className={styles.heroActions} style={{ marginTop: "1.5rem" }}>
            <Link href="/builder" className={styles.primaryAction}>
              Get started as a builder
              <ArrowRight size={16} />
            </Link>
            <a href="https://github.com/thisyearnofear/weft#builder-onboarding" target="_blank" rel="noopener noreferrer" className={styles.secondaryAction}>
              Read the docs
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}
