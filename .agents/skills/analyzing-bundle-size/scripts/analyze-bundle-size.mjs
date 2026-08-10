#!/usr/bin/env node
import { execSync } from "node:child_process";
import { statSync } from "node:fs";

execSync("npm run build", { cwd: "app", stdio: "inherit" });

const { size } = statSync("app/dist/bundle.js");
console.log(`dist/bundle.js: ${size} bytes (${(size / 1024).toFixed(2)} KB)`);
