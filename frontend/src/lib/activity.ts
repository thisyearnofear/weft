/// Shared shape of the activity feed — single source of truth for the
/// /api/activity route (producer) and the activity page (consumer).

export type ActivityEventType =
  | "verification"
  | "charge"
  | "revenue"
  | "consensus"
  | "deadline"
  | "chaos"
  | "fhe";

export interface ActivityEvent {
  timestamp: number;
  type: ActivityEventType;
  title: string;
  description: string;
  /** >1 when identical resilience events from the same burst were collapsed */
  count?: number;
  metadata: Record<string, unknown>;
}
