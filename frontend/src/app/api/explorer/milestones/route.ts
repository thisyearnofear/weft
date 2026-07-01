import { NextResponse } from "next/server";
import { fetchWithTimeout } from "@/lib/fetchWithTimeout";

const DEFAULT_STATUS_API = process.env.WEFT_STATUS_API_URL || "http://127.0.0.1:9010";

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

function deriveState(m: {
  finalized: boolean;
  verified: boolean;
  released: boolean;
}): { state: "pending" | "verified" | "failed"; statusLabel: string } {
  if (m.verified && m.released) return { state: "verified", statusLabel: "Released" };
  if (m.verified && m.finalized) return { state: "verified", statusLabel: "Verified" };
  if (m.finalized && !m.verified) return { state: "failed", statusLabel: "Refundable" };
  return { state: "pending", statusLabel: "Pending" };
}

export async function GET() {
  try {
    // Step 1: get known milestone hashes from the status API overview
    const overviewRes = await fetchWithTimeout(`${DEFAULT_STATUS_API}/demo`, { cache: "no-store" });
    if (!overviewRes.ok) {
      return NextResponse.json(
        { ok: false, error: "status_api_unavailable", detail: `overview returned ${overviewRes.status}` },
        { status: 502 }
      );
    }
    const overview = await overviewRes.json();
    const hashes: string[] = overview?.demoHints?.milestones ?? [];

    if (hashes.length === 0) {
      return NextResponse.json({ ok: true, milestones: [], count: 0 });
    }

    // Step 2: fetch each milestone's details in parallel
    const milestoneResults = await Promise.allSettled(
      hashes.map(async (hash) => {
        const res = await fetchWithTimeout(`${DEFAULT_STATUS_API}/milestone/${hash}`, { cache: "no-store" });
        if (!res.ok) throw new Error(`Failed to fetch ${hash}: ${res.status}`);
        const data = await res.json();
        const stakedEth = (Number(data.totalStaked) / 1e18).toFixed(4);
        const { state, statusLabel } = deriveState(data);
        return {
          milestoneHash: data.milestoneHash ?? hash,
          projectId: data.projectId,
          templateId: data.templateId,
          metadataHash: data.metadataHash,
          builder: data.builder,
          builderEns: data?.demo?.tracks?.ens?.builderEns ?? null,
          createdAt: data.createdAt,
          deadline: data.deadline,
          totalStaked: data.totalStaked,
          stakedEth,
          finalized: data.finalized,
          verified: data.verified,
          released: data.released,
          verifierCount: data.verifierCount,
          verifiedVotes: data.verifiedVotes,
          finalEvidenceRoot: data.finalEvidenceRoot,
          state,
          statusLabel,
        } as ExplorerMilestone;
      })
    );

    const milestones = milestoneResults
      .filter((r): r is PromiseFulfilledResult<ExplorerMilestone> => r.status === "fulfilled")
      .map((r) => r.value);

    return NextResponse.json(
      { ok: true, milestones, count: milestones.length },
      { headers: { "cache-control": "public, s-maxage=30, stale-while-revalidate=60" } }
    );
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: "explorer_fetch_failed", detail: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
