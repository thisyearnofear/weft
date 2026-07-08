"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { ArrowLeft, Search, Lock, Zap, ArrowRight } from "lucide-react";
import { useExplorerMilestones } from "@/hooks/useExplorer";
import { CountUp } from "@/components/CountUp";
import { track } from "@/lib/track";
import styles from "./page.module.css";

type StatusFilter = "all" | "verified" | "pending" | "failed";

function formatDate(ts: number): string {
  if (!ts) return "—";
  return new Date(ts * 1000).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function shortHash(hash: string): string {
  if (!hash || hash.length < 12) return hash;
  return `${hash.slice(0, 10)}...${hash.slice(-6)}`;
}

function shortAddr(addr: string): string {
  if (!addr || addr.length < 12) return addr;
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

export default function ExplorerPage() {
  const { data: milestones, isLoading, error } = useExplorerMilestones();
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [searchQuery, setSearchQuery] = useState("");

  const filtered = useMemo(() => {
    if (!milestones) return [];
    return milestones.filter((m) => {
      if (statusFilter !== "all" && m.state !== statusFilter) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const matches =
          m.milestoneHash.toLowerCase().includes(q) ||
          m.builder.toLowerCase().includes(q) ||
          (m.builderEns?.toLowerCase().includes(q) ?? false) ||
          m.projectId.toLowerCase().includes(q);
        if (!matches) return false;
      }
      return true;
    });
  }, [milestones, statusFilter, searchQuery]);

  const stats = useMemo(() => {
    if (!milestones) return { total: 0, verified: 0, pending: 0, failed: 0, totalStaked: 0 };
    return milestones.reduce(
      (acc, m) => {
        acc.total++;
        if (m.state === "verified") acc.verified++;
        if (m.state === "pending") acc.pending++;
        if (m.state === "failed") acc.failed++;
        acc.totalStaked += Number(m.stakedEth);
        return acc;
      },
      { total: 0, verified: 0, pending: 0, failed: 0, totalStaked: 0 }
    );
  }, [milestones]);

  const filterBtns: { key: StatusFilter; label: string; count: number }[] = [
    { key: "all", label: "All", count: stats.total },
    { key: "verified", label: "Verified", count: stats.verified },
    { key: "pending", label: "Pending", count: stats.pending },
    { key: "failed", label: "Failed", count: stats.failed },
  ];

  return (
    <div className={styles.container}>
      <div className={styles.inner}>
        <Link href="/" className={styles.backLink}>
          <ArrowLeft size={14} /> Back to Weft
        </Link>

        <div className={styles.header}>
          <div className={styles.eyebrow}>
            <Search size={15} /> Verification Explorer
          </div>
          <h1 className={styles.title}>Onchain evidence, publicly auditable.</h1>
          <p className={styles.subtitle}>
            Browse public milestones on 0G Chain, and try the sealed-ballot demos on
            Sepolia — verifier votes encrypted with Zama FHE, tallied homomorphically,
            decrypted by you.
          </p>
        </div>

        {/* Sealed-ballot demos on Sepolia */}
        <div className={styles.fheSection}>
          <div className={styles.fheSectionHeader}>
            <span className={styles.fheSectionKicker}>Sealed-ballot demos · Sepolia (Zama FHE)</span>
          </div>
          <div className={styles.fheDemoGrid}>
            <Link
              href="/project/0xa22c4a43e1ded5d10cb6b46b801c0385a5107a013ae263d3fb04c807a99af40d?confidential=1"
              className={styles.fheDemoCard}
              onClick={() => track("explorer_fhe_v1_click")}
            >
              <div className={styles.fheDemoIcon}><Lock size={18} /></div>
              <div className={styles.fheDemoCopy}>
                <span className={styles.fheDemoKicker}>v1 · FHE.add</span>
                <h3 className={styles.fheDemoTitle}>Sealed-ballot quorum</h3>
                <p className={styles.fheDemoBody}>
                  Boolean ballots, encrypted quorum check. No vote ever decrypted.
                </p>
              </div>
              <ArrowRight size={16} className={styles.fheDemoArrow} />
            </Link>
            <Link
              href="/project/0xbd5c85db97cd5a8f30779da9311651e549f702b6ce72ebd03dcb816d3b071722?weighted=1"
              className={styles.fheDemoCard}
              onClick={() => track("explorer_fhe_v2_click")}
            >
              <div className={styles.fheDemoIcon}><Zap size={18} /></div>
              <div className={styles.fheDemoCopy}>
                <span className={styles.fheDemoKicker}>v2 · FHE.mul</span>
                <h3 className={styles.fheDemoTitle}>Confidence-weighted votes</h3>
                <p className={styles.fheDemoBody}>
                  Ballot × confidence, multiplied on ciphertext. Weighted consensus.
                </p>
              </div>
              <ArrowRight size={16} className={styles.fheDemoArrow} />
            </Link>
          </div>
        </div>

        {/* Public milestones on 0G */}
        <div className={styles.sectionLabel}>
          <span className={styles.sectionLabelText}>Public milestones · 0G Chain</span>
        </div>

        {/* Stats bar */}
        <div className={styles.statsBar}>
          <div className={`${styles.stat} stagger stagger-1 lift`}>
            <span className={styles.statValue}><CountUp value={stats.total} /></span>
            <span className={styles.statLabel}>Total Milestones</span>
          </div>
          <div className={`${styles.stat} stagger stagger-2 lift`}>
            <span className={styles.statValue}><CountUp value={stats.verified} /></span>
            <span className={styles.statLabel}>Verified</span>
          </div>
          <div className={`${styles.stat} stagger stagger-3 lift`}>
            <span className={styles.statValue}><CountUp value={stats.totalStaked} decimals={4} suffix=" ETH" /></span>
            <span className={styles.statLabel}>ETH Staked</span>
          </div>
          <div className={`${styles.stat} stagger stagger-4 lift`}>
            <span className={styles.statValue}><CountUp value={stats.pending} /></span>
            <span className={styles.statLabel}>Pending</span>
          </div>
        </div>

        {/* Filters */}
        <div className={styles.filters}>
          {filterBtns.map((btn) => (
            <button
              key={btn.key}
              className={`${styles.filterBtn} ${statusFilter === btn.key ? styles.filterBtnActive : ""}`}
              onClick={() => setStatusFilter(btn.key)}
              aria-pressed={statusFilter === btn.key}
              aria-label={`Filter by ${btn.label}`}
            >
              {btn.label} ({btn.count})
            </button>
          ))}
          <div className={styles.searchWrap}>
            <input
              type="text"
              className={styles.searchInput}
              placeholder="Search by hash, builder, or ENS..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        {/* Table */}
        <div className={styles.tableWrap}>
          {isLoading && <div className={styles.loadingRow}>Loading milestones...</div>}

          {error && (
            <div className={styles.errorState}>
              Failed to load milestones: {error instanceof Error ? error.message : "Unknown error"}
            </div>
          )}

          {!isLoading && !error && filtered.length === 0 && (
            <div className={styles.emptyState}>
              <h3>No milestones found</h3>
              <p>
                {milestones && milestones.length > 0
                  ? "Try adjusting your filters or search query."
                  : "No milestones have been recorded yet."}
              </p>
            </div>
          )}

          {!isLoading && !error && filtered.length > 0 && (
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Milestone</th>
                  <th>Status</th>
                  <th>Builder</th>
                  <th>Stake</th>
                  <th>Votes</th>
                  <th>Deadline</th>
                  <th>Evidence</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((m, i) => (
                  <tr key={m.milestoneHash} className={`${styles.tableRow} stagger stagger-${Math.min(i + 1, 6)}`}>
                    <td>
                      <Link
                        href={`/project/${m.milestoneHash}`}
                        className={styles.hashCell}
                        title={m.milestoneHash}
                      >
                        {shortHash(m.milestoneHash)}
                      </Link>
                    </td>
                    <td>
                      <span
                        className={`${styles.statusBadge} scale-in ${
                          m.state === "verified"
                            ? styles.statusVerified
                            : m.state === "pending"
                              ? styles.statusPending
                              : styles.statusFailed
                        }`}
                      >
                        {m.state === "verified" ? "✓" : m.state === "pending" ? "○" : "✗"}{" "}
                        {m.statusLabel}
                      </span>
                    </td>
                    <td>
                      {m.builderEns ? (
                        <Link
                          href={`/builder/${m.builderEns}`}
                          className={styles.hashCell}
                          title={m.builder}
                        >
                          {m.builderEns}
                        </Link>
                      ) : (
                        <span className={styles.builderCell} title={m.builder}>
                          {shortAddr(m.builder)}
                        </span>
                      )}
                    </td>
                    <td className={styles.stakeCell}>{m.stakedEth} ETH</td>
                    <td className={styles.voteCell}>
                      {m.verifiedVotes}/{m.verifierCount}
                    </td>
                    <td className={styles.dateCell}>{formatDate(m.deadline)}</td>
                    <td>
                      {m.finalEvidenceRoot &&
                      m.finalEvidenceRoot !==
                        "0x0000000000000000000000000000000000000000000000000000000000000000" ? (
                        <Link
                          href={`/project/${m.milestoneHash}`}
                          className={styles.hashCell}
                          title={m.finalEvidenceRoot}
                        >
                          {shortHash(m.finalEvidenceRoot)}
                        </Link>
                      ) : (
                        <span className={styles.dateCell}>—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
