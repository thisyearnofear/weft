import { NextResponse } from "next/server";

const DEFAULT_STATUS_API = process.env.WEFT_STATUS_API_URL || "http://127.0.0.1:9010";

async function fetchJson(url: string): Promise<Record<string, unknown>> {
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`${url} returned ${res.status}`);
  return res.json();
}

interface OperationsResponse {
  ok: boolean;
  treasury: {
    activated: boolean;
    earned: number;
    spent: number;
    net: number;
    profitable: boolean;
    spendByService: Record<string, number>;
    chargeCount: number;
    balance: { available: number | null; pending: number | null } | null;
    recentCharges: Array<{
      id: string;
      service: string;
      amount: number;
      memo: string;
      created: number;
    }>;
  } | null;
  recovery: {
    totalEvents: number;
    failures: number;
    recoveries: number;
    verdictLanded: boolean;
    chaosActive: string[];
    recentEvents: unknown[];
  } | null;
  verifications: Array<{
    milestoneHash: string;
    verified: boolean;
    released: boolean;
    verifierCount: number;
    verifiedVotes: number;
    finalEvidenceRoot: string;
    builderEns: string | null;
    stakedEth: string;
    statusLabel: string;
    deadline: number;
  }>;
  overview: {
    pitch: string;
    totalMilestones: number;
    verifiedCount: number;
    totalStakedEth: number;
  } | null;
}

export async function GET() {
  try {
    // Fetch all data sources in parallel
    const [treasuryRes, recoveryRes, overviewRes] = await Promise.allSettled([
      fetchJson(`${DEFAULT_STATUS_API}/treasury`),
      fetchJson(`${DEFAULT_STATUS_API}/recovery`),
      fetchJson(`${DEFAULT_STATUS_API}/demo`),
    ]);

    const treasury =
      treasuryRes.status === "fulfilled"
        ? (treasuryRes.value as OperationsResponse["treasury"])
        : null;

    const recoveryRaw =
      recoveryRes.status === "fulfilled" ? recoveryRes.value : null;
    const recoverySummary = recoveryRaw?.summary as Record<string, unknown> | undefined;
    const recoveryChaos = recoveryRaw?.chaos as Record<string, unknown> | undefined;
    const recovery = recoveryRaw
      ? {
          totalEvents: Number(recoverySummary?.totalEvents ?? 0),
          failures: Number(recoverySummary?.failures ?? 0),
          recoveries: Number(recoverySummary?.recoveries ?? 0),
          verdictLanded: Boolean(recoverySummary?.verdictLanded),
          chaosActive: Array.isArray(recoveryChaos?.active)
            ? (recoveryChaos.active as string[])
            : [],
          recentEvents: Array.isArray(recoveryRaw.events)
            ? (recoveryRaw.events as unknown[]).slice(0, 20)
            : [],
        }
      : null;

    const overviewRaw =
      overviewRes.status === "fulfilled" ? overviewRes.value : null;

    // Fetch milestone details for verification log
    const demoHints = overviewRaw?.demoHints as Record<string, unknown> | undefined;
    const milestoneHashes: string[] =
      (demoHints?.milestones as string[]) ?? [];

    const milestoneResults = await Promise.allSettled(
      milestoneHashes.map((hash) =>
        fetchJson(`${DEFAULT_STATUS_API}/milestone/${hash}`)
      )
    );

    const verifications = milestoneResults
      .filter((r): r is PromiseFulfilledResult<Record<string, unknown>> => r.status === "fulfilled")
      .map((r) => {
        const d = r.value;
        const verified = Boolean(d.verified);
        const released = Boolean(d.released);
        const finalized = Boolean(d.finalized);
        const statusLabel = verified && released ? "Released" : verified && finalized ? "Verified" : finalized && !verified ? "Refundable" : "Pending";
        return {
          milestoneHash: String(d.milestoneHash ?? ""),
          verified,
          released,
          verifierCount: Number(d.verifierCount ?? 0),
          verifiedVotes: Number(d.verifiedVotes ?? 0),
          finalEvidenceRoot: String(d.finalEvidenceRoot ?? ""),
          builderEns: ((d.demo as Record<string, unknown>)?.tracks as Record<string, unknown>)?.ens
            ? (((d.demo as Record<string, unknown>).tracks as Record<string, unknown>).ens as Record<string, unknown>).builderEns as string
            : null,
          stakedEth: (Number(d.totalStaked) / 1e18).toFixed(4),
          statusLabel,
          deadline: Number(d.deadline ?? 0),
        };
      });

    const verifiedCount = verifications.filter((v) => v.verified).length;
    const totalStakedEth = verifications.reduce(
      (sum, v) => sum + Number(v.stakedEth),
      0
    );

    const overview = overviewRaw
      ? {
          pitch: String(overviewRaw.pitch ?? ""),
          totalMilestones: verifications.length,
          verifiedCount,
          totalStakedEth,
        }
      : null;

    const response: OperationsResponse = {
      ok: true,
      treasury,
      recovery,
      verifications,
      overview,
    };

    return NextResponse.json(response, {
      headers: { "cache-control": "no-store" },
    });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: "operations_fetch_failed", detail: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
