import { NextRequest, NextResponse } from "next/server";
import { fetchWithTimeout } from "@/lib/fetchWithTimeout";

const STATUS_API = process.env.WEFT_STATUS_API_URL || "http://127.0.0.1:9010";

export async function GET(req: NextRequest) {
  const since = req.nextUrl.searchParams.get("since") || "0";
  try {
    const res = await fetchWithTimeout(`${STATUS_API}/recovery?since=${since}`, { cache: "no-store" });
    const text = await res.text();
    return new NextResponse(text, {
      status: res.status,
      headers: { "content-type": "application/json", "cache-control": "no-store" },
    });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: "status_api_unavailable", detail: error instanceof Error ? error.message : String(error) },
      { status: 502 }
    );
  }
}
