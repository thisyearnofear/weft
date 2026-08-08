import { useQuery } from "@tanstack/react-query";
import { fetchJsonWithRetry } from "@/lib/fetchWithTimeout";
import { queryDefaults, STALE_TIMES } from "@/lib/queryConfig";

export interface MilestoneMetadataResponse {
  ok: boolean;
  metadata?: Record<string, unknown>;
  error?: string;
  detail?: string;
}

export function useMilestoneMetadata(metadataHash: string | undefined) {
  return useQuery({
    queryKey: ["milestone-metadata", metadataHash],
    queryFn: async () => {
      if (!metadataHash) return null;
      const data = await fetchJsonWithRetry<MilestoneMetadataResponse>(
        `/api/milestone-metadata/${encodeURIComponent(metadataHash)}`
      );
      if (!data.ok) {
        throw new Error(data.error || "metadata_fetch_failed");
      }
      return data;
    },
    enabled: !!metadataHash,
    staleTime: STALE_TIMES.status,
    ...queryDefaults,
  });
}
