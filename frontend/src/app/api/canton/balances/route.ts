import { NextRequest, NextResponse } from "next/server";

const STATUS =
  process.env.CANTON_API_URL ||
  process.env.NEXT_PUBLIC_CANTON_API_URL ||
  process.env.STATUS_API_URL ||
  process.env.NEXT_PUBLIC_STATUS_API_URL ||
  "http://127.0.0.1:9020";

export async function GET(req: NextRequest) {
  const party = req.nextUrl.searchParams.get("party") || "";
  const qs = party ? `?party=${encodeURIComponent(party)}` : "";
  try {
    const res = await fetch(`${STATUS}/canton/balances${qs}`, { cache: "no-store" });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: "canton_api_unreachable", detail: String(e) },
      { status: 503 },
    );
  }
}
