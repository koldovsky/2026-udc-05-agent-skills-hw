#!/usr/bin/env node
import { execSync } from "node:child_process";
import { statSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const appDir = resolve(__dirname, "../../../../app");
const bundlePath = resolve(appDir, "dist/bundle.js");

console.log("Building bundle...\n");
execSync("npm run build", { cwd: appDir, stdio: "inherit" });

const { size } = statSync(bundlePath);
console.log(`\n── Bundle size ──`);
console.log(`dist/bundle.js: ${size} bytes (${(size / 1024).toFixed(2)} KiB)`);
