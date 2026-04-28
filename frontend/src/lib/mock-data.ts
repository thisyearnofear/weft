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

export const MILESTONES: Milestone[] = [
  {
    hash: '0xa3f8c21d4e9b7056f12a8c3d5e7b091f2c4a6d8e0f1b3c5d7e9a0b2c4d6e8f0a',
    projectName: 'Autonomous Market Maker',
    projectId: '0xproject1',
    description:
      'Deploy a fully autonomous market-making agent with onchain settlement, quoting 4 pairs simultaneously, achieving 100+ unique callers in the first week of operation.',
    builder: { ens: 'cipher.eth', address: '0x1234567890abcdef1234567890abcdef12345678', type: 'human' },
    coBuilders: [
      { ens: 'agent-alpha.weft.eth', address: '0x5678abcdef901234567890abcdef901234567890', type: 'agent', shareBps: 3000 },
    ],
    deadline: now + 7 * 24 * 3600 * 1000,
    totalStaked: '4.20',
    state: 'pending',
    verifiedVotes: 1,
    verifierCount: 1,
    tags: ['DeFi', 'Agent', 'Autonomous'],
  },
  {
    hash: '0xb4e9d32a5f8c1047e23b9d4f6a8c0e2d4f6a8c0e2d4f6a8c0e2d4f6a8c0e2d4',
    projectName: 'Decentralised Reputation Graph',
    projectId: '0xproject2',
    description:
      'ENS-based portable reputation schema adopted by 3 partner protocols. Builder history stored on 0G Storage. Milestone verified via 47 unique ENS profiles updated onchain.',
    builder: { ens: 'vela.eth', address: '0x9abcdef01234567890abcdef01234567890abcde', type: 'human' },
    coBuilders: [],
    deadline: now - 2 * 24 * 3600 * 1000,
    totalStaked: '12.80',
    state: 'verified',
    verifiedVotes: 2,
    verifierCount: 2,
    tags: ['Identity', 'ENS', 'Infrastructure'],
    evidenceRoot: '0xc3f8a21d4e9b705ea8c3d5e7b091f2c4a6d8e0f1',
  },
  {
    hash: '0xc5fa43b6a091e158f34cafe7b9d2e4f6a8c0e2d4f6a8c0e2d4f6a8c0e2d4f6a',
    projectName: 'Cross-Chain Bridge Watcher',
    projectId: '0xproject3',
    description:
      'Monitoring system for anomalous bridge transactions with automated alert dispatching. Target: 99.9% uptime over 30-day window. Milestone failed — endpoint went dark on day 18.',
    builder: { ens: 'aero.eth', address: '0xdef01234567890abcdef01234567890abcdef012', type: 'human' },
    coBuilders: [
      { ens: 'agent-watcher.weft.eth', address: '0xfeedfeedfeedfeedfeedfeedfeedfeedfeedfeed', type: 'agent', shareBps: 2000 },
    ],
    deadline: now - 5 * 24 * 3600 * 1000,
    totalStaked: '2.10',
    state: 'failed',
    verifiedVotes: 0,
    verifierCount: 3,
    tags: ['Security', 'Bridge', 'Monitoring'],
    evidenceRoot: '0xd4e9b705a3f8c21df12a8c3d5e7b091f2c4a6d8',
  },
];

export const BUILDERS: Builder[] = [
  {
    ens: 'cipher.eth',
    address: '0x1234567890abcdef1234567890abcdef12345678',
    type: 'human',
    verifiedMilestones: 7,
    failedMilestones: 1,
    totalEarned: '34.50',
    reputationScore: 820,
    projects: ['Autonomous Market Maker', 'ZK Prover Suite'],
    joinedAt: '2024-01-15',
    bio: 'DeFi infrastructure builder. Onchain since 2020. Specialises in autonomous agent protocols and capital-efficient market structures.',
  },
  {
    ens: 'agent-alpha.weft.eth',
    address: '0x5678abcdef901234567890abcdef901234567890',
    type: 'agent',
    verifiedMilestones: 12,
    failedMilestones: 0,
    totalEarned: '18.20',
    reputationScore: 960,
    projects: ['Autonomous Market Maker', 'Arbitrage Monitor', 'Liquidity Optimiser'],
    joinedAt: '2024-06-01',
    bio: 'Autonomous agent co-builder. Hermes-verified. Participates identically to human builders — milestone stakes, evidence collection, onchain reputation.',
  },
  {
    ens: 'vela.eth',
    address: '0x9abcdef01234567890abcdef01234567890abcde',
    type: 'human',
    verifiedMilestones: 5,
    failedMilestones: 0,
    totalEarned: '28.10',
    reputationScore: 900,
    projects: ['Decentralised Reputation Graph', 'ENS Metadata Protocol'],
    joinedAt: '2023-11-03',
    bio: 'Protocol designer focused on identity primitives. Believes ENS text records are the CV of the next decade.',
  },
];

export function getMilestonesByState(state: MilestoneState | 'all') {
  if (state === 'all') return MILESTONES;
  return MILESTONES.filter((m) => m.state === state);
}

export function getBuilderByEns(ens: string) {
  return BUILDERS.find((b) => b.ens === ens) ?? null;
}

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
