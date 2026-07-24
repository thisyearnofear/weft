#!/usr/bin/env node
import { copyFileSync, existsSync, mkdirSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const root = new URL("..", import.meta.url).pathname;
const publicDir = join(root, "public", "zama");

const outputs = {
  "relayer-sdk-js.umd.js": ["relayer-sdk-js.umd.cjs", "relayer-sdk-js.umd.js"],
  "tfhe_bg.wasm": ["tfhe_bg.wasm"],
  "kms_lib_bg.wasm": ["kms_lib_bg.wasm"],
  "workerHelpers.js": ["workerHelpers.js"],
};

function walk(dir) {
  const out = [];
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry);
    const stat = statSync(path);
    if (stat.isDirectory()) out.push(...walk(path));
    else out.push(path);
  }
  return out;
}

function findSource(files, names) {
  return files.find((file) => names.includes(file.split("/").pop()));
}

function publicAssetsReady() {
  return Object.keys(outputs).every((name) => existsSync(join(publicDir, name)));
}

let packageRoot = "";
try {
  packageRoot = require.resolve("@zama-fhe/relayer-sdk/package.json").replace(/package\.json$/, "");
} catch {
  if (publicAssetsReady()) {
    console.log("Zama SDK package missing; using existing public/zama assets.");
    process.exit(0);
  }
  console.error("Missing @zama-fhe/relayer-sdk and public/zama assets. Run npm ci with network access.");
  process.exit(1);
}

mkdirSync(publicDir, { recursive: true });

const files = walk(packageRoot);
const missing = [];

for (const [target, names] of Object.entries(outputs)) {
  const source = findSource(files, names);
  if (!source) {
    missing.push(names.join(" or "));
    continue;
  }
  copyFileSync(source, join(publicDir, target));
  console.log(`Copied ${relative(root, source)} -> public/zama/${target}`);
}

if (missing.length > 0) {
  if (publicAssetsReady()) {
    console.warn(`Zama SDK layout missing ${missing.join(", ")}; kept existing public/zama assets.`);
    process.exit(0);
  }
  console.error(`Zama SDK layout missing required assets: ${missing.join(", ")}`);
  process.exit(1);
}
