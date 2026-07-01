"use client";

import Link from "next/link";
import { ArrowLeft, Coins } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
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
  const { data, isLoading, error } = useSponsor();
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
            <Coins size={15} /> Sponsor Dashboard
          </div>
          <h1 className={styles.title}>Your capital, verified.</h1>
          <p className={styles.subtitle}>
            Track every milestone you&apos;ve funded — capital at stake, verification status,
            and the exact moment your funds moved. Full transparency, no manual follow-up.
          </p>
        </div>

        {isLoading && <div className={styles.loadingState}>Loading sponsor data...</div>}
        {error && (
          <div className={styles.errorState}>
            Failed to load: {error instanceof Error ? error.message : "Unknown error"}
          </div>
        )}

        {!isLoading && !error && (
          <>
            <div className={styles.kpiGrid}>
              <div className={styles.kpiCard}>
                <div className={styles.kpiLabel}>Total Funded</div>
                <div className={styles.kpiValue}>{totalCapital.toFixed(4)} ETH</div>
                <div className={styles.kpiSub}>{summary?.totalMilestones ?? 0} milestones</div>
              </div>
              <div className={styles.kpiCard}>
                <div className={styles.kpiLabel}>Capital Released</div>
                <div className={`${styles.kpiValue} ${styles.kpiPositive}`}>{totalReleased.toFixed(4)} ETH</div>
                <div className={styles.kpiSub}>{summary?.releasedCount ?? 0} released</div>
              </div>
              <div className={styles.kpiCard}>
                <div className={styles.kpiLabel}>Capital Locked</div>
                <div className={`${styles.kpiValue} ${styles.kpiNegative}`}>{totalLocked.toFixed(4)} ETH</div>
                <div className={styles.kpiSub}>Awaiting verification</div>
              </div>
              <div className={styles.kpiCard}>
                <div className={styles.kpiLabel}>Verified Rate</div>
                <div className={styles.kpiValue}>
                  {summary?.totalMilestones ? Math.round((summary.verifiedCount / summary.totalMilestones) * 100) : 0}%
                </div>
                <div className={styles.kpiSub}>{summary?.verifiedCount ?? 0} of {summary?.totalMilestones ?? 0}</div>
              </div>
            </div>

            {/* Capital flow bar */}
            {totalCapital > 0 && (
              <div className={styles.section}>
                <h2 className={styles.sectionTitle}>Capital Flow</h2>
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
                    <span className={styles.legendDot} style={{ background: "#22c55e" }} />
                    Released ({totalReleased.toFixed(4)} ETH)
                  </div>
                  <div className={styles.legendItem}>
                    <span className={styles.legendDot} style={{ background: "#f59e0b" }} />
                    Locked ({totalLocked.toFixed(4)} ETH)
                  </div>
                  {totalRefundable > 0 && (
                    <div className={styles.legendItem}>
                      <span className={styles.legendDot} style={{ background: "#ef4444" }} />
                      Refundable ({totalRefundable.toFixed(4)} ETH)
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Funded milestones */}
            <div className={styles.section}>
              <h2 className={styles.sectionTitle}>
                Funded Milestones
                <span className={styles.sectionBadge}>{milestones.length}</span>
              </h2>
              {milestones.length === 0 ? (
                <div className={styles.emptyState}>No milestones funded yet.</div>
              ) : (
                milestones.map((m) => (
                  <div key={m.milestoneHash} className={styles.milestoneCard}>
                    <div className={styles.milestoneHeader}>
                      <Link href={`/project/${m.milestoneHash}`} className={styles.milestoneHash}>
                        {shortHash(m.milestoneHash)}
                      </Link>
                      <span className={`${styles.capitalBadge} ${
                        m.capitalStatus === "released" ? styles.capitalReleased :
                        m.capitalStatus === "locked" ? styles.capitalLocked : styles.capitalRefundable
                      }`}>
                        {m.capitalStatus === "released" ? "✓ Released" :
                         m.capitalStatus === "locked" ? "⏳ Locked" : "✗ Refundable"}
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
                        <span className={styles.metaLabel}>Verifier Votes</span>
                        <span className={styles.metaValue}>{m.verifiedVotes}/{m.verifierCount}</span>
                      </div>
                      <div className={styles.metaItem}>
                        <span className={styles.metaLabel}>Created</span>
                        <span className={styles.metaValue}>{formatDate(m.createdAt)}</span>
                      </div>
                      <div className={styles.metaItem}>
                        <span className={styles.metaLabel}>Deadline</span>
                        <span className={styles.metaValue}>{formatDate(m.deadline)}</span>
                      </div>
                      <div className={styles.metaItem}>
                        <span className={styles.metaLabel}>Time to Verdict</span>
                        <span className={styles.metaValue}>{formatDuration(m.timeToVerdict ?? 0)}</span>
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
