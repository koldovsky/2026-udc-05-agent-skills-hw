#!/usr/bin/env node
// Measures the real bundle produced by `npm run build` in app/, and what each
// widget costs inside it. Never estimates: the headline number comes from the
// build this script just ran, the per-widget numbers from ablation builds.
//
// Usage:  node .agents/skills/analyzing-bundle-size/scripts/measure-bundle.mjs [flags]
//   --json            machine-readable report on stdout, nothing else
//   --budget <bytes>  raw-byte ceiling; exceeding it exits 1
//   --skip-build      reuse the existing dist/bundle.js instead of rebuilding
//   --help            this text
// Exit codes: 0 measured, 1 budget exceeded, 2 build or setup failure.

import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, readFileSync, statSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { gzipSync } from "node:zlib";

// Resolved from this file, not from cwd — the agent may invoke it from anywhere.
const APP_DIR = resolve(dirname(fileURLToPath(import.meta.url)), "../../../../app");
const BUNDLE = join(APP_DIR, "dist/bundle.js");

function fail(message) {
  console.error(`measure-bundle: ${message}`);
  process.exit(2);
}

function parseArgs(argv) {
  const flags = { json: false, budget: null, skipBuild: false };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--json") flags.json = true;
    else if (arg === "--skip-build") flags.skipBuild = true;
    else if (arg === "--budget") {
      // Digits and nothing else: Number.parseInt would happily read "2000B" as
      // 2000 and silently enforce a ceiling the caller never asked for.
      const raw = argv[(i += 1)];
      if (!/^\d+$/.test(raw ?? "") || Number(raw) <= 0 || !Number.isSafeInteger(Number(raw))) {
        fail(`--budget needs a whole positive byte count, e.g. --budget 2000 (got ${raw ?? "nothing"})`);
      }
      flags.budget = Number(raw);
    } else if (arg === "--help" || arg === "-h") {
      // The header comment of this file IS the help text — one source, no drift.
      const header = readFileSync(fileURLToPath(import.meta.url), "utf8").split("\n").slice(1, 12);
      console.log(header.map((line) => line.replace(/^\/\/ ?/, "")).join("\n"));
      process.exit(0);
    } else fail(`unknown flag ${arg} (try --help)`);
  }
  return flags;
}

function sizes(buffer) {
  return { raw: buffer.byteLength, gzip: gzipSync(buffer, { level: 9 }).byteLength };
}

const sha256 = (buffer) => createHash("sha256").update(buffer).digest("hex");

function runRealBuild() {
  const npm = process.platform === "win32" ? "npm.cmd" : "npm";
  try {
    execFileSync(npm, ["run", "build"], { cwd: APP_DIR, stdio: ["ignore", "ignore", "inherit"] });
  } catch (error) {
    fail(`\`npm run build\` failed in ${APP_DIR} (${error.message})`);
  }
}

// Ablation is the app's own job — `npm run ablate` (app/scripts/ablate.mjs)
// owns the esbuild work and the widget set, so this script never bundles
// anything itself; it wraps the project's npm scripts and formats the result.
function measureWidgets(shipped) {
  const npm = process.platform === "win32" ? "npm.cmd" : "npm";
  let report;
  try {
    const stdout = execFileSync(npm, ["run", "--silent", "ablate"], {
      cwd: APP_DIR,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    });
    report = JSON.parse(stdout);
  } catch (error) {
    // npm/node stderr is a stack trace; report the one line that says what broke.
    const lines = (error.stderr || error.message || "").split("\n").map((l) => l.trim()).filter(Boolean);
    const gist = lines.find((line) => /error/i.test(line)) ?? lines.at(-1) ?? "no output";
    throw new Error(`\`npm run ablate\` failed: ${gist.slice(0, 200)}`);
  }

  // The un-ablated build must reproduce the shipped bundle byte for byte. If it
  // does not, either app/scripts/ has changed how it builds or dist/bundle.js is
  // stale (--skip-build) — either way the marginal numbers describe a build
  // nobody ships.
  return {
    widgets: report.widgets,
    baseline: report.baseline,
    syntheticRaw: report.full.raw,
    syntheticHash: report.full.hash,
    shippedHash: shipped.hash,
    trusted: report.full.hash === shipped.hash,
  };
}

function driftReason(attribution, shipped, built) {
  const sizeNote =
    attribution.syntheticRaw === shipped.raw
      ? `same size (${shipped.raw} B), different bytes`
      : `synthetic ${attribution.syntheticRaw} B != shipped ${shipped.raw} B`;
  const cause = built
    ? "app/scripts/ablate.mjs no longer reproduces what app/scripts/build.mjs writes"
    : "dist/bundle.js is stale (--skip-build), or app/scripts/ablate.mjs no longer reproduces what app/scripts/build.mjs writes";
  return `  attribution check: ${sizeNote} — ${cause}; fix that and re-run before quoting the table above`;
}

function printReport({ shipped, budget, attribution, attributionError, built }) {
  const pct = (part) => `${Math.round((part / shipped.raw) * 100)}%`;
  console.log(`${built ? "npm run build" : "existing build"} → app/dist/bundle.js`);
  console.log(`  raw   ${shipped.raw} B`);
  console.log(`  gzip  ${shipped.gzip} B`);

  if (attribution) {
    const flag = attribution.trusted ? "" : "  [UNTRUSTED]";
    console.log(`\nmarginal cost per widget (ablation builds)${flag}`);
    for (const widget of attribution.widgets) {
      console.log(
        `  ${widget.name.padEnd(10)} ${String(widget.raw).padStart(4)} B raw   ${String(widget.gzip).padStart(4)} B gzip   ${pct(widget.raw)} of raw`,
      );
    }
    console.log(
      `  ${"(baseline)".padEnd(10)} ${String(attribution.baseline.raw).padStart(4)} B raw   ${String(attribution.baseline.gzip).padStart(4)} B gzip   registry + entry, no widgets`,
    );
    console.log(
      attribution.trusted
        ? `  attribution check: un-ablated build == dist/bundle.js byte for byte (sha256 ${attribution.shippedHash.slice(0, 12)}) ✓`
        : driftReason(attribution, shipped, built),
    );
  } else {
    console.log(`\nmarginal cost per widget: unavailable — ${attributionError}`);
  }

  if (budget !== null) {
    const verdict = shipped.raw > budget ? "OVER" : "ok";
    console.log(`\nbudget ${budget} B raw → ${verdict} (${Math.round((shipped.raw / budget) * 100)}% used)`);
  }
}

const flags = parseArgs(process.argv.slice(2));

if (!existsSync(join(APP_DIR, "package.json"))) fail(`cannot find the app at ${APP_DIR}`);
if (flags.skipBuild && !existsSync(BUNDLE)) fail("--skip-build was passed but dist/bundle.js does not exist yet");
if (!flags.skipBuild) runRealBuild();
if (!existsSync(BUNDLE)) fail("the build finished but dist/bundle.js is missing");

const bundleBuffer = readFileSync(BUNDLE);
const shipped = { ...sizes(bundleBuffer), hash: sha256(bundleBuffer), mtime: statSync(BUNDLE).mtime.toISOString() };

let attributionError = null;
let attribution = null;
try {
  attribution = measureWidgets(shipped);
} catch (error) {
  attributionError = /esbuild/i.test(error.message)
    ? `${error.message} — run \`npm install\` in app/`
    : error.message;
}

if (flags.json) {
  console.log(
    JSON.stringify(
      { bundle: BUNDLE, built: !flags.skipBuild, shipped, budget: flags.budget, attribution, attributionError },
      null,
      2,
    ),
  );
} else {
  printReport({ shipped, budget: flags.budget, attribution, attributionError, built: !flags.skipBuild });
}

process.exit(flags.budget !== null && shipped.raw > flags.budget ? 1 : 0);
