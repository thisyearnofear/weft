"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { ArrowLeft, Search, Lock, Zap, ArrowRight } from "lucide-react";
import { useExplorerMilestones } from "@/hooks/useExplorer";
import { useConfidentialMilestone } from "@/hooks/useConfidentialMilestone";
import { useWeightedConfidentialMilestone } from "@/hooks/useWeightedConfidentialMilestone";
import { CountUp } from "@/components/CountUp";
import { Reveal } from "@/components/Reveal";
import { DemoBridge } from "@/components/ui/DemoBridge";
import { AgentHelper } from "@/components/AgentHelper";
import { track } from "@/lib/track";
import { DEMO_FHE_V1_HASH, DEMO_FHE_V2_HASH } from "@/lib/demo-milestones";
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

/// Unified row type — merges 0G public milestones and Sepolia FHE milestones
/// into a single shape for the table.
interface UnifiedRow {
  milestoneHash: string;
  state: "verified" | "pending" | "failed";
  statusLabel: string;
  builder: string;
  builderEns: string | null;
  stakedEth: string;
  verifierCount: number;
  verifiedVotes: number;
  deadline: number;
  finalEvidenceRoot: string;
  chain: "0g" | "sepolia-fhe-v1" | "sepolia-fhe-v2";
  href: string;
}

export default function ExplorerPage() {
  const { data: milestones, isLoading, error } = useExplorerMilestones();
  const { data: v1Data } = useConfidentialMilestone(DEMO_FHE_V1_HASH);
  const { data: v2Data } = useWeightedConfidentialMilestone(DEMO_FHE_V2_HASH);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Merge 0G public milestones + FHE milestones into unified rows
  const allRows: UnifiedRow[] = useMemo(() => {
    const rows: UnifiedRow[] = [];

    // 0G public milestones
    if (milestones) {
      for (const m of milestones) {
        rows.push({
          milestoneHash: m.milestoneHash,
          state: m.state,
          statusLabel: m.statusLabel,
          builder: m.builder,
          builderEns: m.builderEns,
          stakedEth: m.stakedEth,
          verifierCount: m.verifierCount,
          verifiedVotes: m.verifiedVotes,
          deadline: m.deadline,
          finalEvidenceRoot: m.finalEvidenceRoot,
          chain: "0g",
          href: `/project/${m.milestoneHash}`,
        });
      }
    }

    // v1 FHE milestone (FHE.add)
    if (v1Data) {
      rows.push({
        milestoneHash: DEMO_FHE_V1_HASH,
        state: v1Data.resultVerified ? "verified" : v1Data.finalized ? "failed" : "pending",
        statusLabel: v1Data.resultVerified ? "Sealed ✓ Verified" : v1Data.finalized ? "Sealed ✗" : "Sealed ○",
        builder: v1Data.builder,
        builderEns: "weft.thisyearnofear.eth",
        stakedEth: (Number(v1Data.totalStaked) / 1e18).toFixed(4),
        verifierCount: v1Data.verifierCount,
        verifiedVotes: v1Data.finalized ? v1Data.verifierCount : 0, // sealed — count is known but votes aren't
        deadline: Number(v1Data.deadline),
        finalEvidenceRoot: v1Data.finalEvidenceRoot,
        chain: "sepolia-fhe-v1",
        href: `/project/${DEMO_FHE_V1_HASH}?confidential=1`,
      });
    }

    // v2 FHE milestone (FHE.mul)
    if (v2Data) {
      rows.push({
        milestoneHash: DEMO_FHE_V2_HASH,
        state: v2Data.resultVerified ? "verified" : v2Data.finalized ? "failed" : "pending",
        statusLabel: v2Data.resultVerified ? "Weighted ✓ Verified" : v2Data.finalized ? "Weighted ✗" : "Weighted ○",
        builder: v2Data.builder,
        builderEns: "weft.thisyearnofear.eth",
        stakedEth: (Number(v2Data.totalStaked) / 1e18).toFixed(4),
        verifierCount: v2Data.verifierCount,
        verifiedVotes: v2Data.finalized ? v2Data.verifierCount : 0,
        deadline: Number(v2Data.deadline),
        finalEvidenceRoot: v2Data.finalEvidenceRoot,
        chain: "sepolia-fhe-v2",
        href: `/project/${DEMO_FHE_V2_HASH}?weighted=1`,
      });
    }

    return rows;
  }, [milestones, v1Data, v2Data]);

  const filtered = useMemo(() => {
    return allRows.filter((m) => {
      if (statusFilter !== "all" && m.state !== statusFilter) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const matches =
          m.milestoneHash.toLowerCase().includes(q) ||
          m.builder.toLowerCase().includes(q) ||
          (m.builderEns?.toLowerCase().includes(q) ?? false);
        if (!matches) return false;
      }
      return true;
    });
  }, [allRows, statusFilter, searchQuery]);

  const stats = useMemo(() => {
    return allRows.reduce(
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
  }, [allRows]);

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
            <Search size={15} /> Explorer
          </div>
          <h1 className={styles.title}>Browse every milestone and its evidence.</h1>
          <p className={styles.subtitle}>
            Every milestone created on Weft is public — the builder, the stake,
            the verifier votes, and the evidence root. Filter by status, search
            by builder or hash, and open any milestone to see the full trust
            decision. Confidential milestones on Sepolia show encrypted votes.
          </p>
        </div>

        {/* Sealed-ballot demos on Sepolia */}
        <Reveal as="div" delay={0}>
        <div className={styles.fheSection} id="fhe-demos">
          <div className={styles.fheSectionHeader}>
            <span className={styles.fheSectionKicker}>Confidential · Sepolia (Zama FHE)</span>
          </div>
          <div className={styles.fheDemoGrid}>
            <Link
              href={`/project/${DEMO_FHE_V1_HASH}?confidential=1`}
              className={styles.fheDemoCard}
              onClick={() => track("explorer_fhe_v1_click")}
            >
              <div className={styles.fheDemoIcon}><Lock size={18} /></div>
              <div className={styles.fheDemoCopy}>
                <span className={styles.fheDemoKicker}>v1 · Sealed ballots</span>
                <h3 className={styles.fheDemoTitle}>Boolean quorum</h3>
                <p className={styles.fheDemoBody}>
                  Each verifier encrypts a yes/no ballot. The contract checks quorum
                  on encrypted votes and only reveals the final pass/fail result.
                </p>
              </div>
              <ArrowRight size={16} className={styles.fheDemoArrow} />
            </Link>
            <Link
              href={`/project/${DEMO_FHE_V2_HASH}?weighted=1`}
              className={styles.fheDemoCard}
              onClick={() => track("explorer_fhe_v2_click")}
            >
              <div className={styles.fheDemoIcon}><Zap size={18} /></div>
              <div className={styles.fheDemoCopy}>
                <span className={styles.fheDemoKicker}>v2 · Weighted consensus</span>
                <h3 className={styles.fheDemoTitle}>Confidence-weighted votes</h3>
                <p className={styles.fheDemoBody}>
                  Each verifier encrypts a ballot and a confidence score. The
                  contract weights every vote before revealing only the weighted
                  outcome.
                </p>
              </div>
              <ArrowRight size={16} className={styles.fheDemoArrow} />
            </Link>
          </div>
        </div>
        </Reveal>

        {/* All milestones — unified table */}
        <Reveal as="div" delay={80}>
        <div className={styles.sectionLabel}>
          <span className={styles.sectionLabelText}>All milestones · 0G Chain + Sepolia FHE</span>
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
                {allRows.length > 0
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
                        href={m.href}
                        className={styles.hashCell}
                        title={m.milestoneHash}
                      >
                        {shortHash(m.milestoneHash)}
                      </Link>
                      {m.chain !== "0g" && (
                        <span className={`${styles.chainBadge} ${m.chain === "sepolia-fhe-v2" ? styles.chainWeighted : ""}`}>
                          {m.chain === "sepolia-fhe-v1" ? <><Lock size={10} /> FHE</> : <><Zap size={10} /> FHE.mul</>}
                        </span>
                      )}
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
                      {m.chain === "0g" ? (
                        <>{m.verifiedVotes}/{m.verifierCount}</>
                      ) : (
                        <span className={styles.sealedVotes} title="Votes are encrypted — only the count is known">
                          {m.verifiedVotes}/{m.verifierCount} sealed
                        </span>
                      )}
                    </td>
                    <td className={styles.dateCell}>{formatDate(m.deadline)}</td>
                    <td>
                      {m.finalEvidenceRoot &&
                      m.finalEvidenceRoot !==
                        "0x0000000000000000000000000000000000000000000000000000000000000000" ? (
                        <Link
                          href={m.href}
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
        </Reveal>

        <DemoBridge context="explorer" />

        <AgentHelper
          context="explorer"
          faqs={[
            { q: "What am I looking at?", a: "A table of all milestones created on Weft — both public milestones on 0G Chain and confidential milestones on Sepolia. Each row shows the builder, stake, verifier votes, and evidence." },
            { q: "What does 'sealed' mean in the votes column?", a: "On confidential milestones, verifier votes are encrypted. You can see how many ballots were cast, but not how each verifier voted — only the final result is decryptable." },
            { q: "How do I try the FHE demos?", a: "Click either card at the top (v1 boolean quorum or v2 weighted consensus). You'll go to the milestone page where you can stake, watch sealed ballots arrive, and decrypt the result yourself." },
            { q: "Can I filter by status?", a: "Yes — use the filter buttons (All, Verified, Pending, Failed) or search by milestone hash, builder address, or ENS name." },
          ]}
        />
      </div>
    </div>
  );
}
