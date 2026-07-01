import { NextResponse } from "next/server";
import { fetchJsonWithTimeout } from "@/lib/fetchWithTimeout";

const STATUS_API = process.env.WEFT_STATUS_API_URL || "http://127.0.0.1:9010";

async function fetchJson(url: string): Promise<Record<string, unknown>> {
  return fetchJsonWithTimeout(url);
}

interface SponsorMilestone {
  milestoneHash: string;
  projectId: string;
  builder: string;
  builderEns: string | null;
  totalStaked: string;
  stakedEth: string;
  finalized: boolean;
  verified: boolean;
  released: boolean;
  verifierCount: number;
  verifiedVotes: number;
  finalEvidenceRoot: string;
  createdAt: number;
  deadline: number;
  capitalStatus: "locked" | "released" | "refundable";
  timeToVerdict: number | null;
}

export async function GET() {
  try {
    const overview = await fetchJson(`${STATUS_API}/demo`);
    const demoHints = overview?.demoHints as Record<string, unknown> | undefined;
    const hashes = (demoHints?.milestones as string[]) ?? [];

    const milestoneResults = await Promise.allSettled(
      hashes.map((hash) => fetchJson(`${STATUS_API}/milestone/${hash}`))
    );

    const milestones: SponsorMilestone[] = milestoneResults
      .filter((r): r is PromiseFulfilledResult<Record<string, unknown>> => r.status === "fulfilled")
      .map((r) => {
        const d = r.value;
        const verified = Boolean(d.verified);
        const released = Boolean(d.released);
        const finalized = Boolean(d.finalized);
        const createdAt = Number(d.createdAt ?? 0);
        const deadline = Number(d.deadline ?? 0);
        const capitalStatus = released ? "released" : finalized && !verified ? "refundable" : "locked";
        const timeToVerdict = finalized && createdAt ? deadline - createdAt : null;
        const demoData = d.demo as Record<string, unknown> | undefined;
        const tracks = demoData?.tracks as Record<string, unknown> | undefined;
        const ens = tracks?.ens as Record<string, unknown> | undefined;

        return {
          milestoneHash: String(d.milestoneHash ?? ""),
          projectId: String(d.projectId ?? ""),
          builder: String(d.builder ?? ""),
          builderEns: (ens?.builderEns as string) ?? null,
          totalStaked: String(d.totalStaked ?? "0"),
          stakedEth: (Number(d.totalStaked) / 1e18).toFixed(4),
          finalized,
          verified,
          released,
          verifierCount: Number(d.verifierCount ?? 0),
          verifiedVotes: Number(d.verifiedVotes ?? 0),
          finalEvidenceRoot: String(d.finalEvidenceRoot ?? ""),
          createdAt,
          deadline,
          capitalStatus,
          timeToVerdict,
        };
      });

    const totalLocked = milestones
      .filter((m) => m.capitalStatus === "locked")
      .reduce((sum, m) => sum + Number(m.stakedEth), 0);
    const totalReleased = milestones
      .filter((m) => m.capitalStatus === "released")
      .reduce((sum, m) => sum + Number(m.stakedEth), 0);
    const totalRefundable = milestones
      .filter((m) => m.capitalStatus === "refundable")
      .reduce((sum, m) => sum + Number(m.stakedEth), 0);

    return NextResponse.json({
      ok: true,
      milestones,
      summary: {
        totalMilestones: milestones.length,
        totalLocked: totalLocked.toFixed(4),
        totalReleased: totalReleased.toFixed(4),
        totalRefundable: totalRefundable.toFixed(4),
        verifiedCount: milestones.filter((m) => m.verified).length,
        releasedCount: milestones.filter((m) => m.released).length,
      },
    }, { headers: { "cache-control": "no-store" } });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: "sponsor_fetch_failed", detail: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
