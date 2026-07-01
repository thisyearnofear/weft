import { useQuery } from "@tanstack/react-query";

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

async function fetchExplorer(): Promise<ExplorerMilestone[]> {
  const res = await fetch("/api/explorer/milestones", { cache: "no-store" });
  if (!res.ok) throw new Error(`Explorer fetch failed: ${res.status}`);
  const data: ExplorerResponse = await res.json();
  if (!data.ok) throw new Error("Explorer API returned not-ok");
  return data.milestones;
}

export function useExplorerMilestones() {
  return useQuery({
    queryKey: ["explorer-milestones"],
    queryFn: fetchExplorer,
    staleTime: 15_000,
  });
}
