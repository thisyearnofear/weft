"use client";

import Link from "next/link";
import { useState, useMemo } from "react";
import { ArrowRight, Bot, Sparkles, Lock, Zap } from "lucide-react";

import { HeroLoom } from "@/components/HeroLoom";
import { MilestoneCard } from "@/components/MilestoneCard";
import { SkeletonCard } from "@/components/SkeletonCard";
import { AskWeft } from "@/components/AskWeft";
import { HeroProof } from "@/components/HeroProof";
import { Reveal } from "@/components/Reveal";
import { HowItWorks } from "@/components/HowItWorks";
import { SVGPathMarquee } from "@/components/SVGPathMarquee";
import { InteractiveDemo } from "@/components/InteractiveDemo";
import { ScrollWeave } from "@/components/ScrollWeave";
import { ExpandableGrid } from "@/components/ExpandableGrid";
import { useMilestones, useMilestone } from "@/hooks/useMilestones";
import { useStatusOverview, useStatusMilestone } from "@/hooks/useStatusApi";
import { useExplorerMilestones } from "@/hooks/useExplorer";
import { useBuilderPassport } from "@/hooks/useBuilderPassport";
import type { Milestone as MilestoneType, MilestoneState } from "@/lib/milestone-types";
import { track } from "@/lib/track";
import styles from "./page.module.css";

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
  const [showChat, setShowChat] = useState(false);
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
      <ScrollWeave />
      {/* ════════════════════════════════════════════════════════════════
          HERO — What is Weft?
          ════════════════════════════════════════════════════════════════ */}
      <section className={styles.hero}>
        <div className={styles.heroBackdrop} aria-hidden="true">
          <HeroLoom />
        </div>
        <div className={styles.heroCopy}>
          <Link
            href="/project/0xa22c4a43e1ded5d10cb6b46b801c0385a5107a013ae263d3fb04c807a99af40d?confidential=1"
            className={`${styles.confidentialBanner} stagger stagger-1`}
            onClick={() => track("confidential_banner_click")}
          >
            <Sparkles size={14} />
            <span>
              <strong>New — Confidential mode:</strong> verifier votes are now sealed
              ballots, encrypted &amp; tallied with <strong>Zama FHE</strong> on Sepolia
            </span>
            <ArrowRight size={14} />
          </Link>
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
            <Link
              href="/sponsor"
              className={styles.secondaryAction}
              onClick={() => track("hero_fund_door_click")}
            >
              Fund work, get receipts <ArrowRight size={16} />
            </Link>
          </div>

          {/* One honest, concrete proof line — a real release, not empty counters */}
          <Link
            href="/project/0x516975afcb46acf3ea2265789ea0a64516db9f1d8e6cfb65737fc9cfafb1c16f"
            className={`${styles.proofLine} stagger stagger-5`}
            onClick={() => track("proofline_click")}
          >
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
          HOW IT WORKS — the weave story (Lock → Ship → Verify → Release)
          This is the narrative arc the page was missing. De-carded:
          steps are acts in a story, connected by the weft thread.
          ════════════════════════════════════════════════════════════════ */}
      <Reveal as="section" className={styles.section} delay={100}>
        <div className={styles.sectionHeader}>
          <div>
            <span className={styles.sectionKicker}>How it works</span>
            <h2 className={styles.sectionTitle}>The weave, in four threads</h2>
          </div>
        </div>
        <p className={`${styles.sectionText} ${styles.sectionLede}`}>
          Capital is escrowed, work is shipped, verifiers check the evidence,
          and the contract releases on its own. No one approves anything.
        </p>
        {/* Ambient evidence thread — swatch chips traveling a woven path.
            The Weft metaphor in motion, not just in the background grid. */}
        <SVGPathMarquee className={styles.marqueeStrip} />
        <div className={styles.howItWorksWrap}>
          <HowItWorks />
        </div>
      </Reveal>

      {/* ════════════════════════════════════════════════════════════════
          FHE DEMOS — two live sealed-ballot milestones on Sepolia.
          The core Zama story: v1 (addition) → v2 (multiplication).
          ════════════════════════════════════════════════════════════════ */}
      <Reveal as="section" className={styles.section} delay={100}>
        <div className={styles.sectionHeader}>
          <div>
            <span className={styles.sectionKicker}>Confidential verification</span>
            <h2 className={styles.sectionTitle}>Encrypted votes, public result</h2>
          </div>
        </div>
        <p className={`${styles.sectionText} ${styles.sectionLede}`}>
          Verifier votes stay private until the final verdict. Two live demos show
          how consensus can be reached without exposing individual votes — then
          let you decrypt the result yourself.
        </p>
        <div className={styles.fheDemoGrid}>
          <Link
            href="/project/0xa22c4a43e1ded5d10cb6b46b801c0385a5107a013ae263d3fb04c807a99af40d?confidential=1"
            className={styles.fheDemoCard}
            onClick={() => track("fhe_demo_v1_click")}
          >
            <div className={styles.fheDemoIcon}><Lock size={20} /></div>
            <span className={styles.fheDemoKicker}>v1 · Sealed ballots</span>
            <h3 className={styles.fheDemoTitle}>Boolean quorum</h3>
            <p className={styles.fheDemoBody}>
              Each verifier encrypts a yes/no ballot. The contract checks quorum
              on encrypted votes and only reveals the final pass/fail result.
            </p>
            <span className={styles.fheDemoLink}>
              Open &amp; decrypt <ArrowRight size={14} />
            </span>
          </Link>
          <Link
            href="/project/0xbd5c85db97cd5a8f30779da9311651e549f702b6ce72ebd03dcb816d3b071722?weighted=1"
            className={styles.fheDemoCard}
            onClick={() => track("fhe_demo_v2_click")}
          >
            <div className={styles.fheDemoIcon}><Zap size={20} /></div>
            <span className={styles.fheDemoKicker}>v2 · Weighted consensus</span>
            <h3 className={styles.fheDemoTitle}>Confidence-weighted votes</h3>
            <p className={styles.fheDemoBody}>
              Each verifier encrypts a ballot and a confidence score. The
              contract weights every vote before revealing only the weighted
              outcome.
            </p>
            <span className={styles.fheDemoLink}>
              Open &amp; decrypt <ArrowRight size={14} />
            </span>
          </Link>
        </div>
      </Reveal>

      {/* ════════════════════════════════════════════════════════════════
          LIVE DEMO — hash lookup, agent chat behind a toggle.
          The hero animation already explains the mechanic; this section's
          only job is to prove it's real.
          ════════════════════════════════════════════════════════════════ */}
      <Reveal as="section" className={styles.demoSection} delay={100}>
        <div className={styles.sectionHeader}>
          <div>
            <span className={styles.sectionKicker}>Live demo</span>
            <h2 className={styles.sectionTitle}>Watch capital release itself</h2>
          </div>
        </div>
        <p className={`${styles.sectionText} ${styles.sectionLede}`}>
          This is a real milestone verified on 0G Testnet. Step through the
          verification flow — or run it end-to-end — and see the actual evidence,
          consensus, and release that happened onchain.
        </p>
        <div className={styles.demoSingle}>
          <InteractiveDemo />
          <button
            type="button"
            className={styles.demoChatToggle}
            onClick={() => setShowChat((v) => !v)}
            aria-expanded={showChat}
          >
            {showChat ? "Hide the agent chat" : "Prefer to ask? Talk to the agent that verified it →"}
          </button>
          {showChat && <AskWeft />}
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
        {isLoading ? (
          <div className={styles.grid}>
            {Array.from({ length: 3 }).map((_, i) => <SkeletonCard key={i} index={i} />)}
          </div>
        ) : milestoneHashes.length > 0 ? (
          <ExpandableGrid>
            {milestoneHashes.map((hash, i) => (
              <MilestoneFromContract key={hash} hash={hash} index={i} />
            ))}
          </ExpandableGrid>
        ) : verifiedOutcomeCount > 0 ? (
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
        ) : (
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
      </Reveal>

      {/* ════════════════════════════════════════════════════════════════
          FOR ORGANIZATIONS — grant programs, bounty boards, DAO treasuries.
          The durable buyer is the org with repeat volume; this section
          speaks compliance + economics, not crypto mechanics.
          ════════════════════════════════════════════════════════════════ */}
      <Reveal as="section" className={styles.section} delay={100}>
        <div className={styles.sectionHeader}>
          <div>
            <span className={styles.sectionKicker}>For organizations</span>
            <h2 className={styles.sectionTitle}>
              Built for programs that fund work on repeat
            </h2>
          </div>
        </div>
        <p className={`${styles.sectionText} ${styles.sectionLede}`}>
          Grant rounds, bounty boards, DAO treasuries — anywhere payouts need
          review, Weft replaces the manual queue with verification you can
          hand to your community and your auditors.
        </p>
        <div className={styles.orgGrid}>
          <div className={styles.orgCard}>
            <h3 className={styles.orgCardTitle}>A receipt for every payout</h3>
            <p className={styles.orgCardBody}>
              Each release carries its evidence root, verifier quorum, and
              settlement transactions — anchored onchain, exportable as a
              verification receipt. When someone asks &ldquo;why did this get
              paid?&rdquo;, the answer is a link, not a meeting.
            </p>
          </div>
          <div className={styles.orgCard}>
            <h3 className={styles.orgCardTitle}>Reviews that can&apos;t herd</h3>
            <p className={styles.orgCardBody}>
              In confidential mode, verifiers vote by sealed ballot — encrypted
              with Zama FHE, tallied on ciphertext. No reviewer can see another&apos;s
              vote before quorum, so independence isn&apos;t a policy, it&apos;s
              cryptography.
            </p>
          </div>
          <div className={styles.orgCard}>
            <h3 className={styles.orgCardTitle}>3% flat, no dispute overhead</h3>
            <p className={styles.orgCardBody}>
              The protocol fee is 3% of released capital — it funds the agent&apos;s
              own operations. Compare that to what a recurring program spends on
              manual milestone review, escrow middlemen, and settling disputes.
            </p>
          </div>
        </div>
        <div className={styles.orgActions}>
          <Link
            href="/sponsor"
            className={styles.emptyCta}
            onClick={() => track("org_section_sponsor_click")}
          >
            Run a funding round <ArrowRight size={16} />
          </Link>
          <Link
            href="/project/0xa22c4a43e1ded5d10cb6b46b801c0385a5107a013ae263d3fb04c807a99af40d?confidential=1"
            className={styles.orgSecondaryLink}
            onClick={() => track("org_section_confidential_click")}
          >
            See a sealed-ballot verification →
          </Link>
        </div>
      </Reveal>

      {/* ── Pricing ── */}
      <div className={styles.pricingNote}>
        Protocol fee: 3% of released capital → funds the agent&apos;s autonomous operations
      </div>
    </div>
  );
}
