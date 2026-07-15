/**
 * Rail-agnostic milestone view — mirrors agent/lib/domain/models.MilestoneViewModel.to_status_dict().
 * Single source of truth for status API + Canton UI + card adapters.
 */

export type SettlementRail = "evm" | "canton";

export type MilestoneStatus =
  | "pending"
  | "funded"
  | "finalized"
  | "verified"
  | "failed"
  | "released"
  | "refunded";

/** Compact card states derived from MilestoneStatus / flags. */
export type MilestoneCardState = "pending" | "verified" | "failed";

export interface MilestoneParties {
  issuer: string;
  builder: string;
  funders: string[];
  verifiers: string[];
  observers: string[];
}

export interface StakeRecord {
  funder: string;
  amount: string;
}

export interface SettlementInstrument {
  symbol: string;
  instrumentId: string;
  decimals: number;
}

/** Shared status shape for EVM or Canton (API JSON, camelCase). */
export interface MilestoneView {
  milestoneId: string;
  rail: SettlementRail;
  projectId: string;
  templateId: string;
  metadataHash: string;
  deadline: number;
  totalStaked: string;
  status: MilestoneStatus;
  finalized: boolean;
  verified: boolean;
  released: boolean;
  verifierCount: number;
  verifiedVotes: number;
  quorum: number;
  finalEvidenceRoot: string;
  parties: MilestoneParties;
  stakes: StakeRecord[];
  /** Canton enrichments (optional on EVM). */
  settlement?: SettlementInstrument;
  lastTransferRef?: string;
  /** GMS / CRM grant id (from /canton/ingest). */
  externalRef?: string;
}

export type CantonMilestone = MilestoneView & {
  rail: "canton";
};

export const ZERO_EVIDENCE_ROOT = (`0x${"0".repeat(64)}`) as string;

export function isZeroEvidenceRoot(root: string | undefined | null): boolean {
  if (!root) return true;
  return root.toLowerCase() === ZERO_EVIDENCE_ROOT;
}

export function statusFromFlags(m: {
  finalized: boolean;
  verified: boolean;
  released: boolean;
  totalStaked?: string;
  refunded?: boolean;
}): MilestoneStatus {
  if (m.refunded) return "refunded";
  if (m.released) return "released";
  if (m.finalized && m.verified) return "verified";
  if (m.finalized && !m.verified) return "failed";
  try {
    if (m.totalStaked && Number(m.totalStaked) > 0) return "funded";
  } catch {
    /* ignore */
  }
  return "pending";
}

export function cardStateFromStatus(status: MilestoneStatus): MilestoneCardState {
  if (status === "verified" || status === "released") return "verified";
  if (status === "failed" || status === "refunded") return "failed";
  return "pending";
}

export function cardStateFromFlags(m: {
  finalized: boolean;
  verified: boolean;
}): MilestoneCardState {
  if (m.verified) return "verified";
  if (m.finalized) return "failed";
  return "pending";
}

export function formatDeadline(ts: number): string {
  // Accept unix seconds or ms
  const ms = ts < 1e12 ? ts * 1000 : ts;
  const diff = ms - Date.now();
  if (diff < 0) return "Ended";
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hrs = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  if (days > 0) return `${days}d ${hrs}h remaining`;
  return `${hrs}h remaining`;
}

export function shortAddress(addr: string): string {
  if (!addr || addr.length < 10) return addr || "—";
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

/** Normalize unknown API JSON into MilestoneView (tolerant of missing fields). */
export function parseMilestoneView(raw: unknown, fallbackRail: SettlementRail = "evm"): MilestoneView | null {
  if (!raw || typeof raw !== "object") return null;
  const d = raw as Record<string, unknown>;
  const milestoneId = String(d.milestoneId ?? d.milestoneHash ?? "");
  if (!milestoneId) return null;

  const finalized = Boolean(d.finalized);
  const verified = Boolean(d.verified);
  const released = Boolean(d.released);
  const totalStaked = String(d.totalStaked ?? "0");
  const partiesRaw = (d.parties as Record<string, unknown> | undefined) || {};
  const builder = String(partiesRaw.builder ?? d.builder ?? "");

  const status =
    (typeof d.status === "string" && d.status
      ? (d.status as MilestoneStatus)
      : statusFromFlags({
          finalized,
          verified,
          released,
          totalStaked,
          refunded: Boolean(d.refunded),
        }));

  const settlement = d.settlement as SettlementInstrument | undefined;

  return {
    milestoneId,
    rail: (d.rail as SettlementRail) || fallbackRail,
    projectId: String(d.projectId ?? ""),
    templateId: String(d.templateId ?? ""),
    metadataHash: String(d.metadataHash ?? ""),
    deadline: Number(d.deadline ?? 0),
    totalStaked,
    status,
    finalized,
    verified,
    released,
    verifierCount: Number(d.verifierCount ?? 0),
    verifiedVotes: Number(d.verifiedVotes ?? 0),
    quorum: Number(d.quorum ?? 2),
    finalEvidenceRoot: String(d.finalEvidenceRoot ?? ""),
    parties: {
      issuer: String(partiesRaw.issuer ?? builder),
      builder,
      funders: Array.isArray(partiesRaw.funders) ? partiesRaw.funders.map(String) : [],
      verifiers: Array.isArray(partiesRaw.verifiers) ? partiesRaw.verifiers.map(String) : [],
      observers: Array.isArray(partiesRaw.observers) ? partiesRaw.observers.map(String) : [],
    },
    stakes: Array.isArray(d.stakes)
      ? (d.stakes as Array<Record<string, unknown>>).map((s) => ({
          funder: String(s.funder ?? ""),
          amount: String(s.amount ?? "0"),
        }))
      : [],
    settlement,
    lastTransferRef: d.lastTransferRef ? String(d.lastTransferRef) : undefined,
    externalRef: d.externalRef ? String(d.externalRef) : undefined,
  };
}
