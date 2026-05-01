import { NextResponse } from "next/server";

const DEFAULT_STATUS_API = process.env.WEFT_STATUS_API_URL || "http://127.0.0.1:9010";

async function proxy(path: string) {
  const url = `${DEFAULT_STATUS_API}${path}`;
  const res = await fetch(url, { cache: "no-store" });
  const text = await res.text();
  return new NextResponse(text, {
    status: res.status,
    headers: {
      "content-type": res.headers.get("content-type") || "application/json",
      "cache-control": "no-store",
    },
  });
}

export async function GET() {
  try {
    return await proxy("/demo");
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: "status_api_unavailable", detail: error instanceof Error ? error.message : String(error) },
      { status: 502 }
    );
  }
}
