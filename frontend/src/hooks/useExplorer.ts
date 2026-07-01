import { useQuery } from "@tanstack/react-query";
import { fetchJsonWithRetry } from "@/lib/fetchWithTimeout";
import { queryDefaults, STALE_TIMES } from "@/lib/queryConfig";

export interface ExplorerMilestone {
  milestoneHash: string;
  projectId: string;
  templateId: string;
  metadataHash: string;
  builder: string;
  builderEns: string | null;
  createdAt: number;
  deadline: number;
  totalStaked: string;
  stakedEth: string;
  finalized: boolean;
  verified: boolean;
  released: boolean;
  verifierCount: number;
  verifiedVotes: number;
  finalEvidenceRoot: string;
  state: "pending" | "verified" | "failed";
  statusLabel: string;
}

interface ExplorerResponse {
  ok: boolean;
  milestones: ExplorerMilestone[];
  count: number;
}

export function useExplorerMilestones() {
  return useQuery({
    queryKey: ["explorer-milestones"],
    queryFn: async () => {
      const data = await fetchJsonWithRetry<ExplorerResponse>("/api/explorer/milestones");
      if (!data.ok) throw new Error("Explorer API returned not-ok");
      return data.milestones;
    },
    staleTime: STALE_TIMES.explorer,
    ...queryDefaults,
  });
}
