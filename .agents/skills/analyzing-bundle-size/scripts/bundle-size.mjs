#!/usr/bin/env node
// Measures the REAL bundle size of app/dist/bundle.js by running the project's
// own build (`npm run build` in app/, i.e. esbuild via app/scripts/build.mjs)
// and stat-ing the emitted file. No estimates, no hardcoded numbers.
//
// Usage (from anywhere):
//   node .agents/skills/analyzing-bundle-size/scripts/bundle-size.mjs
//   node .agents/skills/analyzing-bundle-size/scripts/bundle-size.mjs --json
//   node .agents/skills/analyzing-bundle-size/scripts/bundle-size.mjs --no-build   # reuse existing dist/
//
// Scope guardrails: runs only the project's own npm script, writes nothing
// outside app/dist/ (esbuild does that), makes no network calls.

import { execFileSync } from "node:child_process";
import { gzipSync } from "node:zlib";
import { readFileSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
// scripts/ -> analyzing-bundle-size/ -> skills/ -> .agents/ -> repo root
const repoRoot = path.resolve(scriptDir, "..", "..", "..", "..");
const appDir = path.join(repoRoot, "app");
const bundlePath = path.join(appDir, "dist", "bundle.js");

const args = process.argv.slice(2);
const asJson = args.includes("--json");
const skipBuild = args.includes("--no-build");

function fail(message) {
  console.error(`bundle-size: ${message}`);
  process.exit(1);
}

if (!skipBuild) {
  try {
    // npm is a shell script on Windows -> shell: true; inherit so build errors are visible.
    execFileSync("npm", ["run", "build"], {
      cwd: appDir,
      stdio: asJson ? "ignore" : "inherit",
      shell: process.platform === "win32",
    });
  } catch {
    fail(`\`npm run build\` failed in ${appDir}. Run \`cd app && npm install\` first, then retry.`);
  }
}

let bytes;
try {
  bytes = statSync(bundlePath).size;
} catch {
  fail(`${path.relative(repoRoot, bundlePath)} not found — build did not emit a bundle.`);
}

const source = readFileSync(bundlePath);
const gzipBytes = gzipSync(source, { level: 9 }).byteLength;

// Which widgets are actually in the bundle (they are eagerly imported via
// src/widgets/index.ts, so every registered widget ships).
const widgetNames = [...source.toString("utf8").matchAll(/["'`]([a-z][a-z0-9-]*)["'`]\s*,\s*[A-Za-z_$][\w$]*\s*\)/g)]
  .map((m) => m[1]);
const registered = [...new Set(widgetNames)];

if (asJson) {
  console.log(JSON.stringify({ file: "app/dist/bundle.js", bytes, gzipBytes, registered }, null, 2));
} else {
  console.log("");
  console.log("Bundle size report — app/dist/bundle.js");
  console.log(`  raw (minified) : ${bytes} bytes (${(bytes / 1024).toFixed(2)} KB)`);
  console.log(`  gzipped        : ${gzipBytes} bytes (${(gzipBytes / 1024).toFixed(2)} KB)`);
  console.log(`  widgets bundled: ${registered.length ? registered.join(", ") : "none detected"}`);
  console.log("");
  console.log("  Note: every widget imported in app/src/widgets/index.ts ships in the");
  console.log("  bundle — there is no lazy loading, so each new widget adds to this number.");
  console.log("");
}
