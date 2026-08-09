#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import { statSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(scriptDir, "../../../..");
const appDir = join(repoRoot, "app");
const bundlePath = join(appDir, "dist", "bundle.js");

execFileSync("npm", ["run", "build"], {
  cwd: appDir,
  stdio: "inherit",
});

const { size } = statSync(bundlePath);
const kib = size / 1024;

console.log(`app/dist/bundle.js: ${size} bytes (${kib.toFixed(2)} KiB)`);
