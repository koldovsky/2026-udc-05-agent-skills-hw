#!/usr/bin/env node
// Runs the app's real build (`npm run build` in app/) and reports the actual
// size of app/dist/bundle.js. Wraps the project's own npm script only — no
// deletions, no network calls, no writes outside app/.
//
// Usage (from the repo root):
//   node .agents/skills/analyzing-bundle-size/scripts/measure-bundle.mjs

import { execSync } from "node:child_process";
import { existsSync, statSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

// scripts/ -> analyzing-bundle-size/ -> skills/ -> .agents/ -> repo root
const scriptDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(scriptDir, "..", "..", "..", "..");
const appDir = resolve(repoRoot, "app");
const bundlePath = resolve(appDir, "dist", "bundle.js");

if (!existsSync(resolve(appDir, "package.json"))) {
  console.error(`error: app/package.json not found at ${appDir}`);
  process.exit(1);
}

try {
  execSync("npm run build", { cwd: appDir, stdio: "inherit" });
} catch (err) {
  console.error(`error: "npm run build" failed in ${appDir} (${err.message})`);
  process.exit(1);
}

if (!existsSync(bundlePath)) {
  console.error(`error: build finished but ${bundlePath} does not exist`);
  process.exit(1);
}

const { size } = statSync(bundlePath);
const kb = (size / 1024).toFixed(2);
console.log(`bundle size: ${size} bytes (${kb} KB) — app/dist/bundle.js`);
