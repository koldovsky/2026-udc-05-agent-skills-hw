#!/usr/bin/env node
// Measures the REAL bundle size of the app/ library: runs the project's own
// `npm run build` (esbuild, minified) and reads app/dist/bundle.js from disk.
// Prints raw + gzip sizes. Never guesses — if the build fails, it exits 1
// with an actionable message instead of a stack trace.
//
// Usage (any CWD):
//   node .agents/skills/analyzing-bundle-size/scripts/measure-bundle.mjs
//   node .agents/skills/analyzing-bundle-size/scripts/measure-bundle.mjs --json
//
// --json prints a single machine-readable line: {"raw":<bytes>,"gzip":<bytes>}

import { execSync } from "node:child_process";
import { existsSync, readFileSync, statSync } from "node:fs";
import { gzipSync } from "node:zlib";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const asJson = process.argv.includes("--json");

// Repo root = four levels up from this script (.agents/skills/<skill>/scripts/).
const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "..");
const appDir = join(repoRoot, "app");
const bundlePath = join(appDir, "dist", "bundle.js");

if (!existsSync(join(appDir, "node_modules"))) {
  console.error("app/node_modules is missing — run 'cd app && npm install' first.");
  process.exit(1);
}

// 1. Run the real build (esbuild bundles src/index.ts -> dist/bundle.js).
try {
  execSync("npm run build", { cwd: appDir, stdio: asJson ? "pipe" : "inherit" });
} catch (err) {
  console.error("Build failed — fix the build before measuring. Underlying error:");
  console.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
}

if (!existsSync(bundlePath)) {
  console.error(`Build reported success but ${bundlePath} does not exist.`);
  process.exit(1);
}

// 2. Measure the real artifact.
const { size } = statSync(bundlePath);
const gzipped = gzipSync(readFileSync(bundlePath)).length;

// 3. Report.
if (asJson) {
  console.log(JSON.stringify({ raw: size, gzip: gzipped }));
} else {
  console.log("");
  console.log("Bundle size report (app/dist/bundle.js):");
  console.log(`  raw:  ${size} bytes (${(size / 1024).toFixed(2)} KiB)`);
  console.log(`  gzip: ${gzipped} bytes (${(gzipped / 1024).toFixed(2)} KiB)`);
}