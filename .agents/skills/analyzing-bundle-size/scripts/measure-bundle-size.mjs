#!/usr/bin/env node
// Runs the real `npm run build` in app/ and reads the real dist/bundle.js
// size — never guess this number, esbuild's minified output isn't
// predictable from reading source.

import { execSync } from "node:child_process";
import { statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "..");
const appDir = join(repoRoot, "app");

execSync("npm run build", { cwd: appDir, stdio: "inherit" });

const { size } = statSync(join(appDir, "dist", "bundle.js"));
console.log(`\napp/dist/bundle.js — ${size} bytes (${(size / 1024).toFixed(2)} KB)`);
