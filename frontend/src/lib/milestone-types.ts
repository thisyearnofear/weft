/**
 * Presentation models for landing / explorer cards.
 * Canonical status shape: see milestone-view.ts (matches agent MilestoneViewModel).
 */

import type { MilestoneCardState, MilestoneView } from "./milestone-view";
import {
  cardStateFromFlags,
  cardStateFromStatus,
  formatDeadline,
  isZeroEvidenceRoot,
  shortAddress,
} from "./milestone-view";

export type { MilestoneCardState };
export type MilestoneState = MilestoneCardState;
export type BuilderType = "human" | "agent";

export {
  cardStateFromFlags,
  cardStateFromStatus,
  formatDeadline,
  isZeroEvidenceRoot,
  shortAddress,
};

export interface CoBuilder {
  ens: string;
  address: string;
  type: BuilderType;
  shareBps: number;
}

/** UI card model — derived from MilestoneView or onchain reads. */
export interface Milestone {
  hash: string;
  projectName: string;
  projectId: string;
  description: string;
  builder: { ens: string; address: string; type: BuilderType };
  coBuilders: CoBuilder[];
  deadline: number;
  totalStaked: string;
  state: MilestoneCardState;
  verifiedVotes: number;
  verifierCount: number;
  tags: string[];
  evidenceRoot?: string;
  rail?: "evm" | "canton";
}

export function milestoneCardFromView(
  view: MilestoneView,
  opts?: {
    projectName?: string;
    description?: string;
    builderEns?: string;
    tags?: string[];
    /** Display total (e.g. ETH decimals already formatted). */
    totalStakedDisplay?: string;
    /** If true, treat deadline as unix seconds (multiply for card). */
    deadlineIsUnixSeconds?: boolean;
  },
): Milestone {
  const builderAddr = view.parties.builder || "";
  const deadlineMs =
    opts?.deadlineIsUnixSeconds !== false && view.deadline < 1e12
      ? view.deadline * 1000
      : view.deadline;

  return {
    hash: view.milestoneId,
    projectName: opts?.projectName || `Milestone ${view.milestoneId.slice(0, 8)}…`,
    projectId: view.projectId,
    description:
      opts?.description ||
      (view.verified
        ? `Verified · ${view.totalStaked} released path open`
        : view.finalized
          ? `Not verified · refund path`
          : `Capital locked · awaiting evidence`),
    builder: {
      ens: opts?.builderEns || shortAddress(builderAddr),
      address: builderAddr,
      type: "human",
    },
    coBuilders: [],
    deadline: deadlineMs,
    totalStaked: opts?.totalStakedDisplay ?? view.totalStaked,
    state: cardStateFromStatus(view.status),
    verifiedVotes: view.verifiedVotes,
    verifierCount: view.verifierCount,
    tags: opts?.tags ?? [view.rail, view.status, view.templateId].filter(Boolean),
    evidenceRoot: isZeroEvidenceRoot(view.finalEvidenceRoot)
      ? undefined
      : view.finalEvidenceRoot,
    rail: view.rail,
  };
}
