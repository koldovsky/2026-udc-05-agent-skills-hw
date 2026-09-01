#!/usr/bin/env node
// Reports the REAL size of the app/ bundle: runs the project's own
// `npm run build` (esbuild: src/index.ts -> dist/bundle.js, minified) and
// measures the produced file. Never estimates or guesses a number.
//
// Usage:
//   node .agents/skills/analyzing-bundle-size/scripts/measure-bundle.mjs
//   node .agents/skills/analyzing-bundle-size/scripts/measure-bundle.mjs --baseline=1234
//   node .agents/skills/analyzing-bundle-size/scripts/measure-bundle.mjs --json
//   node .agents/skills/analyzing-bundle-size/scripts/measure-bundle.mjs --skip-build
//
// Safe by design: no network calls, no deletions, writes nothing outside
// app/dist/ (and only via the project's own build script).

import { execFileSync } from "node:child_process";
import { gzipSync } from "node:zlib";
import { readFileSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const args = process.argv.slice(2);
const has = (flag) => args.includes(flag);
const asJson = has("--json");
const skipBuild = has("--skip-build");
const baselineArg = args.find((a) => a.startsWith("--baseline="));
const baseline = baselineArg ? Number(baselineArg.split("=")[1]) : null;

if (baselineArg && (!Number.isFinite(baseline) || baseline < 0)) {
  console.error(`Invalid --baseline value: ${baselineArg.split("=")[1]} (expected bytes, e.g. --baseline=1234)`);
  process.exit(2);
}

// Resolve app/ from this script's location so the cwd does not matter.
const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, "../../../..");
const appDir = path.join(repoRoot, "app");
const bundlePath = path.join(appDir, "dist", "bundle.js");
const entryPath = path.join(appDir, "src", "index.ts");

if (!skipBuild) {
  if (!asJson) console.log("Running `npm run build` in app/ ...");
  try {
    execFileSync("npm", ["run", "build"], {
      cwd: appDir,
      stdio: asJson ? "ignore" : "inherit",
    });
  } catch (error) {
    console.error("Build failed — no size to report. Fix the build first.");
    console.error(String(error.message ?? error));
    process.exit(1);
  }
}

let stats;
try {
  stats = statSync(bundlePath);
} catch {
  console.error(`Bundle not found at ${bundlePath}. Run without --skip-build, or check app/scripts/build.mjs.`);
  process.exit(1);
}

const contents = readFileSync(bundlePath);
const rawBytes = stats.size;
const gzipBytes = gzipSync(contents, { level: 9 }).byteLength;
const sourceBytes = statSync(entryPath).size;
const kb = (bytes) => (bytes / 1024).toFixed(2);

const report = {
  bundle: path.relative(repoRoot, bundlePath),
  builtAt: stats.mtime.toISOString(),
  rawBytes,
  gzipBytes,
  ...(baseline !== null
    ? { baselineBytes: baseline, deltaBytes: rawBytes - baseline }
    : {}),
};

if (asJson) {
  console.log(JSON.stringify(report, null, 2));
} else {
  console.log("");
  console.log("Bundle size report");
  console.log("------------------");
  console.log(`file       : ${report.bundle}`);
  console.log(`built at   : ${report.builtAt}`);
  console.log(`minified   : ${rawBytes} bytes (${kb(rawBytes)} KB)`);
  console.log(`gzipped    : ${gzipBytes} bytes (${kb(gzipBytes)} KB)`);
  console.log(`entry src  : app/src/index.ts (${sourceBytes} bytes, pre-bundle)`);
  if (baseline !== null) {
    const delta = rawBytes - baseline;
    const sign = delta > 0 ? "+" : "";
    const pct = baseline > 0 ? ` (${sign}${((delta / baseline) * 100).toFixed(1)}%)` : "";
    console.log(`baseline   : ${baseline} bytes`);
    console.log(`delta      : ${sign}${delta} bytes${pct}`);
  }
  console.log("");
  console.log("Numbers above are measured from the real build output, not estimated.");
}

