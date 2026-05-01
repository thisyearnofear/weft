import { useQuery } from "@tanstack/react-query";
import type { StatusApiMilestone, StatusApiOverview } from "@/lib/status-api";

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) {
    throw new Error(`Request failed: ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export function useStatusOverview() {
  return useQuery({
    queryKey: ["status-overview"],
    queryFn: () => fetchJson<StatusApiOverview>("/api/status/demo"),
    staleTime: 15_000,
  });
}

export function useStatusMilestone(milestoneHash: string, includeMetadata = true) {
  return useQuery({
    queryKey: ["status-milestone", milestoneHash, includeMetadata],
    queryFn: () => fetchJson<StatusApiMilestone>(`/api/status/milestone/${milestoneHash}?includeMetadata=${includeMetadata ? "1" : "0"}`),
    enabled: !!milestoneHash,
    staleTime: 15_000,
  });
}
