"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { ArrowLeft, Search } from "lucide-react";
import { useExplorerMilestones } from "@/hooks/useExplorer";
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
          <h1 className={styles.title}>Every milestone. Publicly auditable.</h1>
          <p className={styles.subtitle}>
            Browse every milestone Weft has verified. Filter by status, search by builder or hash,
            and inspect the onchain evidence for each verdict.
          </p>
        </div>

        {/* Stats bar */}
        <div className={styles.statsBar}>
          <div className={styles.stat}>
            <span className={styles.statValue}>{stats.total}</span>
            <span className={styles.statLabel}>Total Milestones</span>
          </div>
          <div className={styles.stat}>
            <span className={styles.statValue}>{stats.verified}</span>
            <span className={styles.statLabel}>Verified</span>
          </div>
          <div className={styles.stat}>
            <span className={styles.statValue}>{stats.totalStaked.toFixed(4)}</span>
            <span className={styles.statLabel}>ETH Staked</span>
          </div>
          <div className={styles.stat}>
            <span className={styles.statValue}>{stats.pending}</span>
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
          <div style={{ flex: 1, minWidth: 200, maxWidth: 360, marginLeft: "auto" }}>
            <input
              type="text"
              placeholder="Search by hash, builder, or ENS..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: "100%",
                padding: "0.5rem 0.85rem",
                border: "1px solid rgba(25, 37, 56, 0.12)",
                borderRadius: 8,
                fontSize: "0.85rem",
                outline: "none",
                background: "#fff",
                color: "#162033",
              }}
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
                {filtered.map((m) => (
                  <tr key={m.milestoneHash} className={styles.tableRow}>
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
                        className={`${styles.statusBadge} ${
                          m.state === "verified"
                            ? styles.statusVerified
                            : m.state === "pending"
                              ? styles.statusPending
                              : styles.statusFailed
                        }`}
                      >
                        {m.state === "verified" ? "✓" : m.state === "pending" ? "⏳" : "✗"}{" "}
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
