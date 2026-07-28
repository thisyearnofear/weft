"use client";

import Link from "next/link";
import { useState, useMemo } from "react";
import { ArrowRight, Bot, Sparkles, Lock, Zap, Eye } from "lucide-react";
import { Button } from "@/components/ui/Button";

import { HeroLoom } from "@/components/HeroLoom";
import { MilestoneCard } from "@/components/MilestoneCard";
import { SkeletonCard } from "@/components/SkeletonCard";
import { AskWeft } from "@/components/AskWeft";
import { HeroProof } from "@/components/HeroProof";
import { Reveal } from "@/components/Reveal";
import { HowItWorks } from "@/components/HowItWorks";
import { SVGPathMarquee } from "@/components/SVGPathMarquee";
import { LiveSandbox } from "@/components/LiveSandbox";
import { ScrollWeave } from "@/components/ScrollWeave";
import { Tooltip } from "@/components/ui/Tooltip";
import { ExpandableGrid } from "@/components/ExpandableGrid";
import { useMilestones, useMilestone } from "@/hooks/useMilestones";
import { useStatusOverview, useStatusMilestone } from "@/hooks/useStatusApi";
import { useExplorerMilestones } from "@/hooks/useExplorer";
import { useBuilderPassport } from "@/hooks/useBuilderPassport";
import { DEMO_RELEASE_HASH } from "@/lib/demo-milestones";
import { milestoneCardFromView, shortAddress } from "@/lib/milestone-types";
import { parseMilestoneView, statusFromFlags } from "@/lib/milestone-view";
import { track } from "@/lib/track";
import styles from "./page.module.css";

/* ── Milestone from contract → shared MilestoneView → card ── */
function MilestoneFromContract({ hash, index }: { hash: `0x${string}`; index: number }) {
  const { data, isLoading, error } = useMilestone(hash);
  const { data: statusData } = useStatusMilestone(hash, true);

  if (isLoading) return <SkeletonCard key={hash} index={index} />;
  if (error || !data || !data.builder) return null;

  const stakedEth = (Number(data.totalStaked ?? 0) / 1e18).toFixed(4);
  const builderShort = shortAddress(data.builder);
  const demo = statusData?.demo;
  const liveTags = [
    data.verified ? "Capital Released" : data.finalized ? "Refundable" : "Capital Locked",
    demo?.tracks.gensyn.bestPeerGroup ? `${demo.tracks.gensyn.bestPeerGroup.peerCount} peer signers` : "Awaiting corroboration",
    demo?.tracks.keeperhub.configured ? "Reliable execution" : "Fallback execution",
  ];

  const view =
    parseMilestoneView(
      {
        milestoneId: hash,
        rail: "evm",
        projectId: data.projectId,
        templateId: data.templateId ?? "",
        metadataHash: data.metadataHash ?? "",
        deadline: Number(data.deadline),
        totalStaked: String(data.totalStaked ?? "0"),
        status: statusFromFlags({
          finalized: Boolean(data.finalized),
          verified: Boolean(data.verified),
          released: Boolean(data.released),
          totalStaked: String(data.totalStaked ?? "0"),
        }),
        finalized: Boolean(data.finalized),
        verified: Boolean(data.verified),
        released: Boolean(data.released),
        verifierCount: data.verifierCount,
        verifiedVotes: data.verifiedVotes,
        quorum: 2,
        finalEvidenceRoot: data.finalEvidenceRoot ?? "",
        parties: {
          issuer: data.builder,
          builder: data.builder,
          funders: [],
          verifiers: [],
          observers: [],
        },
        stakes: [],
      },
      "evm",
    )!;

  const builderEns = demo?.tracks.ens.builderEns || builderShort;
  const milestone = milestoneCardFromView(view, {
    projectName: `Milestone ${hash.slice(0, 8)}…`,
    description: data.verified
      ? `Outcome verified. ${stakedEth} ETH unlocked for ${builderEns}.`
      : data.finalized
        ? `Outcome did not verify. ${stakedEth} ETH can move through the refund path.`
        : `${stakedEth} ETH is gated behind evidence collection and verifier corroboration.`,
    builderEns,
    tags: liveTags,
    totalStakedDisplay: stakedEth,
  });

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

  // Real explorer stats only — no synthetic fallbacks when the API is empty
  const stats = useMemo(() => {
    const ms = explorerMilestones ?? [];
    const verifiedCount = ms.filter(m => m.verified).length;
    const totalEth = ms.reduce((sum, m) => sum + Number(m.stakedEth), 0);
    const totalVotes = ms.reduce((sum, m) => sum + (m.verified ? m.verifiedVotes : 0), 0);
    const maxVerifierSlots = ms.length > 0 ? Math.max(...ms.map(m => m.verifierCount)) : 3;
    return {
      verifiedCount,
      ethReleased: totalEth > 0 ? totalEth.toFixed(2) : "0.00",
      verifierVotes: totalVotes,
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
          <div className={`${styles.eyebrow} stagger stagger-1`}>
            <Bot size={15} />
            {overview?.pitch || "Milestone release for program offices"}
          </div>
          <h1 className={`${styles.title} stagger stagger-2`}>
            Fund milestones.{" "}
            <span className={styles.accent}>Release on evidence.</span>
          </h1>
          <p className={`${styles.subtitle} stagger stagger-3`}>
            For program officers: when a grantee claims a milestone in your grant
            system of record, agents verify a fixed checklist and return a
            receipt for that grant record — so tranche release needn&apos;t wait
            on a six-week review queue. Private settlement is optional lab
            infrastructure.
          </p>

          <div className={`${styles.heroActions} stagger stagger-4`}>
            <Button
              href="/canton"
              variant="primary"
              onClick={() => track("hero_pilot_click")}
            >
              Request a pilot <ArrowRight size={16} />
            </Button>
            <Button
              href="/sponsor"
              variant="secondary"
              onClick={() => track("hero_sponsor_click")}
            >
              Sponsor dashboard <ArrowRight size={16} />
            </Button>
          </div>

          {/* Honest environment line — demo rails, not production money */}
          <p className={`${styles.proofLine} stagger stagger-5`} style={{ cursor: "default" }}>
            <span className={styles.proofDot} />
            <span>
              Pilot rails: <strong>Canton Devnet</strong> (private{" "}
              <Tooltip tip="Canton Blockchain Token/Currency — the devnet asset used for private settlement pilots.">
                CBTC
              </Tooltip>
              ) ·{" "}
              <strong>0G Testnet</strong> (builder wedge)
              {stats.ethReleased !== "0.00" && explorerMilestones && explorerMilestones.length > 0 ? (
                <>
                  {" "}
                  · demo release{" "}
                  <Link href={`/project/${DEMO_RELEASE_HASH}`} onClick={() => track("proofline_click")}>
                    <strong>{stats.ethReleased} ETH</strong>
                  </Link>
                </>
              ) : null}
            </span>
          </p>
        </div>

        <div className={styles.heroPanel}>
          <HeroProof />
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════════
          HOW IT WORKS — the weave story (Lock → Ship → Verify → Release)
          This is the narrative arc the page needs first. De-carded:
          steps are acts in a story, connected by the weft thread.
          ════════════════════════════════════════════════════════════════ */}
      <Reveal as="section" className={styles.section} delay={80}>
        <div className={styles.sectionHeader}>
          <div>
            <span className={styles.sectionKicker}>How it works</span>
            <h2 className={styles.sectionTitle}>The weave, in four threads</h2>
          </div>
        </div>
        <p className={`${styles.sectionText} ${styles.sectionLede}`}>
          The funder locks capital against a checkable deliverable. Agents
          collect evidence against a fixed template. At quorum, settlement
          releases or refunds — no manual approval gate.
        </p>
        <SVGPathMarquee className={styles.marqueeStrip} />
        <div className={styles.howItWorksWrap}>
          <HowItWorks />
        </div>
      </Reveal>

      {/* ════════════════════════════════════════════════════════════════
          FOR PROGRAM OFFICES — post-award beside GMS SoR.
          ════════════════════════════════════════════════════════════════ */}
      <Reveal as="section" className={styles.section} delay={85}>
        <div className={styles.sectionHeader}>
          <div>
            <span className={styles.sectionKicker}>For program offices</span>
            <h2 className={styles.sectionTitle}>
              Built to sit beside the grant system you already pay for
            </h2>
          </div>
        </div>
        <p className={`${styles.sectionText} ${styles.sectionLede}`}>
          Fluxx, Foundant, AmpliFund, Salesforce Nonprofit — when a grantee
          claims a milestone, Weft checks your checklist and returns a receipt
          for that{" "}
          <Tooltip tip="Grant Management System of Record — the platform where grant data and milestones are already tracked.">
            GMS SoR
          </Tooltip>{" "}
          record. Private settlement stays optional for pilots.
        </p>
        <div className={styles.orgGrid}>
          <div className={styles.orgCard}>
            <h3 className={styles.orgCardTitle}>A receipt for every release</h3>
            <p className={styles.orgCardBody}>
              Each release carries its evidence hash, verifier quorum, and
              settlement reference — visible to parties that need to know.
              When someone asks &ldquo;why did this get paid?&rdquo;, the answer is
              an audit trail, not a meeting.
            </p>
          </div>
          <div className={styles.orgCard}>
            <h3 className={styles.orgCardTitle}>Checkable deliverables only</h3>
            <p className={styles.orgCardBody}>
              Agents verify against a fixed template — institutional checklist
              on Canton, or deployment + usage on the public EVM wedge. Scope
              ambiguity and subjective quality are out of band; Weft settles
              what can be evidenced.
            </p>
          </div>
          <div className={styles.orgCard}>
            <h3 className={styles.orgCardTitle}>3% of released capital</h3>
            <p className={styles.orgCardBody}>
              Success fee aligned with unlocked capital — funds autonomous
              verification ops. Compare that to recurring spend on manual
              tranche review and escrow middlemen for the same programs.
            </p>
          </div>
        </div>
        <div className={styles.orgActions}>
          <Link
            href="/canton"
            className={styles.emptyCta}
            onClick={() => track("org_section_canton_click")}
          >
                Open program ops <ArrowRight size={16} />
          </Link>
          <Link
            href="/sponsor"
            className={styles.orgSecondaryLink}
            onClick={() => track("org_section_sponsor_click")}
          >
            Public program dashboard →
          </Link>
        </div>
      </Reveal>

      {/* ════════════════════════════════════════════════════════════════
          LIVE SANDBOX — tabbed public EVM + confidential FHE demos
          Consolidates the two FHE cards and the InteractiveDemo into one
          opt-in surface, reducing vertical scroll fatigue.
          ════════════════════════════════════════════════════════════════ */}
      <Reveal as="section" className={styles.section} delay={90}>
        <div className={styles.sectionHeader}>
          <div>
            <span className={styles.sectionKicker}>Live sandbox</span>
            <h2 className={styles.sectionTitle}>Try the verification rails</h2>
          </div>
          <Link href="/confidential" className={styles.sectionAction} onClick={() => track("live_sandbox_vault_click")}>
            Full vault tour <ArrowRight size={14} />
          </Link>
        </div>
        <p className={`${styles.sectionText} ${styles.sectionLede}`}>
          Public EVM milestone on 0G Testnet, or sealed-ballot{" "}
          <Tooltip tip="Fully Homomorphic Encryption — computation on encrypted data. Weft uses Zama FHEVM on Sepolia so votes stay private until the final result.">
            FHE
          </Tooltip>{" "}
          demos on Sepolia. Pick a rail to step through evidence, consensus, and release
          — or decrypt the confidential result yourself.
        </p>
        <LiveSandbox />
        <button
          type="button"
          className={styles.demoChatToggle}
          onClick={() => setShowChat((v) => !v)}
          aria-expanded={showChat}
        >
          {showChat ? "Hide the agent chat" : "Prefer to ask? Talk to the agent that verified it →"}
        </button>
        {showChat && <AskWeft />}
      </Reveal>

      {/* ════════════════════════════════════════════════════════════════
          PLATFORM WEDGES — SigNoz observability + Zama confidential
          ════════════════════════════════════════════════════════════════ */}
      <Reveal as="section" className={styles.section} delay={95}>
        <div className={styles.wedgeGrid}>
          <Link href="/observability" className={styles.wedgeCard} onClick={() => track("wedge_observability_click")}>
            <div className={styles.wedgeIcon}><Eye size={20} /></div>
            <span className={styles.wedgeKicker}>SigNoz · Agent observatory</span>
            <h3 className={styles.wedgeTitle}>Trace every autonomous step</h3>
            <p className={styles.wedgeBody}>
              Live span counts, winning trace filter, dashboard preview, and alert states —
              the audit lens program officers read before capital moves.
            </p>
            <span className={styles.wedgeLink}>Open observatory <ArrowRight size={14} /></span>
          </Link>
          <Link href="/confidential" className={styles.wedgeCard} onClick={() => track("wedge_confidential_click")}>
            <div className={styles.wedgeIcon}><Lock size={20} /></div>
            <span className={styles.wedgeKicker}>Zama FHE · Confidential vault</span>
            <h3 className={styles.wedgeTitle}>Seal votes, reveal only the verdict</h3>
            <p className={styles.wedgeBody}>
              Two live Sepolia demos — boolean quorum and confidence-weighted consensus —
              with in-browser relayer decrypt and sealed-ballot visuals.
            </p>
            <span className={styles.wedgeLink}>Open confidential vault <ArrowRight size={14} /></span>
          </Link>
        </div>
      </Reveal>

      {/* ════════════════════════════════════════════════════════════════
          OKX.AI — Agent Service Provider
          ════════════════════════════════════════════════════════════════ */}
      <Reveal as="section" className={styles.section} delay={100}>
        <div className={styles.sectionHeader}>
          <div>
            <span className={styles.sectionKicker}>OKX.AI Agent Service Provider</span>
            <h2 className={styles.sectionTitle}>Hire Weft as an agent</h2>
          </div>
        </div>
        <p className={`${styles.sectionText} ${styles.sectionLede}`}>
          Weft is joining the OKX.AI agent marketplace. Other agents will be
          able to hire it for deterministic milestone verification — via
          pay-per-call <Tooltip tip="Model Context Protocol — a standard for agents to expose tools and data.">MCP</Tooltip> tools or as a neutral judge inside agent-to-agent
          escrow.
        </p>
        <div className={styles.demoGrid}>
          <Link
            href="/api/docs"
            className={styles.demoCard}
            onClick={() => track("okx_mcp_click")}
          >
            <div className={styles.demoIcon}><Zap size={20} /></div>
            <span className={styles.demoKicker}>Agent-to-MCP</span>
            <h3 className={styles.demoTitle}>Pay-per-call tools</h3>
            <p className={styles.demoBody}>
              Standardized Model Context Protocol integration. Agents query
              verify, narrate, attest, and chronicle over x402 on X Layer.
            </p>
            <span className={styles.demoLink}>
              View API docs <ArrowRight size={14} />
            </span>
          </Link>
          <a
            href="https://github.com/thisyearnofear/weft/blob/main/docs/OKX-AI-SUBMISSION.md"
            target="_blank"
            rel="noopener noreferrer"
            className={styles.demoCard}
            onClick={() => track("okx_a2a_click")}
          >
            <div className={styles.demoIcon}><Bot size={20} /></div>
            <span className={styles.demoKicker}>Agent-to-Agent</span>
            <h3 className={styles.demoTitle}>Escrow verification</h3>
            <p className={styles.demoBody}>
              Neutral judge for A2A escrow. Weft collects evidence, reaches
              multi-node consensus over AXL, and triggers release or refund.
            </p>
            <span className={styles.demoLink}>
              Read integration plan <ArrowRight size={14} />
            </span>
          </a>
        </div>
        <div className={styles.okxActions}>
          <Button
            href="https://github.com/thisyearnofear/weft/blob/main/docs/OKX-AI-SUBMISSION.md"
            variant="primary"
            external
            onClick={() => track("okx_ai_plan_click")}
          >
            Read OKX.AI plan <ArrowRight size={16} />
          </Button>
          <span className={styles.comingSoonBadge}>Listing pending</span>
          <Button
            href="https://okx.ai"
            variant="secondary"
            external
            onClick={() => track("okx_ai_visit_click")}
          >
            Visit OKX.AI <ArrowRight size={16} />
          </Button>
        </div>
      </Reveal>

      {/* ════════════════════════════════════════════════════════════════
          LIVE MILESTONES + CTA
          ════════════════════════════════════════════════════════════════ */}
      <Reveal as="section" className={styles.section} delay={100}>
        <div className={styles.sectionHeader}>
          <div>
            <span className={styles.sectionKicker}>0G Testnet milestones</span>
            <h2 className={styles.sectionTitle}>Public demo milestones</h2>
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
                No public demo milestones loaded yet. Start on program ops
                (GMS ingest + receipt), or use the builder wedge on 0G Testnet
                for deployment + usage verification.
              </p>
              <Link href="/canton" className={styles.emptyCta}>
                Open program ops <ArrowRight size={16} />
              </Link>
            </div>
          </div>
        )}
      </Reveal>

      {/* ── Pricing ── */}
      <div className={styles.pricingNote}>
        Protocol fee: 3% of released capital → funds the agent&apos;s autonomous operations
      </div>
    </div>
  );
}
