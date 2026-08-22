#!/usr/bin/env node
// Measures the REAL bundle size of the app/ library: runs the project's own
// `npm run build` (esbuild, minified) and reads app/dist/bundle.js from disk.
// Prints raw + gzip sizes. Never guesses — if the build fails, it exits 1.
//
// Usage (any CWD): node .agents/skills/analyzing-bundle-size/scripts/measure-bundle.mjs

import { execSync } from "node:child_process";
import { readFileSync, statSync } from "node:fs";
import { gzipSync } from "node:zlib";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

// Repo root = three levels up from this script (.agents/skills/<skill>/scripts/).
const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "..");
const appDir = join(repoRoot, "app");
const bundlePath = join(appDir, "dist", "bundle.js");

// 1. Run the real build (esbuild bundles src/index.ts -> dist/bundle.js).
execSync("npm run build", { cwd: appDir, stdio: "inherit" });

// 2. Measure the real artifact.
const { size } = statSync(bundlePath);
const gzipped = gzipSync(readFileSync(bundlePath)).length;

// 3. Report.
console.log("");
console.log("Bundle size report (app/dist/bundle.js):");
console.log(`  raw:  ${size} bytes (${(size / 1024).toFixed(2)} KiB)`);
console.log(`  gzip: ${gzipped} bytes (${(gzipped / 1024).toFixed(2)} KiB)`);