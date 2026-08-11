#!/usr/bin/env node
// Measures the REAL bundle size of app/: runs the project's own `npm run build`
// (esbuild -> dist/bundle.js, minified ESM) and then reads the artifact off disk.
//
// Two things it deliberately does NOT do:
//   - guess, or reuse a previously reported number;
//   - scrape the size out of the build's stdout. It stats the file itself, so
//     the number is measured rather than parsed.
// If the build fails it prints the build's own error and exits non-zero WITHOUT
// printing a size — a stale number is worse than no number.
//
// On the gzip figure: node:zlib emits no FNAME/MTIME header, which is what an
// HTTP `Content-Encoding: gzip` response actually carries. It is therefore 10
// bytes smaller than plain `gzip -9 -c file | wc -c` (that adds "bundle.js" +
// NUL). Cross-check with `gzip -9 -n -c`, which matches exactly.
//
// Usage:  node .agents/skills/analyzing-bundle-size/scripts/measure-bundle.mjs [--json]

import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, statSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { gzipSync } from "node:zlib";

const GZIP_LEVEL = 9;

// Resolve app/ from THIS FILE's location, not from process.cwd(), so the script
// works no matter which directory the caller (or agent) happens to be in.
// scripts -> analyzing-bundle-size -> skills -> .agents -> repo root
const here = dirname(fileURLToPath(import.meta.url));
const appDir = resolve(here, "../../../../app");
const bundlePath = join(appDir, "dist", "bundle.js");

const die = (msg) => {
  console.error(`measure-bundle: ${msg}`);
  process.exit(1);
};

if (!existsSync(join(appDir, "package.json"))) {
  die(`no package.json at ${appDir} — expected the app/ directory four levels up from this script`);
}

const wantsJson = process.argv.includes("--json");
if (!wantsJson) console.error("measure-bundle: running `npm run build` in app/ ...");

// Wrap the project's own build script — nothing more.
const npm = process.platform === "win32" ? "npm.cmd" : "npm";
const build = spawnSync(npm, ["run", "build"], { cwd: appDir, encoding: "utf8" });

if (build.error) die(`could not run ${npm}: ${build.error.message}`);
if (build.status !== 0) {
  process.stderr.write(build.stderr ?? "");
  process.stdout.write(build.stdout ?? "");
  die(`build failed with exit code ${build.status} — no size reported`);
}
if (!existsSync(bundlePath)) {
  die(`build succeeded but ${bundlePath} is missing — nothing to measure`);
}

const raw = statSync(bundlePath).size;
const gzip = gzipSync(readFileSync(bundlePath), { level: GZIP_LEVEL }).length;

if (wantsJson) {
  console.log(JSON.stringify({ file: "app/dist/bundle.js", raw, gzip, gzipLevel: GZIP_LEVEL }, null, 2));
} else {
  const kb = (n) => `${(n / 1024).toFixed(2)} KiB`;
  console.log(`
app/dist/bundle.js
  raw    ${String(raw).padStart(7)} B   (${kb(raw)})
  gzip   ${String(gzip).padStart(7)} B   (${kb(gzip)}, level ${GZIP_LEVEL})

Measured from the artifact on disk after a successful build.`);
}
