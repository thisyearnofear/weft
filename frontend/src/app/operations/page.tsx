"use client";

import { useMemo } from "react";
import Link from "next/link";
import { Activity, ArrowRight, DollarSign, CheckCircle, Eye, ServerCog, Zap, Lock } from "lucide-react";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { useQuery } from "@tanstack/react-query";
import { RefreshButton } from "@/components/RefreshButton";
import { KPISkeleton, ListSkeleton } from "@/components/KPISkeleton";
import { CountUp } from "@/components/CountUp";
import { ErrorState } from "@/components/ErrorState";
import { OfflineBadge } from "@/components/OfflineBadge";
import { ResiliencePanel } from "@/components/ResiliencePanel";
import { AgentTraceReceipt } from "@/components/AgentTraceReceipt";
import { TraceWaterfall } from "@/components/TraceWaterfall";
import { Reveal } from "@/components/Reveal";
import { ActSection } from "@/components/ui/ActSection";
import ui from "@/components/ui/weft-ui.module.css";
import { useObservability } from "@/hooks/useObservability";
import { getSignozTracesExplorerUrl, SIGNOZ_WINNING_MILESTONE_HASH } from "@/lib/signoz";
import styles from "./page.module.css";

interface TreasuryData {
  activated: boolean;
  earned: number;
  spent: number;
  net: number;
  profitable: boolean;
  spendByService: Record<string, number>;
  chargeCount: number;
  balance: { available: number | null; pending: number | null } | null;
  recentCharges: Array<{
    id: string;
    service: string;
    amount: number;
    memo: string;
    created: number;
  }>;
}

interface RecoveryData {
  totalEvents: number;
  failures: number;
  recoveries: number;
  verdictLanded: boolean;
  chaosActive: string[];
  recentEvents: unknown[];
}

interface VerificationEntry {
  milestoneHash: string;
  verified: boolean;
  released: boolean;
  verifierCount: number;
  verifiedVotes: number;
  finalEvidenceRoot: string;
  builderEns: string | null;
  stakedEth: string;
  statusLabel: string;
  deadline: number;
}

interface OperationsData {
  ok: boolean;
  treasury: TreasuryData | null;
  recovery: RecoveryData | null;
  verifications: VerificationEntry[];
  overview: {
    pitch: string;
    totalMilestones: number;
    verifiedCount: number;
    totalStakedEth: number;
  } | null;
}

async function fetchOperations(): Promise<OperationsData> {
  const res = await fetch("/api/operations", { cache: "no-store" });
  if (!res.ok) throw new Error(`Operations fetch failed: ${res.status}`);
  return res.json();
}

function useOperations() {
  return useQuery({
    queryKey: ["operations"],
    queryFn: fetchOperations,
    staleTime: 15_000,
  });
}

function formatCurrency(amount: number): string {
  return `$${amount.toFixed(2)}`;
}

function formatDate(ts: number): string {
  if (!ts) return "—";
  return new Date(ts * 1000).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function shortHash(hash: string): string {
  if (!hash || hash.length < 12) return hash;
  return `${hash.slice(0, 10)}...${hash.slice(-6)}`;
}

const SERVICE_LABELS: Record<string, string> = {
  keeperhub: "Reliable Execution",
  fal: "AI Image Generation",
  kimi: "AI Reasoning",
  nemotron: "AI Reasoning",
  revenue_sweep: "Revenue Earned",
};

export default function OperationsPage() {
  const { data, isLoading, error, refetch, isFetching } = useOperations();
  const { data: observability } = useObservability();

  const treasury = data?.treasury ?? null;
  const recovery = data?.recovery ?? null;
  const verifications = data?.verifications ?? [];
  const overview = data?.overview ?? null;

  const charges = useMemo(() => {
    if (!treasury?.recentCharges) return [];
    return [...treasury.recentCharges].sort((a, b) => b.created - a.created);
  }, [treasury]);

  return (
    <div className={styles.container}>
      <div className={styles.inner}>
        <Breadcrumbs items={[{ label: "Operations" }]} />

        <div className={styles.header}>
          <div className={styles.eyebrow}>
            <Activity size={15} /> Agent Operations
          </div>
          <h1 className={styles.title}>The agent&apos;s open books.</h1>
          <p className={styles.subtitle}>
            Weft is an agent-run business. It earns 3% of every milestone it verifies,
            then spends that revenue on AI inference, image generation, and onchain execution.
            Every transaction is publicly auditable — no human touches the finances.
          </p>
          <div style={{ marginTop: "1rem" }}>
            <RefreshButton onClick={() => refetch()} isFetching={isFetching} />
          </div>
        </div>

        {isLoading && (
          <>
            <KPISkeleton count={4} />
            <ListSkeleton rows={5} />
          </>
        )}
        {error && !data && (
          <ErrorState message={`Failed to load operations: ${error instanceof Error ? error.message : "Unknown error"}`} onRetry={() => refetch()} isRetrying={isFetching} />
        )}

        {error && data && <OfflineBadge />}

        {!isLoading && data && (
          <>
            <ActSection
              act={1}
              id="act-present"
              title="The agent is present."
              subtitle="SigNoz traces every autonomous step before capital moves."
            >
              <Reveal as="div" delay={0}>
                <div className={`${styles.observatoryBand} ${ui.surface} ${ui.surfaceAccent}`}>
                  <div className={styles.observatoryCopy}>
                    <div className={ui.eyebrow}>
                      <Eye size={15} /> SigNoz agent observability
                    </div>
                    <h2>Every autonomous step is inspectable.</h2>
                    <p>
                      The winning demo trace follows one milestone through agent planning, chain tool
                      calls, LLM narrative generation, deterministic evidence checks, and settlement
                      fallback handling.
                    </p>
                    <div className={styles.observatoryLinks}>
                      <Link href="/observability" className={styles.observatoryLink}>
                        Open Agent Observatory <ArrowRight size={15} />
                      </Link>
                      <a
                        href={getSignozTracesExplorerUrl()}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={styles.observatoryLinkSecondary}
                      >
                        SigNoz trace <ArrowRight size={15} />
                      </a>
                    </div>
                  </div>
                  <div className={styles.traceStackWrap}>
                    <TraceWaterfall
                      spanCounts={observability?.signoz.spanCounts}
                      isLoading={!observability}
                      showDeepLinks
                      compact
                    />
                  </div>
                  <div className={`${styles.sigNozProof} ${ui.surfaceIndigo}`}>
                    <ServerCog size={18} />
                    <span>Validated in SigNoz</span>
                    <code>{SIGNOZ_WINNING_MILESTONE_HASH}</code>
                  </div>
                </div>
              </Reveal>

              {observability?.signoz && (
                <Reveal as="div" delay={80}>
                  <div className={`${styles.receiptBand} ${ui.surface}`}>
                    <AgentTraceReceipt
                      signoz={observability.signoz}
                      recovery={observability.recovery}
                      compact
                    />
                  </div>
                </Reveal>
              )}
            </ActSection>

            <ActSection
              act={2}
              id="act-business"
              title="The agent runs a business."
              subtitle="It earns 3% of every milestone, spends revenue on inference and execution."
            >
              <Reveal as="div" delay={0}>
                {/* KPI Cards — grouped by intent */}
                <div className={styles.kpiGroup}>
                  <span className={styles.kpiGroupLabel}>Performance</span>
                  <div className={styles.kpiGrid}>
                    <div className={`${styles.kpiCard} stagger stagger-1 lift`}>
                      <div className={styles.kpiLabel}>Milestones Verified</div>
                      <div className={styles.kpiValue}>
                        <CountUp value={overview?.verifiedCount ?? 0} />
                      </div>
                      <div className={styles.kpiSub}>of {overview?.totalMilestones ?? 0} total</div>
                    </div>
                    <div className={`${styles.kpiCard} stagger stagger-2 lift`}>
                      <div className={styles.kpiLabel}>Capital Processed</div>
                      <div className={styles.kpiValue}>
                        <CountUp value={overview?.totalStakedEth ?? 0} decimals={4} suffix=" ETH" />
                      </div>
                      <div className={styles.kpiSub}>ETH staked</div>
                    </div>
                    <div className={`${styles.kpiCard} stagger stagger-3 lift`}>
                      <div className={styles.kpiLabel}>Sealed-Ballot Verifications</div>
                      <div className={styles.kpiValue}>
                        <Lock size={16} style={{ display: "inline", marginRight: "0.3rem", verticalAlign: "middle" }} />
                        <CountUp value={2} />
                      </div>
                      <div className={styles.kpiSub}>Zama FHE on Sepolia · FHE.add + FHE.mul</div>
                    </div>
                  </div>
                </div>
                <div className={styles.kpiGroup}>
                  <span className={styles.kpiGroupLabel}>Financials</span>
                  <div className={styles.kpiGrid}>
                    <div className={`${styles.kpiCard} stagger stagger-4 lift`}>
                      <div className={styles.kpiLabel}>Revenue Earned</div>
                      <div className={`${styles.kpiValue} ${(treasury?.net ?? 0) >= 0 ? styles.kpiPositive : styles.kpiNegative}`}>
                        {formatCurrency(treasury?.earned ?? 0)}
                      </div>
                      <div className={styles.kpiSub}>{treasury?.chargeCount ?? 0} charges</div>
                    </div>
                    <div className={`${styles.kpiCard} stagger stagger-5 lift`}>
                      <div className={styles.kpiLabel}>Net P&amp;L</div>
                      <div className={`${styles.kpiValue} ${(treasury?.net ?? 0) >= 0 ? styles.kpiPositive : styles.kpiNegative}`}>
                        {formatCurrency(treasury?.net ?? 0)}
                      </div>
                      <div className={styles.kpiSub}>
                        {treasury?.profitable ? "Profitable" : "Not yet profitable"}
                      </div>
                    </div>
                  </div>
                </div>
              </Reveal>

              <Reveal as="div" delay={80}>
                {/* Financial Ledger */}
                <div className={styles.section}>
                  <h2 className={styles.sectionTitle}>
                    <DollarSign size={18} /> Financial Ledger
                    <span className={styles.sectionBadge}>{charges.length} transactions</span>
                  </h2>
                  {charges.length === 0 ? (
                    <div className={styles.emptyState}>No transactions recorded yet.</div>
                  ) : (
                    <table className={styles.ledgerTable}>
                      <thead>
                        <tr>
                          <th>Service</th>
                          <th>Description</th>
                          <th>Amount</th>
                          <th>Date</th>
                        </tr>
                      </thead>
                      <tbody>
                        {charges.map((charge) => {
                          const isRevenue = charge.service === "revenue_sweep";
                          return (
                            <tr key={charge.id}>
                              <td className={styles.chargeService}>
                                {SERVICE_LABELS[charge.service] ?? charge.service}
                              </td>
                              <td className={styles.chargeMemo}>{charge.memo}</td>
                              <td className={`${styles.chargeAmount} ${isRevenue ? styles.amountPositive : styles.amountNegative}`}>
                                {isRevenue ? "+" : "−"}{formatCurrency(charge.amount)}
                              </td>
                              <td className={styles.chargeDate}>{formatDate(charge.created)}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  )}
                  {treasury && (
                    <div style={{ marginTop: "1rem", display: "flex", gap: "1.5rem", fontSize: "0.85rem", color: "var(--c-text-2)", flexWrap: "wrap" }}>
                      <span>
                        Balance: <strong>{formatCurrency(treasury.balance?.available ?? 0)}</strong> available
                        {treasury.balance?.pending ? `, ${formatCurrency(treasury.balance.pending)} pending` : ""}
                      </span>
                      {Object.entries(treasury.spendByService ?? {}).map(([service, amount]) => (
                        <span key={service}>
                          {SERVICE_LABELS[service] ?? service}: <strong>{formatCurrency(amount)}</strong>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </Reveal>
            </ActSection>

            <ActSection
              act={3}
              id="act-audit"
              title="Audit trail and infrastructure."
              subtitle="Every verification is logged. Every failure mode is an operating signal."
            >
              <Reveal as="div" delay={0}>
                {/* Verification Log */}
                <div className={styles.section}>
                  <h2 className={styles.sectionTitle}>
                    <CheckCircle size={18} /> Verification Log
                    <span className={styles.sectionBadge}>{verifications.length} milestones</span>
                  </h2>
                  {verifications.length === 0 ? (
                    <div className={styles.emptyState}>No verifications recorded yet.</div>
                  ) : (
                    verifications.map((v) => {
                      const state = v.verified ? "verified" : v.released ? "verified" : "pending";
                      return (
                        <div key={v.milestoneHash} className={styles.verificationItem}>
                          <span className={styles.verificationIcon}>
                            {v.verified ? "✓" : "○"}
                          </span>
                          <div className={styles.verificationBody}>
                            <Link
                              href={`/project/${v.milestoneHash}`}
                              className={styles.verificationHash}
                            >
                              {shortHash(v.milestoneHash)}
                            </Link>
                            <div className={styles.verificationMeta}>
                              {v.builderEns ?? "Unknown builder"} · {v.stakedEth} ETH ·{" "}
                              {v.verifiedVotes}/{v.verifierCount} verifier votes ·{" "}
                              deadline {formatDate(v.deadline)}
                            </div>
                          </div>
                          <span
                            className={`${styles.verificationStatus} ${
                              state === "verified"
                                ? styles.statusVerified
                                : state === "pending"
                                  ? styles.statusPending
                                  : styles.statusFailed
                            }`}
                          >
                            {v.statusLabel}
                          </span>
                        </div>
                      );
                    })
                  )}
                  {/* Sealed-ballot verifications on Sepolia (not in the 0G log) */}
                  <div className={styles.sealedNote}>
                    <Lock size={14} />
                    <span>
                      2 additional verifications on Sepolia via{" "}
                      <strong>Zama FHE sealed ballots</strong> — votes encrypted, tallied
                      homomorphically (FHE.add + FHE.mul).{" "}
                      <Link href="/explorer" className={styles.sealedNoteLink}>View in explorer →</Link>
                    </span>
                  </div>
                </div>
              </Reveal>

              <Reveal as="div" delay={80}>
                {/* Infrastructure Health */}
                <div className={styles.section}>
                  <h2 className={styles.sectionTitle}>
                    <Zap size={18} /> Infrastructure Health
                  </h2>
                  <div className={styles.healthGrid}>
                    <div className={styles.healthItem}>
                      <span className={`${styles.healthDot} ${recovery && recovery.totalEvents > 0 ? styles.healthDotWarn : styles.healthDotOk}`} />
                      <span className={styles.healthLabel}>Recovery Events</span>
                      <span className={styles.healthValue}>{recovery?.totalEvents ?? 0}</span>
                    </div>
                    <div className={styles.healthItem}>
                      <span className={`${styles.healthDot} ${recovery && recovery.failures > 0 ? styles.healthDotWarn : styles.healthDotOk}`} />
                      <span className={styles.healthLabel}>Failures</span>
                      <span className={styles.healthValue}>{recovery?.failures ?? 0}</span>
                    </div>
                    <div className={styles.healthItem}>
                      <span className={`${styles.healthDot} ${recovery && recovery.recoveries > 0 ? styles.healthDotOk : styles.healthDotOk}`} />
                      <span className={styles.healthLabel}>Recoveries</span>
                      <span className={styles.healthValue}>{recovery?.recoveries ?? 0}</span>
                    </div>
                    <div className={styles.healthItem}>
                      <span className={`${styles.healthDot} ${recovery?.verdictLanded ? styles.healthDotOk : styles.healthDotWarn}`} />
                      <span className={styles.healthLabel}>Verdict Landed</span>
                      <span className={styles.healthValue}>{recovery?.verdictLanded ? "Yes" : "No"}</span>
                    </div>
                    <div className={styles.healthItem}>
                      <span className={`${styles.healthDot} ${recovery && recovery.chaosActive.length > 0 ? styles.healthDotErr : styles.healthDotOk}`} />
                      <span className={styles.healthLabel}>Chaos Active</span>
                      <span className={styles.healthValue}>
                        {recovery && recovery.chaosActive.length > 0
                          ? recovery.chaosActive.join(", ")
                          : "None"}
                      </span>
                    </div>
                    <div className={styles.healthItem}>
                      <span className={`${styles.healthDot} ${treasury?.activated ? styles.healthDotOk : styles.healthDotWarn}`} />
                      <span className={styles.healthLabel}>Stripe Active</span>
                      <span className={styles.healthValue}>{treasury?.activated ? "Yes" : "No"}</span>
                    </div>
                  </div>
                </div>
              </Reveal>

              <Reveal as="div" delay={160}>
                {/* Resilience drill — formerly the /recovery page, folded in here */}
                <div className={styles.section} style={{ padding: 0, overflow: "hidden" }}>
                  <ResiliencePanel />
                </div>
              </Reveal>
            </ActSection>
          </>
        )}
      </div>
    </div>
  );
}
