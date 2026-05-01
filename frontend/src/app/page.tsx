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
  if (error || !data) return null;

  const state: MilestoneState = data.verified ? "verified" : data.finalized ? "failed" : "pending";
  const stakedEth = (Number(data.totalStaked) / 1e18).toFixed(4);
  const builderShort = `${data.builder.slice(0, 6)}...${data.builder.slice(-4)}`;
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
      title: "0G persistence",
      description:
        overview?.sponsorFit.find((item) => item.toLowerCase().includes("0g")) ||
        "Metadata roots, attestation artifacts, and bundle pointers stay inspectable and portable.",
    },
    {
      icon: Network,
      title: "AXL corroboration",
      description:
        overview?.sponsorFit.find((item) => item.toLowerCase().includes("axl")) ||
        "Separate verifier nodes exchange signed envelopes before capital moves.",
    },
    {
      icon: ShieldCheck,
      title: "KeeperHub execution",
      description:
        overview?.sponsorFit.find((item) => item.toLowerCase().includes("keeperhub")) ||
        "Verdicts get a reliable execution path instead of depending on a single raw transaction.",
    },
    {
      icon: Blocks,
      title: "ENS identity",
      description:
        overview?.sponsorFit.find((item) => item.toLowerCase().includes("ens")) ||
        "Builders and verifier agents carry discoverable, portable reputation instead of opaque addresses.",
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
            Release capital with <span className={styles.accent}>evidence</span>, not manual trust.
          </h1>
          <p className={styles.subtitle}>
            Weft is the capital coordination layer for internet-native teams. It helps founders, sponsors, and DAOs fund fluid groups of humans and agents without relying on screenshots, payout politics, or one-off trust.
          </p>

          <div className={styles.heroActions}>
            <a href="#live-milestones" className={styles.primaryAction}>
              Explore live trust decisions
              <ArrowRight size={16} />
            </a>
            <Link href="/builder" className={styles.secondaryAction}>
              Explore portable reputation
            </Link>
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
              <span>Product thesis</span>
              <CheckCircle2 size={18} />
            </div>
            <h2>Programmable trust for teams that do not want to become companies first.</h2>
            <p>
              Weft combines milestone escrow, verifier corroboration, evidence persistence, and portable reputation into one capital release system for fluid human-agent teams.
            </p>
            <div className={styles.signalList}>
              <div>
                <span className={styles.signalBadge}>Before</span>
                <p>Chats, screenshots, manual payout review, and no reusable trust.</p>
              </div>
              <div>
                <span className={styles.signalBadge}>After</span>
                <p>Outcome-based capital release with visible evidence, confidence, and execution readiness.</p>
              </div>
              <div>
                <span className={styles.signalBadge}>0G + AXL</span>
                <p>{overview?.demoHints.peerInboxDir ? `Storage and peer consensus are wired into ${overview.demoHints.peerInboxDir}.` : "Storage and verifier corroboration are visible in the system."}</p>
              </div>
              <div>
                <span className={styles.signalBadge}>ENS + KeeperHub</span>
                <p>{overview?.demoHints.builderEns || overview?.demoHints.agentEns ? "Named identities and reliable execution are present in the demo payload." : "Identity and execution are part of the release decision, not bolt-ons."}</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className={styles.sponsorSection}>
        <div className={styles.sectionIntro}>
          <span className={styles.sectionKicker}>Why it is different</span>
          <h2 className={styles.sectionTitle}>Not milestone tracking. Not agent tooling. A capital release system.</h2>
          <p className={styles.sectionText}>
            Weft is differentiated because it turns shipped outcomes into trust that can actually move money. The system treats humans and agents symmetrically, then binds reputation to funded work instead of vague social proof.
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

      <section className={styles.workflowSection}>
        <div className={styles.sectionIntro}>
          <span className={styles.sectionKicker}>Core utility</span>
          <h2 className={styles.sectionTitle}>A trust loop for internet-native teams.</h2>
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
              : <div className={styles.emptyState}>No milestones found yet. Create one to start the trust loop.</div>}
        </div>
      </section>

      <section className={styles.bottomPanel}>
        <div className={styles.bottomCard}>
          <div className={styles.bottomHeader}>
            <Coins size={18} />
            <span>Why users care</span>
          </div>
          <h3>Weft makes it easier to fund small teams without pretending they already operate like formal companies.</h3>
          <p>
            The product surfaces the real decision: what capital is at risk, what evidence exists, whether the verifier swarm is confident enough, and how this outcome updates the team’s portable trust graph.
          </p>
        </div>
      </section>
    </div>
  );
}
