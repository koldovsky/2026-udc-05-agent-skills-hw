#!/usr/bin/env node
// Bundles src/index.ts -> dist/bundle.js (minified). Kept deliberately small —
// this is the build step the Task C "analyzing-bundle-size" skill's script
// wraps and reports on, not a production bundler setup.
import { build } from "esbuild";
import { statSync } from "node:fs";
import { BUILD_OPTIONS, OUTFILE } from "./build-options.mjs";

await build({ ...BUILD_OPTIONS, outfile: OUTFILE });

const { size } = statSync(OUTFILE);
console.log(`${OUTFILE} — ${size} bytes`);
