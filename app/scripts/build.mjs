#!/usr/bin/env node
// Bundles src/index.ts -> dist/bundle.js (minified). Kept deliberately small —
// this is the build step the Task C "analyzing-bundle-size" skill's script
// wraps and reports on, not a production bundler setup.
import { build } from "esbuild";
import { statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));

await build({
  entryPoints: [resolve(__dirname, "../src/index.ts")],
  bundle: true,
  minify: true,
  format: "esm",
  outfile: resolve(__dirname, "../dist/bundle.js"),
  platform: "neutral",
  loader: { ".ts": "ts" },
});

const { size } = statSync(resolve(__dirname, "../dist/bundle.js"));
console.log(`dist/bundle.js — ${size} bytes`);
