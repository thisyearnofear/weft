export interface DemoTrack0G {
  storageConfigured: boolean;
  metadataIndexer: string | null;
  metadataRoot: string | null;
  finalEvidenceRoot: string | null;
  note: string;
}

export interface DemoTrackGensyn {
  peerInboxDir: string;
  peerInboxExists: boolean;
  bestPeerGroup: {
    verified: boolean;
    evidenceRoot: string;
    peerCount: number;
    nodeAddresses: string[];
  } | null;
  signedConsensusSigners: string[];
}

export interface DemoTrackKeeperHub {
  configured: boolean;
  apiUrl: string;
  timeoutSeconds: number;
  note: string;
}

export interface DemoProfile {
  ensName: string;
  available?: boolean;
  reason?: string;
  projects?: string[];
  milestonesVerified?: number;
  earnedTotal?: number;
  cobuilders?: string[];
  reputationScore?: number;
}

export interface DemoTrackEns {
  builderAddress: string;
  builderEns: string | null;
  agentEns: string | null;
  builderProfile: DemoProfile | null;
  agentProfile: DemoProfile | null;
}

export interface DemoTrackFal {
  available: boolean;
  reason?: string;
  falImageUrl?: string | null;
  falCoverUrl?: string | null;
  chronicleTitle?: string | null;
}

export interface MilestoneDemoPayload {
  pitch: string;
  tracks: {
    "0g": DemoTrack0G;
    gensyn: DemoTrackGensyn;
    keeperhub: DemoTrackKeeperHub;
    ens: DemoTrackEns;
    fal: DemoTrackFal;
  };
  statusFlags: {
    metadataAvailable: boolean;
    peerConsensusVisible: boolean;
    keeperhubVisible: boolean;
    ensVisible: boolean;
  };
}

export interface StatusApiMilestone {
  ok: boolean;
  milestoneHash: string;
  projectId: string;
  templateId: string;
  metadataHash: string;
  builder: string;
  createdAt: number;
  deadline: number;
  totalStaked: string;
  finalized: boolean;
  verified: boolean;
  released: boolean;
  verifierCount: number;
  verifiedVotes: number;
  finalEvidenceRoot: string;
  demo: MilestoneDemoPayload;
  metadata?: Record<string, unknown> & { ok?: boolean };
}

export interface StatusApiOverview {
  ok: boolean;
  pitch: string;
  sponsorFit: string[];
  demoHints: {
    statusEndpoint: string;
    apiSurface: string;
    peerInboxDir: string;
    metadataIndexer: string | null;
    builderEns: string | null;
    agentEns: string | null;
    milestones?: `0x${string}`[];
  };
  falConfigured?: boolean;
}

export interface TreasuryCharge {
  id: string;
  service: string;
  amount: number;
  memo: string;
  created: number;
}

export interface TreasuryPayload {
  ok: boolean;
  activated: boolean;
  message?: string;
  estimatedCosts?: Record<string, number>;
  earned?: number;
  spent?: number;
  net?: number;
  profitable?: boolean;
  spendByService?: Record<string, number>;
  chargeCount?: number;
  balance?: {
    available: number | null;
    pending: number | null;
  } | null;
  recentCharges?: TreasuryCharge[];
}
