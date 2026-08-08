#!/usr/bin/env node
/**
 * Capture production screenshots for the KeeperHub demo video.
 *
 * Usage: npm run capture
 * Output: assets/*.png
 */
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const assets = path.join(root, "assets");

const MILESTONE =
  "0x709ab5f0c3ddd703a9ce74a4156840204df267bc5812dbdbb96e1eafd4d" +
  "99891";
const STAKE_TX =
  "0xd27b96ed9ee32147e44c5fa8ce546e4798dfc4aff63ed8876994499baaf" +
  "0138e";
const VERDICT_TX =
  "0x4348599a0c6eec130b03dd6ec5806488651734aadbc5623d2da4d2559a" +
  "09157d";

const shots = [
  {
    name: "project-keeperhub",
    url: `https://weft.thisyearnofear.com/project/${MILESTONE}`,
    waitMs: 4000,
    fullPage: false,
  },
  {
    name: "chainscan-verdict-tx",
    url: `https://chainscan-galileo.0g.ai/tx/${VERDICT_TX}`,
    waitMs: 5000,
    fullPage: false,
  },
  {
    name: "chainscan-stake-tx",
    url: `https://chainscan-galileo.0g.ai/tx/${STAKE_TX}`,
    waitMs: 5000,
    fullPage: false,
  },
  {
    name: "recovery-dashboard",
    url: "https://weft.thisyearnofear.com/recovery",
    waitMs: 3000,
    fullPage: false,
  },
];

async function main() {
  await mkdir(assets, { recursive: true });

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

  for (const shot of shots) {
    const out = path.join(assets, `${shot.name}.png`);
    console.log(`Capturing ${shot.name}…`);
    try {
      await page.goto(shot.url, { waitUntil: "domcontentloaded", timeout: 90_000 });
      await page.waitForTimeout(shot.waitMs);
      await page.screenshot({ path: out, fullPage: shot.fullPage });
      console.log(`  → ${out}`);
    } catch (err) {
      console.warn(`  ⚠ failed ${shot.name}: ${err.message}`);
    }
  }

  await browser.close();
  console.log("Done.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
