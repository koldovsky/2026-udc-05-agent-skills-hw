#!/usr/bin/env node
// Measures the REAL size of app/dist/bundle.js by running the project's own
// build. No estimates: it shells out to `npm run build` (esbuild) and stats
// the emitted file. Read-only apart from app/dist/, which the build owns.
//
// Usage (from anywhere — paths resolve relative to this file):
//   node .agents/skills/analyzing-bundle-size/scripts/measure-bundle.mjs
//   ... --baseline   save the measurement to app/dist/.bundle-baseline.json
//   ... --compare    measure and diff against the saved baseline
//   ... --json       machine-readable output

import { execFileSync } from "node:child_process";
import { gzipSync } from "node:zlib";
import { readFileSync, statSync, writeFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const HERE = dirname(fileURLToPath(import.meta.url));
const APP_DIR = join(HERE, "..", "..", "..", "..", "app");
const BUNDLE = join(APP_DIR, "dist", "bundle.js");
const BASELINE = join(APP_DIR, "dist", ".bundle-baseline.json");
const WIDGETS_BARREL = join(APP_DIR, "src", "widgets", "index.ts");
const BUILD_SCRIPT_REL = join("scripts", "build.mjs");
const BUILD_SCRIPT = join(APP_DIR, BUILD_SCRIPT_REL);

const args = new Set(process.argv.slice(2));
const asJson = args.has("--json");
const saveBaseline = args.has("--baseline");
const compare = args.has("--compare");

function fail(message, detail) {
  console.error(`✗ ${message}`);
  if (detail) console.error(String(detail).trim());
  process.exit(1);
}

if (!existsSync(APP_DIR)) {
  fail(`Could not find the app/ directory at ${APP_DIR}`);
}
if (!existsSync(BUILD_SCRIPT)) {
  fail(`Could not find the build script at ${BUILD_SCRIPT}`);
}

// 1. Run the real build — the exact script `npm run build` runs, invoked with
// the current Node binary. Going straight to node avoids the npm shim, which
// on Windows is a .cmd that execFileSync refuses to spawn without a shell
// (EINVAL, CVE-2024-27980) while shell:true is deprecated in Node 22.
if (!asJson) console.log(`→ running the app/ build (${BUILD_SCRIPT_REL}) …`);
try {
  const out = execFileSync(process.execPath, [BUILD_SCRIPT], {
    cwd: APP_DIR,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
  if (!asJson && out.trim()) console.log(out.trim());
} catch (error) {
  const detail = [error.stdout, error.stderr].filter(Boolean).join("\n");
  fail(
    "The build failed — reporting the failure instead of guessing a size.\n" +
      "  If esbuild is missing, run `cd app && npm install` (and allow its postinstall).",
    detail,
  );
}

// 2. Measure the real artifact.
if (!existsSync(BUNDLE)) {
  fail(`Build reported success but ${BUNDLE} does not exist.`);
}

const bytes = statSync(BUNDLE).size;
const gzipBytes = gzipSync(readFileSync(BUNDLE)).length;

// Context: every widget side-effect-imported by the barrel ends up in the bundle.
let widgetCount = null;
try {
  const barrel = readFileSync(WIDGETS_BARREL, "utf8");
  widgetCount = (barrel.match(/^\s*import\s+["']\.\//gm) ?? []).length;
} catch {
  // Non-fatal: the size measurement is the point, this is only context.
}

const kib = (n) => `${(n / 1024).toFixed(2)} KiB`;

// 3. Compare against a saved baseline, if asked.
let delta = null;
if (compare) {
  if (!existsSync(BASELINE)) {
    fail("No baseline found. Run with --baseline before making your change.");
  }
  const previous = JSON.parse(readFileSync(BASELINE, "utf8"));
  delta = {
    bytes: bytes - previous.bytes,
    gzipBytes: gzipBytes - previous.gzipBytes,
    from: previous,
  };
}

if (saveBaseline) {
  writeFileSync(BASELINE, JSON.stringify({ bytes, gzipBytes, widgetCount }, null, 2));
}

// 4. Report.
if (asJson) {
  console.log(JSON.stringify({ bytes, gzipBytes, widgetCount, delta }, null, 2));
} else {
  console.log("");
  console.log(`dist/bundle.js   ${bytes} bytes (${kib(bytes)})`);
  console.log(`gzipped          ${gzipBytes} bytes (${kib(gzipBytes)})`);
  if (widgetCount !== null) {
    console.log(`widgets bundled  ${widgetCount} (imported by src/widgets/index.ts)`);
  }
  if (delta) {
    const sign = delta.bytes >= 0 ? "+" : "";
    console.log("");
    console.log(
      `vs baseline      ${sign}${delta.bytes} bytes ` +
        `(${sign}${(delta.bytes / 1024).toFixed(2)} KiB), ` +
        `gzip ${delta.gzipBytes >= 0 ? "+" : ""}${delta.gzipBytes} bytes`,
    );
  }
  if (saveBaseline) console.log(`\nbaseline saved → app/dist/.bundle-baseline.json`);
}
