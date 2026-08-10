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
import { existsSync, readFileSync, statSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
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
  // Distinguish "deps not installed" from a genuine build failure, so a
  // TypeScript/esbuild error is never reported as a missing `npm install`.
  if (!existsSync(path.join(appDir, "node_modules"))) {
    fail(`${path.relative(repoRoot, appDir)}/node_modules is missing — run \`cd app && npm install\` first.`);
  }
  try {
    // npm is a shell script on Windows -> shell: true.
    // In --json mode stdout is silenced so the JSON stays parseable, but stderr
    // is kept: build diagnostics must never be swallowed.
    execFileSync("npm", ["run", "build"], {
      cwd: appDir,
      stdio: asJson ? ["ignore", "ignore", "inherit"] : "inherit",
      shell: process.platform === "win32",
    });
  } catch (error) {
    const status = typeof error?.status === "number" ? ` (exit code ${error.status})` : "";
    fail(`\`npm run build\` failed in ${appDir}${status} — see the build diagnostics above.`);
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

// Which widgets actually ship in the bundle. Rather than pattern-matching the
// minified source (esbuild renames `register` to a single letter, so any regex
// is guesswork), import the bundle and ask the registry itself — every widget
// is eagerly imported via src/widgets/index.ts, so loading the module runs all
// register() calls. Sorted for a stable diff between runs.
// An empty list here would be a silently wrong report (especially in --json),
// so a failed import or a missing export is a hard error, not a warning.
let bundle;
try {
  bundle = await import(pathToFileURL(bundlePath).href);
} catch (error) {
  fail(`could not import ${path.relative(repoRoot, bundlePath)} to read its widget list — ${error.message}`);
}
if (typeof bundle.listWidgets !== "function") {
  fail(`${path.relative(repoRoot, bundlePath)} does not export listWidgets() — the bundle entry point changed?`);
}
const registered = [...bundle.listWidgets()].sort();

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
