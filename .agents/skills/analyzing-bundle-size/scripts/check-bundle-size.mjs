#!/usr/bin/env node
// Runs the real `npm run build` in app/ and reports the real size of
// app/dist/bundle.js. No estimation, no hardcoded numbers.
//
// Usage: node .agents/skills/analyzing-bundle-size/scripts/check-bundle-size.mjs

import { execSync } from "node:child_process";
import { statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve, join } from "node:path";

const scriptDir = dirname(fileURLToPath(import.meta.url));
// scripts/ -> analyzing-bundle-size/ -> skills/ -> .agents/ -> repo root
const appDir = resolve(scriptDir, "..", "..", "..", "..", "app");
const bundlePath = join(appDir, "dist", "bundle.js");

console.log(`Running "npm run build" in ${appDir} ...`);
execSync("npm run build", { cwd: appDir, stdio: "inherit", shell: true });

const { size } = statSync(bundlePath);
console.log(`\ndist/bundle.js — ${size} bytes (${(size / 1024).toFixed(2)} KB)`);
