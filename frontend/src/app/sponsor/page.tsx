"use client";

import Link from "next/link";
import { ArrowLeft, ArrowRight, Coins, Plus, Bot, Lock } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { RefreshButton } from "@/components/RefreshButton";
import { KPISkeleton, ListSkeleton } from "@/components/KPISkeleton";
import { CountUp } from "@/components/CountUp";
import { ErrorState } from "@/components/ErrorState";
import { OfflineBadge } from "@/components/OfflineBadge";
import styles from "./page.module.css";

interface SponsorMilestone {
  milestoneHash: string;
  projectId: string;
  builder: string;
  builderEns: string | null;
  stakedEth: string;
  finalized: boolean;
  verified: boolean;
  released: boolean;
  verifierCount: number;
  verifiedVotes: number;
  finalEvidenceRoot: string;
  createdAt: number;
  deadline: number;
  capitalStatus: "locked" | "released" | "refundable";
  timeToVerdict: number | null;
}

interface SponsorData {
  ok: boolean;
  milestones: SponsorMilestone[];
  summary: {
    totalMilestones: number;
    totalLocked: string;
    totalReleased: string;
    totalRefundable: string;
    verifiedCount: number;
    releasedCount: number;
  };
}

async function fetchSponsor(): Promise<SponsorData> {
  const res = await fetch("/api/sponsor", { cache: "no-store" });
  if (!res.ok) throw new Error(`Sponsor fetch failed: ${res.status}`);
  return res.json();
}

function useSponsor() {
  return useQuery({ queryKey: ["sponsor"], queryFn: fetchSponsor, staleTime: 15_000 });
}

function shortHash(hash: string): string {
  if (!hash || hash.length < 12) return hash;
  return `${hash.slice(0, 10)}...${hash.slice(-6)}`;
}

function formatDate(ts: number): string {
  if (!ts) return "—";
  return new Date(ts * 1000).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

function formatDuration(seconds: number): string {
  if (!seconds || seconds <= 0) return "—";
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  if (days > 0) return `${days}d ${hours}h`;
  return `${hours}h`;
}

export default function SponsorDashboardPage() {
  const { data, isLoading, error, refetch, isFetching } = useSponsor();
  const milestones = data?.milestones ?? [];
  const summary = data?.summary;

  const totalLocked = Number(summary?.totalLocked ?? 0);
  const totalReleased = Number(summary?.totalReleased ?? 0);
  const totalRefundable = Number(summary?.totalRefundable ?? 0);
  const totalCapital = totalLocked + totalReleased + totalRefundable;

  return (
    <div className={styles.container}>
      <div className={styles.inner}>
        <Link href="/" className={styles.backLink}>
          <ArrowLeft size={14} /> Back to Weft
        </Link>

        <div className={styles.header}>
          <div className={styles.eyebrow}>
            <Coins size={15} /> Program Dashboard
          </div>
          <h1 className={styles.title}>Run your funding program on autopilot.</h1>
          <p className={styles.subtitle}>
            Grant rounds, bounty boards, milestone-based contracts — lock ETH
            behind each deliverable and AI agents verify the work onchain.
            Capital releases automatically when 2 of 3 agents agree, and every
            payout carries a verification receipt your community and auditors
            can check themselves. No review queue, no chasing, no disputes.
          </p>
          <div style={{ marginTop: "1.25rem", display: "flex", gap: "0.75rem", alignItems: "center", flexWrap: "wrap" }}>
            <Link href="/create-milestone" className={styles.primaryCta}>
              <Plus size={16} /> Fund a milestone
            </Link>
            <RefreshButton onClick={() => refetch()} isFetching={isFetching} />
          </div>

          {/* Agent status — the agent is present */}
          <div className={styles.agentStatus}>
            <span className={styles.agentAvatar}><Bot size={16} /></span>
            <span className={styles.agentStatusText}>
              {summary
                ? `${summary.totalMilestones} milestones in your program. ${summary.verifiedCount} verified, ${summary.releasedCount} released. I verify every deadline autonomously — fund as many as you like.`
                : "Connecting to the verification network..."}
            </span>
          </div>
        </div>

        {/* Sealed-ballot callout — the FHE value prop for sponsors */}
        <Link href="/create-milestone" className={styles.sealedCallout}>
          <div className={styles.sealedCalloutIcon}><Lock size={18} /></div>
          <div className={styles.sealedCalloutBody}>
            <span className={styles.sealedCalloutKicker}>Confidential mode · Zama FHE on Sepolia</span>
            <p className={styles.sealedCalloutText}>
              Fund milestones with <strong>sealed-ballot verification</strong> — verifier
              agents encrypt their votes, the contract tallies homomorphically, and no
              individual vote is ever visible. Eliminates verifier herding: late voters
              can&apos;t copy early ones. Only the final result is decryptable, and only
              after all ballots are cast.
            </p>
          </div>
          <ArrowRight size={16} className={styles.sealedCalloutArrow} />
        </Link>

        {isLoading && (
          <>
            <KPISkeleton count={4} />
            <ListSkeleton rows={4} />
          </>
        )}
        {error && !data && (
          <ErrorState message={`Failed to load: ${error instanceof Error ? error.message : "Unknown error"}`} onRetry={() => refetch()} isRetrying={isFetching} />
        )}

        {error && data && <OfflineBadge />}

        {!isLoading && data && (
          <>
            {/* Capital flow — hero element */}
            {totalCapital > 0 && (
              <div className={styles.capitalHero}>
                <div className={styles.capitalHeroHeader}>
                  <h2 className={styles.capitalHeroTitle}>Capital Flow</h2>
                  <span className={styles.capitalHeroTotal}>{totalCapital.toFixed(4)} ETH total</span>
                </div>
                <p className={styles.capitalHeroSummary}>
                  {totalReleased > 0 && `${Math.round((totalReleased / totalCapital) * 100)}% released to builders`}
                  {totalReleased > 0 && totalLocked > 0 && ", "}
                  {totalLocked > 0 && `${Math.round((totalLocked / totalCapital) * 100)}% locked awaiting verification`}
                  {totalRefundable > 0 && `, ${Math.round((totalRefundable / totalCapital) * 100)}% refundable`}
                </p>
                <div className={styles.flowBar}>
                  {totalReleased > 0 && (
                    <div className={styles.flowReleased} style={{ width: `${(totalReleased / totalCapital) * 100}%` }} />
                  )}
                  {totalLocked > 0 && (
                    <div className={styles.flowLocked} style={{ width: `${(totalLocked / totalCapital) * 100}%` }} />
                  )}
                  {totalRefundable > 0 && (
                    <div className={styles.flowRefundable} style={{ width: `${(totalRefundable / totalCapital) * 100}%` }} />
                  )}
                </div>
                <div className={styles.flowLegend}>
                  <div className={styles.legendItem}>
                    <span className={styles.legendDot} style={{ background: "var(--c-verified)" }} />
                    Released ({totalReleased.toFixed(4)} ETH)
                  </div>
                  <div className={styles.legendItem}>
                    <span className={styles.legendDot} style={{ background: "var(--c-pending)" }} />
                    Locked ({totalLocked.toFixed(4)} ETH)
                  </div>
                  {totalRefundable > 0 && (
                    <div className={styles.legendItem}>
                      <span className={styles.legendDot} style={{ background: "var(--c-failed)" }} />
                      Refundable ({totalRefundable.toFixed(4)} ETH)
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className={styles.kpiGrid}>
              <div className={`${styles.kpiCard} stagger stagger-1 lift`}>
                <div className={styles.kpiLabel}>Total Funded</div>
                <div className={styles.kpiValue}><CountUp value={totalCapital} decimals={4} suffix=" ETH" /></div>
                <div className={styles.kpiSub}>{summary?.totalMilestones ?? 0} milestones</div>
              </div>
              <div className={`${styles.kpiCard} stagger stagger-2 lift`}>
                <div className={styles.kpiLabel}>Capital Released</div>
                <div className={`${styles.kpiValue} ${styles.kpiPositive}`}><CountUp value={totalReleased} decimals={4} suffix=" ETH" /></div>
                <div className={styles.kpiSub}>{summary?.releasedCount ?? 0} released</div>
              </div>
              <div className={`${styles.kpiCard} stagger stagger-3 lift`}>
                <div className={styles.kpiLabel}>Capital Locked</div>
                <div className={`${styles.kpiValue} ${styles.kpiNegative}`}><CountUp value={totalLocked} decimals={4} suffix=" ETH" /></div>
                <div className={styles.kpiSub}>Awaiting verification</div>
              </div>
              <div className={`${styles.kpiCard} stagger stagger-4 lift`}>
                <div className={styles.kpiLabel}>Verified Rate</div>
                <div className={styles.kpiValue}>
                  <CountUp value={summary?.totalMilestones ? Math.round((summary.verifiedCount / summary.totalMilestones) * 100) : 0} suffix="%" />
                </div>
                <div className={styles.kpiSub}>{summary?.verifiedCount ?? 0} of {summary?.totalMilestones ?? 0}</div>
              </div>
            </div>

            {/* Funded milestones */}
            <div className={styles.section}>
              <h2 className={styles.sectionTitle}>
                Program Milestones
                <span className={styles.sectionBadge}>{milestones.length}</span>
              </h2>
              {milestones.length === 0 ? (
                <div className={styles.emptyState}>No milestones funded yet.</div>
              ) : (
                milestones.map((m, i) => (
                  <div key={m.milestoneHash} className={`${styles.milestoneCard} stagger stagger-${Math.min(i + 1, 6)} lift`}>
                    <div className={styles.milestoneHeader}>
                      <Link href={`/project/${m.milestoneHash}`} className={styles.milestoneHash}>
                        {shortHash(m.milestoneHash)}
                      </Link>
                      <span className={`${styles.capitalBadge} ${
                        m.capitalStatus === "released" ? styles.capitalReleased :
                        m.capitalStatus === "locked" ? styles.capitalLocked : styles.capitalRefundable
                      }`}>
                        {m.capitalStatus === "released" ? "✓ Released" :
                         m.capitalStatus === "locked" ? "○ Locked" : "✗ Refundable"}
                      </span>
                    </div>
                    <div className={styles.milestoneMeta}>
                      <div className={styles.metaItem}>
                        <span className={styles.metaLabel}>Builder</span>
                        <span className={styles.metaValue}>{m.builderEns ?? shortHash(m.builder)}</span>
                      </div>
                      <div className={styles.metaItem}>
                        <span className={styles.metaLabel}>Stake</span>
                        <span className={styles.metaValue}>{m.stakedEth} ETH</span>
                      </div>
                      <div className={styles.metaItem}>
                        <span className={styles.metaLabel}>Verifiers</span>
                        <span className={styles.metaValue}>{m.verifiedVotes}/{m.verifierCount} agreed</span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
