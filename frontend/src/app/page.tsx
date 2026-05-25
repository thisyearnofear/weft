"use client";

import Link from "next/link";
import { useState, useMemo, FormEvent } from "react";
import { ArrowRight, Bot, ShieldCheck, Sparkles, MessageCircle, Zap, Clock, XCircle, CheckCircle, BarChart3, Search } from "lucide-react";

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
    <div style={{
      width: "100%",
      maxWidth: "480px",
    }}>
      <form onSubmit={handleSubmit} style={{
        display: "flex",
        gap: "8px",
        background: "#fff",
        border: "1px solid #d0d5dd",
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
          <Search size={16} color="#98a2b3" />
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
              color: "#162033",
              padding: "10px 0",
            }}
          />
        </div>
        <button type="submit" style={{
          padding: "10px 20px",
          background: "#315fd6",
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
        color: "#98a2b3",
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
            background: "#f2f4f7",
            border: "1px solid #e4e7ec",
            borderRadius: "6px",
            color: "#315fd6",
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
        <div style={{ padding: "12px 16px", fontSize: "14px", color: "#6c788a" }}>
          Loading milestone data...
        </div>
      )}

      {error && (
        <div style={{ padding: "12px 16px", fontSize: "14px", color: "#d92d20" }}>
          Milestone not found. Check the hash and try again.
        </div>
      )}

      {hasResult && (
        <div style={{
          marginTop: "10px",
          background: "#fff",
          border: "1px solid #eaecf0",
          borderRadius: "10px",
          padding: "16px",
          display: "flex",
          flexDirection: "column",
          gap: "12px",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <span style={{
              fontSize: "20px",
            }}>
              {isVerified ? "✅" : "⏳"}
            </span>
            <div>
              <div style={{ fontWeight: 700, fontSize: "15px", color: "#162033" }}>
                {isVerified ? "Verified" : data?.finalized ? "Failed" : "Pending"}
              </div>
              <div style={{ fontSize: "13px", color: "#6c788a", fontFamily: "monospace" }}>
                {hash.slice(0, 10)}...{hash.slice(-6)}
              </div>
            </div>
            <div style={{ marginLeft: "auto", textAlign: "right" }}>
              <div style={{ fontWeight: 700, fontSize: "15px", color: "#162033" }}>
                {stakedEth} ETH
              </div>
              <div style={{ fontSize: "13px", color: "#6c788a" }}>
                {data?.released ? "Released" : data?.finalized ? "Refundable" : "Locked"}
              </div>
            </div>
          </div>
          <div style={{
            display: "flex",
            gap: "16px",
            fontSize: "13px",
            color: "#6c788a",
            flexWrap: "wrap",
          }}>
            {data?.builder && (
              <span>
                Builder: <strong style={{ color: "#315fd6" }}>
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
              color: "#06974a",
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

/* ── Pain/Solution comparison items ── */
const CONTRAST_ITEMS = [
  {
    pain: { icon: <Clock size={14} />, text: "Manual reviews that take weeks" },
    solution: { icon: <Zap size={14} />, text: "Autonomous verification, no manual review" },
  },
  {
    pain: { icon: <XCircle size={14} />, text: "Chasing sponsors for payment" },
    solution: { icon: <CheckCircle size={14} />, text: "Verified proof opens the release path" },
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

  const milestoneHashes = useMemo(() => {
    const statusMilestones = overview?.demoHints?.milestones ?? [];
    const source = hashes && hashes.length > 0 ? hashes : statusMilestones;
    return Array.from(new Set(source));
  }, [hashes, overview?.demoHints?.milestones]);
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
            Weft turns milestone funding into a verifier workflow: escrow on 0G,
            deterministic evidence collection, peer corroboration, and a portable
            ENS trust record for the builder.
          </p>

          {/* ── Milestone Lookup ── */}
          <MilestoneLookup />

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
          <StatCard value={3} label="Verifier paths" />
          <div className={styles.statDivider} />
          <StatCard value={isLoading ? 0 : verifiedOutcomeCount} label="Verified outcomes" suffix={isLoading ? "…" : ""} />
          <div className={styles.statDivider} />
          <StatCard value={7} label="Hermes skills" />
          <div className={styles.statDivider} />
          <StatCard value={"2"} label="Supported chains" />
          </div>
        </div>

        <div className={styles.heroPanel}>
          <ConsensusVisual />
        </div>
      </section>

      {/* ── PROOF STRIP ── */}
      <section className={styles.contrastSection} id="how-it-works">
        <div className={styles.contrastInner}>
          <div className={styles.contrastHeader}>
            <span className={styles.sectionKicker}>Judge-ready proof path</span>
            <h2 className={styles.sectionTitle}>What the demo proves</h2>
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

      {/* ── ASK WEFT ── */}
      <section className={styles.chatPromoSection}>
        <div className={styles.chatPromoHeader}>
          <MessageCircle size={16} />
          <span>Ask Weft</span>
        </div>
        <p className={styles.chatPromoSub}>
          Query milestone status, trigger a Builder Journey, or inspect the same status API
          that powers the frontend.
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
          <h3>Create a milestone in minutes.</h3>
          <p>
            Define what you&apos;ll ship, set a deadline, and let verifiers handle the rest.
            When the evidence checks out, the verified release path opens.
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
