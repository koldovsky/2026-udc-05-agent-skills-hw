#!/usr/bin/env node

import { execSync } from "node:child_process";
import { statSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(scriptDir, "../../../../");
const appDir = resolve(repoRoot, "app");
const bundlePath = resolve(appDir, "dist/bundle.js");

execSync("npm run build", {
  cwd: appDir,
  stdio: "inherit",
});

const { size } = statSync(bundlePath);
const sizeKiB = size / 1024;

console.log(`bundle: ${bundlePath}`);
console.log(`size: ${size} bytes (${sizeKiB.toFixed(2)} KiB)`);

