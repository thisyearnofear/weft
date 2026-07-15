/**
 * Canton UI types — thin re-exports of the shared MilestoneView (API SSOT).
 * Role labels stay here; status shape lives in milestone-view.ts.
 */

export type {
  CantonMilestone,
  MilestoneParties,
  MilestoneStatus,
  MilestoneView,
  SettlementInstrument,
  StakeRecord,
} from "./milestone-view";

export type CantonRole = "issuer" | "funder" | "verifier" | "observer";

/** Demo / mirror party labels for the institutional console. */
export const ROLE_PARTIES: Record<CantonRole, string> = {
  issuer: "Issuer",
  funder: "Funder",
  verifier: "VerifierA",
  observer: "Auditor",
};
