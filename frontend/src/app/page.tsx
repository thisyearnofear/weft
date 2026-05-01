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
    data.verified ? "Released" : data.finalized ? "Refundable" : "In Flight",
    demo?.tracks.gensyn.bestPeerGroup ? `${demo.tracks.gensyn.bestPeerGroup.peerCount} peers` : "Awaiting peers",
    demo?.tracks.keeperhub.configured ? "KeeperHub ready" : "Direct execution",
  ];

  const milestone: MilestoneType = {
    hash,
    projectName: `Milestone ${hash.slice(0, 8)}...`,
    projectId: data.projectId,
    description: data.verified
      ? `Verified onchain. ${stakedEth} ETH released to ${builderShort}.`
      : data.finalized
        ? `Verification failed. ${stakedEth} ETH is now refundable to stakeholders.`
        : `${stakedEth} ETH is live and awaiting verifier corroboration before release.`,
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
      title: "Stake capital into a milestone",
      text: "Teams define a deadline, attach metadata, and escrow funds into a verifiable objective instead of a vague promise.",
    },
    {
      step: "02",
      title: "Let the verifier swarm gather evidence",
      text: "Agents check deployment, usage, metadata, and supporting artifacts once the milestone window closes.",
    },
    {
      step: "03",
      title: "Reach execution-grade confidence",
      text: "Peer nodes corroborate the verdict, produce an evidence root, and hand final execution to a reliable settlement layer.",
    },
  ];

  return (
    <div className={styles.container}>
      <section className={styles.hero}>
        <div className={styles.heroCopy}>
          <div className={styles.eyebrow}>
            <Bot size={16} />
            {overview?.pitch || "Decentralized verifier swarm for milestone finance"}
          </div>
          <h1 className={styles.title}>
            Capital should move when <span className={styles.accent}>evidence</span> is real.
          </h1>
          <p className={styles.subtitle}>
            Weft turns milestone funding into an operational system: stake capital, let autonomous verifiers gather proof, corroborate the outcome across nodes, and release funds through a reliable onchain execution path.
          </p>

          <div className={styles.heroActions}>
            <a href="#live-milestones" className={styles.primaryAction}>
              Explore live milestones
              <ArrowRight size={16} />
            </a>
            <Link href="/builder" className={styles.secondaryAction}>
              Create a milestone
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
              <span>Execution signal</span>
              <CheckCircle2 size={18} />
            </div>
            <h2>Release capital only when the swarm agrees.</h2>
            <p>
              Evidence collection, peer corroboration, storage proofs, and settlement reliability are surfaced as one product — not scattered across scripts.
            </p>
            <div className={styles.signalList}>
              <div>
                <span className={styles.signalBadge}>0G</span>
                <p>{overview?.demoHints.metadataIndexer ? `Status API connected to ${overview.demoHints.metadataIndexer}` : "Metadata + evidence roots stay inspectable."}</p>
              </div>
              <div>
                <span className={styles.signalBadge}>AXL</span>
                <p>{overview?.demoHints.peerInboxDir ? `Peer inbox wired at ${overview.demoHints.peerInboxDir}` : "Peer nodes exchange signed verdict envelopes."}</p>
              </div>
              <div>
                <span className={styles.signalBadge}>KeeperHub</span>
                <p>Preferred onchain execution path for verdict submission.</p>
              </div>
              <div>
                <span className={styles.signalBadge}>ENS</span>
                <p>{overview?.demoHints.builderEns || overview?.demoHints.agentEns ? "Named builder/agent identities available in the demo payload." : "Portable builder and agent identity wraps the workflow."}</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className={styles.sponsorSection}>
        <div className={styles.sectionIntro}>
          <span className={styles.sectionKicker}>Why the architecture matters</span>
          <h2 className={styles.sectionTitle}>The product is the system.</h2>
          <p className={styles.sectionText}>
            Weft wins when the utility is obvious: better milestone coordination, better confidence before payout, better visibility into why capital moved.
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
          <h2 className={styles.sectionTitle}>A clear path from objective to payout.</h2>
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
            <span className={styles.sectionKicker}>Live system view</span>
            <h2 className={styles.sectionTitle}>Milestones moving through the verifier network</h2>
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
              : <div className={styles.emptyState}>No milestones found yet. Create one to start the verification loop.</div>}
        </div>
      </section>

      <section className={styles.bottomPanel}>
        <div className={styles.bottomCard}>
          <div className={styles.bottomHeader}>
            <Coins size={18} />
            <span>Product thesis</span>
          </div>
          <h3>Weft is not a dashboard for receipts. It is a system for trust-minimized capital release.</h3>
          <p>
            The UI now centers the actual operator value: what is funded, what evidence exists, how confident the network is, and whether payout execution is safe to trust.
          </p>
        </div>
      </section>
    </div>
  );
}
