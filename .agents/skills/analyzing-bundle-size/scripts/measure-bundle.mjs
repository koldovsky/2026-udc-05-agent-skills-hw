#!/usr/bin/env node
// Measures the REAL bundle: runs the project's own `npm run build` in app/,
// then reads app/dist/bundle.js off disk. Nothing here estimates or guesses —
// if the build fails, this exits non-zero instead of printing a number.
//
// Usage — any cwd, and either skill copy (.agents/skills/… or the
// .claude/skills/ mirror); paths are resolved from this file, not the cwd:
//   node <skill-dir>/scripts/measure-bundle.mjs
//   node <skill-dir>/scripts/measure-bundle.mjs --baseline=937  # delta vs. a previous run
//   node <skill-dir>/scripts/measure-bundle.mjs --json          # machine-readable
//
// Writes nothing itself; the only file touched is app/dist/bundle.js, written
// by the project's own build script.

import { execSync } from "node:child_process";
import { existsSync, readFileSync, statSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { gzipSync } from "node:zlib";

const args = process.argv.slice(2);
const asJson = args.includes("--json");
const baselineArg = args.find((a) => a.startsWith("--baseline="));
// Number("") is 0 rather than NaN, so an empty value has to be caught by hand —
// otherwise `--baseline=` silently means "compare against 0 bytes".
const baselineRaw = baselineArg ? baselineArg.slice("--baseline=".length) : null;
const baseline = baselineRaw && baselineRaw.trim() !== "" ? Number(baselineRaw) : null;

if (baselineArg && !(Number.isFinite(baseline) && baseline >= 0)) {
  fail(`--baseline needs a number of bytes, got "${baselineRaw}"`);
}

// Walk up from this script until we find the app/ workspace. Works from any cwd,
// and from either skill copy (.agents/skills/… or the .claude/skills/ mirror).
const appDir = findAppDir(dirname(fileURLToPath(import.meta.url)));
if (!appDir) fail("could not locate app/package.json above this script");

if (!existsSync(join(appDir, "node_modules"))) {
  fail(`dependencies are not installed — run \`npm install\` in ${appDir} first`);
}

// 1. Run the real command. A fixed string through the shell, so `npm` resolves
//    to npm.cmd on Windows; output is captured so a build failure is reported
//    rather than swallowed.
try {
  execSync("npm run build", {
    cwd: appDir,
    stdio: ["ignore", "pipe", "pipe"],
    encoding: "utf8",
  });
} catch (err) {
  process.stderr.write(String(err.stdout ?? "") + String(err.stderr ?? ""));
  fail("`npm run build` failed — fix the build before trusting any size number");
}

// 2. Measure real bytes on disk.
const bundlePath = join(appDir, "dist", "bundle.js");
if (!existsSync(bundlePath)) fail(`build reported success but ${bundlePath} is missing`);

const raw = statSync(bundlePath).size;
const gzipped = gzipSync(readFileSync(bundlePath)).length;

// 3. Ask the built bundle what it actually registered — the same module graph a
//    consumer gets, so this catches a widget that never made it into the barrel.
const mod = await import(pathToFileURL(bundlePath).href);
const widgets = typeof mod.listWidgets === "function" ? mod.listWidgets() : [];
const exports = Object.keys(mod).sort();

const report = {
  bundle: "app/dist/bundle.js",
  raw,
  gzipped,
  widgets,
  exports,
  perWidget: widgets.length ? Math.round(raw / widgets.length) : null,
  baseline,
  delta: baseline === null ? null : raw - baseline,
};

if (asJson) {
  console.log(JSON.stringify(report, null, 2));
} else {
  // A percentage of a 0 B baseline is undefined, so the delta is shown alone.
  const pct = baseline > 0 ? ((report.delta / baseline) * 100).toFixed(1) : null;
  console.log(`Bundle report — ${report.bundle}`);
  console.log("");
  console.log(`  raw         ${raw} B`);
  console.log(`  gzipped     ${gzipped} B`);
  console.log(`  exports     ${exports.join(", ")}`);
  console.log(`  widgets     ${widgets.length}  (${widgets.join(", ") || "none"})`);
  if (report.perWidget !== null) console.log(`  per widget  ~${report.perWidget} B raw (average)`);
  if (baseline !== null) {
    const sign = report.delta >= 0 ? "+" : "";
    const pctText = pct === null ? "" : ` (${sign}${pct}%)`;
    console.log("");
    console.log(`  baseline    ${baseline} B → ${sign}${report.delta} B${pctText}`);
  }
}

function findAppDir(startDir) {
  let dir = resolve(startDir);
  for (let i = 0; i < 8; i++) {
    const candidate = join(dir, "app");
    if (existsSync(join(candidate, "package.json"))) return candidate;
    const parent = dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return null;
}

function fail(message) {
  console.error(`measure-bundle: ${message}`);
  process.exit(1);
}