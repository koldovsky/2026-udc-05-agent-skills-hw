#!/usr/bin/env node

import { execSync } from "node:child_process";
import { statSync } from "node:fs";

// 1. Run the real command this script wraps.
execSync("npm run build", { cwd: "app", stdio: "inherit" });

// 2. Read real output / measure something real.
const { size } = statSync("app/dist/bundle.js");

// 3. Report it in a way a human or the calling agent can act on.
console.log(`dist/bundle.js: ${size} bytes`);
