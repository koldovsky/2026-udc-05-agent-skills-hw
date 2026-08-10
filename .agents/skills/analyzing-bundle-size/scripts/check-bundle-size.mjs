#!/usr/bin/env node
// Runs the real `npm run build` in app/ and reports the real byte size of
// app/dist/bundle.js — never invents or estimates a number.
//
// Usage:
//   node .agents/skills/analyzing-bundle-size/scripts/check-bundle-size.mjs
//
// Optional: pass --json to get machine-readable output instead of the
// human-readable line.

import { execSync } from "node:child_process";
import { statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
// scripts/ -> analyzing-bundle-size/ -> skills/ -> .agents/ -> repo root
const repoRoot = resolve(__dirname, "..", "..", "..", "..");
const appDir = resolve(repoRoot, "app");
const bundlePath = resolve(appDir, "dist", "bundle.js");

const asJson = process.argv.includes("--json");

// 1. Run the real build — this is what actually produces dist/bundle.js.
try {
  execSync("npm run build", { cwd: appDir, stdio: "inherit" });
} catch (err) {
  console.error("Build failed — cannot measure bundle size.");
  process.exit(1);
}

// 2. Read the real, just-built file. No fallback, no guessed number: if the
// build didn't produce it, that's a hard failure, not something to paper over.
let size;
try {
  ({ size } = statSync(bundlePath));
} catch (err) {
  console.error(`Expected ${bundlePath} after build but it wasn't found.`);
  process.exit(1);
}

// 3. Report it in a way a human or the calling agent can act on.
if (asJson) {
  console.log(JSON.stringify({ path: "app/dist/bundle.js", bytes: size }));
} else {
  console.log(`app/dist/bundle.js — ${size} bytes`);
}
