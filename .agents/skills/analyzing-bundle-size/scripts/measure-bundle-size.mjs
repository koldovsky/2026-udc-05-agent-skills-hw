#!/usr/bin/env node
// Measures the real size of app/dist/bundle.js after a real build.
// Invoke from anywhere:
//   node .agents/skills/analyzing-bundle-size/scripts/measure-bundle-size.mjs

import { execSync } from "node:child_process";
import { statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, "../../../..");
const appDir = join(repoRoot, "app");
const bundlePath = join(appDir, "dist", "bundle.js");

execSync("npm run build", { cwd: appDir, stdio: "inherit" });

const { size } = statSync(bundlePath);
console.log(`app/dist/bundle.js: ${size} bytes`);
