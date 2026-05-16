import { useQuery } from "@tanstack/react-query";
import { Address } from "viem";

export interface BuilderPassport {
  ens: string;
  address: Address;
  avatar?: string;
  description?: string;
  email?: string;
  url?: string;
  github?: string;
  twitter?: string;
  weftProjects: string[];
  weftMilestonesVerified: number;
  weftEarnedTotal: number;
  weftCobuilders: string[];
  weftReputationScore: number;
}

function safeJsonParse(v: string): string[] {
  try { return JSON.parse(v || "[]"); } catch { return []; }
}

export function useBuilderPassport(ens: string) {
  return useQuery({
    queryKey: ["builder-passport", ens],
    queryFn: async (): Promise<BuilderPassport> => {
      const name = ens.toLowerCase();
      
      // Use server-side proxy API to avoid CORS
      const res = await fetch(`/api/ens/${encodeURIComponent(name)}`);
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Failed to fetch ENS" }));
        throw new Error(err.error || "ENS not found");
      }
      const data = await res.json();

      return {
        ens: data.ens,
        address: data.address,
        avatar: data.avatar,
        description: data.description,
        email: data.email,
        url: data.url,
        github: data.github,
        twitter: data.twitter,
        weftProjects: safeJsonParse(data.weftProjects),
        weftMilestonesVerified: data.weftMilestonesVerified || 0,
        weftEarnedTotal: data.weftEarnedTotal || 0,
        weftCobuilders: safeJsonParse(data.weftCobuilders),
        weftReputationScore: data.weftReputationScore || 0,
      };
    },
    enabled: !!ens && ens.endsWith(".eth"),
    retry: 1,
  });
}