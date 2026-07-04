export type MilestoneState = 'pending' | 'verified' | 'failed';
export type BuilderType = 'human' | 'agent';

export interface CoBuilder {
  ens: string;
  address: string;
  type: BuilderType;
  shareBps: number;
}

export interface Milestone {
  hash: string;
  projectName: string;
  projectId: string;
  description: string;
  builder: { ens: string; address: string; type: BuilderType };
  coBuilders: CoBuilder[];
  deadline: number;
  totalStaked: string;
  state: MilestoneState;
  verifiedVotes: number;
  verifierCount: number;
  tags: string[];
  evidenceRoot?: string;
}

export interface Builder {
  ens: string;
  address: string;
  type: BuilderType;
  verifiedMilestones: number;
  failedMilestones: number;
  totalEarned: string;
  reputationScore: number;
  projects: string[];
  joinedAt: string;
  bio: string;
}

const now = Date.now();

export function formatDeadline(ts: number): string {
  const diff = ts - Date.now();
  if (diff < 0) return 'Ended';
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hrs = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  if (days > 0) return `${days}d ${hrs}h remaining`;
  return `${hrs}h remaining`;
}

export function shortAddress(addr: string) {
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}
