"use client";

import Link from "next/link";
import { ArrowLeft, Users } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { RefreshButton } from "@/components/RefreshButton";
import { KPISkeleton, ListSkeleton } from "@/components/KPISkeleton";
import styles from "./page.module.css";

interface Verifier {
  address: string;
  ens: string | null;
  authorized: boolean;
  votesCast: number;
  milestonesParticipated: string[];
}

interface VerifiersData {
  ok: boolean;
  verifiers: Verifier[];
  consensus: {
    totalVotes: number;
    totalVerifierSlots: number;
    agreementRate: string;
    dissentFlags: number;
    peerInboxDir: string | null;
    peerInboxExists: boolean;
  };
  agentEns: string | null;
  builderEns: string | null;
}

async function fetchVerifiers(): Promise<VerifiersData> {
  const res = await fetch("/api/verifiers", { cache: "no-store" });
  if (!res.ok) throw new Error(`Verifiers fetch failed: ${res.status}`);
  return res.json();
}

function useVerifiers() {
  return useQuery({ queryKey: ["verifiers-data"], queryFn: fetchVerifiers, staleTime: 15_000 });
}

function shortAddr(addr: string): string {
  if (!addr || addr.length < 12) return addr;
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

export default function VerifiersPage() {
  const { data, isLoading, error, refetch, isFetching } = useVerifiers();
  const verifiers = data?.verifiers ?? [];
  const consensus = data?.consensus;

  return (
    <div className={styles.container}>
      <div className={styles.inner}>
        <Link href="/" className={styles.backLink}>
          <ArrowLeft size={14} /> Back to Weft
        </Link>

        <div className={styles.header}>
          <div className={styles.eyebrow}>
            <Users size={15} /> Verifier Network
          </div>
          <h1 className={styles.title}>The swarm that signs your capital.</h1>
          <p className={styles.subtitle}>
            Independent AI agents that verify milestones and release capital.
            Each agent collects evidence independently — deployment, usage, code activity —
            then signs a verdict onchain. 2 of 3 must agree before capital moves.
            No single party can fake a result.
          </p>
          <div style={{ marginTop: "1rem" }}>
            <RefreshButton onClick={() => refetch()} isFetching={isFetching} />
          </div>
        </div>

        {isLoading && (
          <>
            <KPISkeleton count={3} />
            <ListSkeleton rows={3} />
          </>
        )}
        {error && (
          <div className={styles.errorState}>
            Failed to load: {error instanceof Error ? error.message : "Unknown error"}
          </div>
        )}

        {!isLoading && !error && (
          <>
            <div className={styles.kpiGrid}>
              <div className={styles.kpiCard}>
                <div className={styles.kpiLabel}>Active Verifiers</div>
                <div className={styles.kpiValue}>{verifiers.length}</div>
                <div className={styles.kpiSub}>authorized nodes</div>
              </div>
              <div className={styles.kpiCard}>
                <div className={styles.kpiLabel}>Total Votes</div>
                <div className={styles.kpiValue}>{consensus?.totalVotes ?? 0}</div>
                <div className={styles.kpiSub}>verifier votes cast</div>
              </div>
              <div className={styles.kpiCard}>
                <div className={styles.kpiLabel}>Agreement Rate</div>
                <div className={styles.kpiValue}>{consensus?.agreementRate ?? "0"}%</div>
                <div className={styles.kpiSub}>{consensus?.dissentFlags ?? 0} dissent flags</div>
              </div>
            </div>

            {/* Network Status — merged verifier list + consensus details */}
            <div className={styles.section}>
              <h2 className={styles.sectionTitle}>
                Network Status
                <span className={styles.sectionBadge}>{verifiers.length} nodes</span>
              </h2>

              {/* Consensus summary — inline */}
              <div className={styles.consensusBar}>
                <div className={styles.consensusStat}>
                  <span className={styles.consensusStatValue}>{consensus?.totalVotes ?? 0}</span>
                  <span className={styles.consensusStatLabel}>Total Votes</span>
                </div>
                <div className={styles.consensusStat}>
                  <span className={styles.consensusStatValue}>{consensus?.totalVerifierSlots ?? 0}</span>
                  <span className={styles.consensusStatLabel}>Slots</span>
                </div>
                <div className={styles.consensusStat}>
                  <span className={styles.consensusStatValue}>{consensus?.agreementRate ?? "0"}%</span>
                  <span className={styles.consensusStatLabel}>Agreement</span>
                </div>
                <div className={styles.consensusStat}>
                  <span className={styles.consensusStatValue}>{consensus?.dissentFlags ?? 0}</span>
                  <span className={styles.consensusStatLabel}>Dissent Flags</span>
                </div>
              </div>

              {verifiers.length === 0 ? (
                <div className={styles.emptyState}>No verifier nodes registered yet.</div>
              ) : (
                verifiers.map((v) => (
                  <div key={v.address} className={styles.verifierCard}>
                    <div className={styles.verifierAvatar}>
                      {(v.ens ?? v.address).slice(0, 2).toUpperCase()}
                    </div>
                    <div className={styles.verifierBody}>
                      {v.ens ? (
                        <Link href={`/builder/${v.ens}`} style={{ textDecoration: "none" }}>
                          <div className={styles.verifierEns}>{v.ens}</div>
                        </Link>
                      ) : (
                        <div className={styles.verifierEns}>{shortAddr(v.address)}</div>
                      )}
                      <div className={styles.verifierAddr}>{v.address}</div>
                    </div>
                    <div className={styles.verifierStats}>
                      <div className={styles.verifierStat}>
                        <span className={styles.verifierStatValue}>{v.votesCast}</span>
                        <span className={styles.verifierStatLabel}>Votes</span>
                      </div>
                      <div className={styles.verifierStat}>
                        <span className={styles.verifierStatValue}>{v.milestonesParticipated.length}</span>
                        <span className={styles.verifierStatLabel}>Milestones</span>
                      </div>
                    </div>
                    {v.authorized && <span className={styles.authorizedBadge}>Authorized</span>}
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
