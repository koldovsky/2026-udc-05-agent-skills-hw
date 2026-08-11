#!/usr/bin/env node
// Runs the real build and reports the real size of app/dist/bundle.js.
// Run from anywhere; it resolves paths relative to this script's own
// location so it works whether invoked directly or via `node .../measure-bundle-size.mjs`.

import { execSync } from "node:child_process";
import { statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const appDir = path.resolve(scriptDir, "../../../../app");
const bundlePath = path.join(appDir, "dist", "bundle.js");

execSync("npm run build", { cwd: appDir, stdio: "inherit" });

const { size } = statSync(bundlePath);

console.log(`app/dist/bundle.js — ${size} bytes (${(size / 1024).toFixed(2)} KB)`);
