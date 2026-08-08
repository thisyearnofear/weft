import { NextRequest, NextResponse } from "next/server";
import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

export const runtime = "nodejs";

const ZERO_ROOT = "0x" + "0".repeat(64);

export interface MilestoneMetadataResponse {
  ok: boolean;
  metadata?: Record<string, unknown>;
  error?: string;
  detail?: string;
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ hash: string }> }
) {
  const { hash } = await params;
  const indexer = process.env.ZERO_G_INDEXER_RPC || process.env.ZERO_G_INDEXER_URL || "";
  const evmRpc = process.env.ZERO_G_EVM_RPC_URL || process.env.ETH_RPC_URL || "";

  if (!hash || hash === ZERO_ROOT || hash === "0".repeat(64)) {
    return NextResponse.json(
      { ok: false, error: "invalid_hash" } as MilestoneMetadataResponse,
      { status: 400 }
    );
  }

  if (!indexer) {
    return NextResponse.json(
      { ok: false, error: "missing_indexer" } as MilestoneMetadataResponse,
      { status: 500 }
    );
  }

  const tmpDir = mkdtempSync(path.join(tmpdir(), "weft-metadata-"));
  try {
    const filePath = path.join(tmpDir, "metadata.json");
    const result = spawnSync(
      "0g-storage-client",
      ["download", "--url", evmRpc, "--indexer", indexer, "--root", hash, "--file", filePath],
      { encoding: "utf-8", timeout: 15_000 }
    );

    if (result.error) {
      return NextResponse.json(
        { ok: false, error: "client_not_found", detail: result.error.message } as MilestoneMetadataResponse,
        { status: 500 }
      );
    }

    if (result.status !== 0) {
      return NextResponse.json(
        {
          ok: false,
          error: "download_failed",
          detail: result.stderr || result.stdout,
        } as MilestoneMetadataResponse,
        { status: 502 }
      );
    }

    const raw = readFileSync(filePath, "utf-8");
    const metadata = JSON.parse(raw) as Record<string, unknown>;

    return NextResponse.json({ ok: true, metadata } as MilestoneMetadataResponse);
  } catch (err) {
    return NextResponse.json(
      {
        ok: false,
        error: "parse_error",
        detail: err instanceof Error ? err.message : String(err),
      } as MilestoneMetadataResponse,
      { status: 500 }
    );
  } finally {
    try {
      rmSync(tmpDir, { recursive: true, force: true });
    } catch {
      // ignore cleanup errors
    }
  }
}
