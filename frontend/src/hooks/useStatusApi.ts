import { useQuery } from "@tanstack/react-query";
import { fetchJsonWithRetry } from "@/lib/fetchWithTimeout";
import { queryDefaults, STALE_TIMES } from "@/lib/queryConfig";
import type { StatusApiMilestone, StatusApiOverview, TreasuryPayload } from "@/lib/status-api";

export function useStatusOverview() {
  return useQuery({
    queryKey: ["status-overview"],
    queryFn: () => fetchJsonWithRetry<StatusApiOverview>("/api/status/demo"),
    staleTime: STALE_TIMES.status,
    ...queryDefaults,
  });
}

export function useStatusMilestone(milestoneHash: string, includeMetadata = true) {
  return useQuery({
    queryKey: ["status-milestone", milestoneHash, includeMetadata],
    queryFn: () => fetchJsonWithRetry<StatusApiMilestone>(`/api/status/milestone/${milestoneHash}?includeMetadata=${includeMetadata ? "1" : "0"}`),
    enabled: !!milestoneHash,
    staleTime: STALE_TIMES.status,
    ...queryDefaults,
  });
}

export function useTreasury() {
  return useQuery({
    queryKey: ["treasury"],
    queryFn: () => fetchJsonWithRetry<TreasuryPayload>("/api/treasury"),
    staleTime: STALE_TIMES.treasury,
    ...queryDefaults,
  });
}
