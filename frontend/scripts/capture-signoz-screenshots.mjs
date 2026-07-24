#!/usr/bin/env node
/**
 * Capture SigNoz dashboard screenshot for /observability preview.
 *
 * Usage:
 *   export NEXT_PUBLIC_SIGNOZ_DASHBOARD_URL='https://<instance>/dashboard/<id>'
 *   node frontend/scripts/capture-signoz-screenshots.mjs
 *
 * Output: frontend/public/signoz/dashboard-preview.png
 */
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(__dirname, "../public/signoz");
const outFile = path.join(outDir, "dashboard-preview.png");
const dashboardUrl =
  process.env.NEXT_PUBLIC_SIGNOZ_DASHBOARD_URL ||
  process.env.SIGNOZ_DASHBOARD_URL ||
  "";

async function main() {
  if (!dashboardUrl) {
    console.error("Set NEXT_PUBLIC_SIGNOZ_DASHBOARD_URL or SIGNOZ_DASHBOARD_URL");
    process.exit(2);
  }

  await mkdir(outDir, { recursive: true });

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto(dashboardUrl, { waitUntil: "networkidle", timeout: 120_000 });
  await page.waitForTimeout(3000);
  await page.screenshot({ path: outFile, fullPage: false });
  await browser.close();

  console.log(`Wrote ${outFile}`);
}

main().catch(async (err) => {
  console.error(err);
  process.exit(1);
});
