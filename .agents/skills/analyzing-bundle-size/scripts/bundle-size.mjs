#!/usr/bin/env node
import { execSync } from "node:child_process";
import { statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const appDir = path.resolve(scriptDir, "../../../../app");

execSync("npm run build", { cwd: appDir, stdio: "inherit" });

const bundlePath = path.join(appDir, "dist/bundle.js");
const { size } = statSync(bundlePath);

console.log(`\nBundle size: ${size} bytes (${(size / 1024).toFixed(2)} KB) — ${bundlePath}`);
