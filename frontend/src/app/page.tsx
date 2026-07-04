"use client";

import Link from "next/link";
import { useState, useMemo, FormEvent } from "react";
import { ArrowRight, Bot, Sparkles, Search } from "lucide-react";

import { HeroLoom } from "@/components/HeroLoom";
import { MilestoneCard } from "@/components/MilestoneCard";
import { SkeletonCard } from "@/components/SkeletonCard";
import { AskWeft } from "@/components/AskWeft";
import { HeroProof } from "@/components/HeroProof";
import { HowItWorks } from "@/components/HowItWorks";
import { Reveal } from "@/components/Reveal";
import { useMilestones, useMilestone } from "@/hooks/useMilestones";
import { useStatusOverview, useStatusMilestone } from "@/hooks/useStatusApi";
import { useExplorerMilestones } from "@/hooks/useExplorer";
import { useBuilderPassport } from "@/hooks/useBuilderPassport";
import type { Milestone as MilestoneType, MilestoneState } from "@/lib/milestone-types";
import styles from "./page.module.css";

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
    <div className={styles.lookupWrap}>
      <form onSubmit={handleSubmit} className={styles.lookupForm}>
        <div className={styles.lookupInputWrap}>
          <Search size={16} color="var(--c-text-3)" />
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Paste a milestone hash (0x...)"
            className={styles.lookupInput}
          />
        </div>
        <button type="submit" className={styles.lookupSubmit}>
          Check
        </button>
      </form>

      <div className={styles.lookupTryRow}>
        <span>Try:</span>
        <button
          type="button"
          onClick={() => {
            setInput("0x516975afcb46acf3ea2265789ea0a64516db9f1d8e6cfb65737fc9cfafb1c16f");
            setHash("0x516975afcb46acf3ea2265789ea0a64516db9f1d8e6cfb65737fc9cfafb1c16f");
          }}
          className={styles.lookupTryBtn}
          title="Click to check the demo milestone"
        >
          0x516975...b1c16f
        </button>
      </div>

      {isLoading && (
        <div className={`${styles.lookupStatus} ${styles.lookupStatusLoading}`}>
          Loading milestone data...
        </div>
      )}

      {error && (
        <div className={`${styles.lookupStatus} ${styles.lookupStatusError}`}>
          Milestone not found. Check the hash and try again.
        </div>
      )}

      {hasResult && (
        <div className={styles.lookupResult}>
          <div className={styles.lookupResultRow}>
            <span
              className={`${styles.lookupResultIcon} ${
                isVerified ? styles.lookupResultIconOk : styles.lookupResultIconPending
              }`}
            >
              {isVerified ? "✓" : "○"}
            </span>
            <div>
              <div className={styles.lookupResultStatus}>
                {isVerified ? "Verified" : data?.finalized ? "Failed" : "Pending"}
              </div>
              <div className={styles.lookupResultHash}>
                {hash.slice(0, 10)}...{hash.slice(-6)}
              </div>
            </div>
            <div className={styles.lookupResultRight}>
              <div className={styles.lookupResultAmount}>
                {stakedEth} ETH
              </div>
              <div className={styles.lookupResultState}>
                {data?.released ? "Released" : data?.finalized ? "Refundable" : "Locked"}
              </div>
            </div>
          </div>
          <div className={styles.lookupMetaRow}>
            {data?.builder && (
              <span>
                Builder: <strong className={styles.lookupBuilderAddr}>
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
            <div className={styles.lookupVotes}>
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

export default function Home() {
  const { data: hashes, isLoading } = useMilestones();
  const { data: overview } = useStatusOverview();
  const { data: explorerMilestones } = useExplorerMilestones();
  const builderEns = overview?.demoHints?.builderEns || "weft.thisyearnofear.eth";
  const { data: builderPassport } = useBuilderPassport(builderEns);

  const milestoneHashes = useMemo(() => {
    const statusMilestones = overview?.demoHints?.milestones ?? [];
    const source = hashes && hashes.length > 0 ? hashes : statusMilestones;
    return Array.from(new Set(source));
  }, [hashes, overview?.demoHints?.milestones]);
  const verifiedOutcomeCount = Math.max(milestoneHashes.length, builderPassport?.weftMilestonesVerified ?? 0);

  // Live stats from explorer data (with hardcoded fallbacks for when API is unreachable)
  const stats = useMemo(() => {
    const ms = explorerMilestones ?? [];
    const verifiedCount = ms.filter(m => m.verified).length;
    const totalEth = ms.reduce((sum, m) => sum + Number(m.stakedEth), 0);
    const totalVotes = ms.reduce((sum, m) => sum + (m.verified ? m.verifiedVotes : 0), 0);
    const maxVerifierSlots = ms.length > 0 ? Math.max(...ms.map(m => m.verifierCount)) : 3;
    return {
      verifiedCount: verifiedCount || 1,
      ethReleased: totalEth > 0 ? totalEth.toFixed(2) : "0.01",
      verifierVotes: totalVotes || 2,
      quorum: `2/${maxVerifierSlots}`,
    };
  }, [explorerMilestones]);

  return (
    <div className={styles.container}>
      {/* ════════════════════════════════════════════════════════════════
          HERO — What is Weft?
          ════════════════════════════════════════════════════════════════ */}
      <section className={styles.hero}>
        <div className={styles.heroBackdrop} aria-hidden="true">
          <HeroLoom />
        </div>
        <div className={styles.heroCopy}>
          <div className={`${styles.eyebrow} stagger stagger-1`}>
            <Bot size={15} />
            {overview?.pitch || "Proof-of-work funding on 0G Chain"}
          </div>
          <h1 className={`${styles.title} stagger stagger-2`}>
            Prove your work.{" "}
            <span className={styles.accent}>Get paid instantly.</span>
          </h1>
          <p className={`${styles.subtitle} stagger stagger-3`}>
            Stop chasing invoices and waiting on approvals. Lock a deliverable,
            ship it, and AI verifiers release your capital onchain the moment the
            evidence checks out — then attach the win to your reputation, forever.
          </p>

          <div className={`${styles.heroActions} stagger stagger-4`}>
            <Link href="/create-milestone" className={styles.primaryAction}>
              Get your work verified <ArrowRight size={16} />
            </Link>
            <Link href="/sponsor" className={styles.secondaryLink}>
              I&apos;m here to fund work →
            </Link>
          </div>

          {/* One honest, concrete proof line — a real release, not empty counters */}
          <Link href="/project/0x516975afcb46acf3ea2265789ea0a64516db9f1d8e6cfb65737fc9cfafb1c16f" className={`${styles.proofLine} stagger stagger-5`}>
            <span className={styles.proofDot} />
            <span>
              Latest release: <strong>{stats.ethReleased} ETH</strong> paid to{" "}
              <strong>{builderEns}</strong> · verified {stats.quorum}
            </span>
            <ArrowRight size={14} />
          </Link>
        </div>

        <div className={styles.heroPanel}>
          <HeroProof />
        </div>
      </section>

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
          LIVE DEMO — hash lookup + agent chat
          ════════════════════════════════════════════════════════════════ */}
      <Reveal as="section" className={styles.demoSection} delay={100}>
        <div className={styles.sectionHeader}>
          <div>
            <span className={styles.sectionKicker}>Live demo</span>
            <h2 className={styles.sectionTitle}>See it in action</h2>
          </div>
        </div>
        <p className={`${styles.sectionText} ${styles.sectionLede}`}>
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
          LIVE MILESTONES + CTA
          ════════════════════════════════════════════════════════════════ */}
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
                        Open the profile to see the portable reputation record.
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
                    <Link href="/create-milestone" className={styles.emptyCta}>
                      Create your first milestone <ArrowRight size={16} />
                    </Link>
                  </div>
                </div>
              )}
        </div>

        {/* CTA */}
        <div className={styles.bottomCard}>
          <div className={styles.bottomHeader}>
            <Sparkles size={18} />
            <span>Ready to ship without friction?</span>
          </div>
          <h3>Two ways to use Weft</h3>
          <p>
            <strong>Sponsors</strong> lock capital behind a deliverable and get cryptographic
            proof when it&apos;s done. <strong>Builders</strong> ship work and get paid
            automatically when verifiers confirm the outcome. No sponsor yet? Verification
            is free — every verified milestone mints portable reputation to your ENS name,
            stake or no stake.
          </p>
          <div className={`${styles.heroActions} ${styles.bottomActions}`}>
            <Link href="/create-milestone" className={styles.primaryAction}>
              Create a milestone <ArrowRight size={16} />
            </Link>
            <Link href="/sponsor" className={styles.secondaryAction}>
              Fund a milestone
            </Link>
          </div>
        </div>
      </Reveal>

      {/* ── Pricing ── */}
      <div className={styles.pricingNote}>
        Protocol fee: 3% of released capital → funds the agent&apos;s autonomous operations
      </div>
    </div>
  );
}
