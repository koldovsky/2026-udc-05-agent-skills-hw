#!/usr/bin/env node
// Wraps the project's own `npm run build` and reports the real size of
// dist/bundle.js. Runs the real command, reads the real file, prints a real
// number — no network, no writes outside app/, nothing destructive.

import { execSync } from "node:child_process";
import { statSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(scriptDir, "../../../../");
const appDir = resolve(repoRoot, "app");
const bundlePath = resolve(appDir, "dist/bundle.js");

execSync("npm run build", { cwd: appDir, stdio: "inherit" });

const { size } = statSync(bundlePath);
const kb = (size / 1024).toFixed(2);

console.log(`dist/bundle.js — ${size} bytes (${kb} KiB)`);
