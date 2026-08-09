#!/usr/bin/env node
// Measures the real bundle produced by `npm run build` in app/, and what each
// widget costs inside it. Never estimates: the headline number comes from the
// build this script just ran, the per-widget numbers from ablation builds.
//
// Usage:  node .agents/skills/analyzing-bundle-size/scripts/measure-bundle.mjs [flags]
//   --json            machine-readable report on stdout, nothing else
//   --budget <bytes>  raw-byte ceiling; exceeding it exits 1
//   --skip-build      reuse the existing dist/bundle.js instead of rebuilding
//   --help            this text
// Exit codes: 0 measured, 1 budget exceeded, 2 build or setup failure.

import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, readFileSync, statSync } from "node:fs";
import { createRequire } from "node:module";
import { basename, dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { gzipSync } from "node:zlib";

// Resolved from this file, not from cwd — the agent may invoke it from anywhere.
const APP_DIR = resolve(dirname(fileURLToPath(import.meta.url)), "../../../../app");
const BUNDLE = join(APP_DIR, "dist/bundle.js");
const WIDGETS_INDEX = join(APP_DIR, "src/widgets/index.ts");

// Mirror of app/scripts/build.mjs, minus outfile (these builds stay in memory).
// Drift here is caught by the hash check in measureWidgets() below.
const BUILD_OPTIONS = {
  entryPoints: ["src/index.ts"],
  bundle: true,
  minify: true,
  format: "esm",
  platform: "neutral",
};

function fail(message) {
  console.error(`measure-bundle: ${message}`);
  process.exit(2);
}

function parseArgs(argv) {
  const flags = { json: false, budget: null, skipBuild: false };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--json") flags.json = true;
    else if (arg === "--skip-build") flags.skipBuild = true;
    else if (arg === "--budget") {
      flags.budget = Number.parseInt(argv[(i += 1)], 10);
      if (!Number.isInteger(flags.budget) || flags.budget <= 0) {
        fail("--budget needs a positive byte count, e.g. --budget 2000");
      }
    } else if (arg === "--help" || arg === "-h") {
      // The header comment of this file IS the help text — one source, no drift.
      const header = readFileSync(fileURLToPath(import.meta.url), "utf8").split("\n").slice(1, 12);
      console.log(header.map((line) => line.replace(/^\/\/ ?/, "")).join("\n"));
      process.exit(0);
    } else fail(`unknown flag ${arg} (try --help)`);
  }
  return flags;
}

function sizes(buffer) {
  return { raw: buffer.byteLength, gzip: gzipSync(buffer, { level: 9 }).byteLength };
}

const sha256 = (buffer) => createHash("sha256").update(buffer).digest("hex");

function runRealBuild() {
  const npm = process.platform === "win32" ? "npm.cmd" : "npm";
  try {
    execFileSync(npm, ["run", "build"], { cwd: APP_DIR, stdio: ["ignore", "ignore", "inherit"] });
  } catch (error) {
    fail(`\`npm run build\` failed in ${APP_DIR} (${error.message})`);
  }
}

// The widget set is whatever widgets/index.ts side-effect-imports — that file is
// the single place that decides what ships (see the architecture-deep-dive skill).
function readWidgetImports() {
  const source = readFileSync(WIDGETS_INDEX, "utf8");
  return [...source.matchAll(/^import\s+"(\.\/[^"]+)";/gm)].map((match) => {
    const specifier = match[1];
    const [head, ...rest] = specifier.replace(/^\.\//, "").split("/");
    // ./badge/badge.js -> badge ;  ./badge.js -> badge
    return { specifier, name: rest.length ? head : basename(head, ".js") };
  });
}

async function loadEsbuild() {
  // esbuild is a devDependency of app/, not of this script's directory.
  const requireFromApp = createRequire(pathToFileURL(join(APP_DIR, "package.json")));
  return import(pathToFileURL(requireFromApp.resolve("esbuild")).href);
}

// Replaces the named widget modules with empty ones *as imported by
// widgets/index.ts*, leaving the rest of the graph untouched. Ablating this way
// — rather than rebuilding a hand-written entry — is what lets the un-ablated
// build be byte-identical to the shipped bundle, which is the drift check.
function ablatePlugin(specifiers) {
  const drop = new Set(specifiers);
  return {
    name: "ablate-widgets",
    setup(build) {
      if (!drop.size) return;
      build.onResolve({ filter: /^\.\// }, (args) =>
        drop.has(args.path) && args.importer === WIDGETS_INDEX
          ? { path: args.path, namespace: "ablated" }
          : null,
      );
      build.onLoad({ filter: /.*/, namespace: "ablated" }, () => ({ contents: "", loader: "js" }));
    },
  };
}

async function buildWithout(esbuild, specifiers) {
  const result = await esbuild.build({
    ...BUILD_OPTIONS,
    absWorkingDir: APP_DIR,
    write: false,
    plugins: [ablatePlugin(specifiers)],
  });
  return Buffer.from(result.outputFiles[0].contents);
}

async function measureWidgets(shipped) {
  const esbuild = await loadEsbuild();
  const imports = readWidgetImports();
  const fullBuffer = await buildWithout(esbuild, []);
  const full = sizes(fullBuffer);
  const baseline = sizes(await buildWithout(esbuild, imports.map((w) => w.specifier)));

  const widgets = [];
  for (const widget of imports) {
    const without = sizes(await buildWithout(esbuild, [widget.specifier]));
    widgets.push({ name: widget.name, raw: full.raw - without.raw, gzip: full.gzip - without.gzip });
  }

  // The un-ablated build must reproduce the shipped bundle byte for byte. If it
  // does not, either BUILD_OPTIONS has drifted from app/scripts/build.mjs or
  // dist/bundle.js is stale (--skip-build) — either way the marginal numbers
  // describe a build nobody ships.
  const syntheticHash = sha256(fullBuffer);
  return {
    widgets,
    baseline,
    syntheticRaw: full.raw,
    syntheticHash,
    shippedHash: shipped.hash,
    trusted: syntheticHash === shipped.hash,
  };
}

function driftReason(attribution, shipped, built) {
  const sizeNote =
    attribution.syntheticRaw === shipped.raw
      ? `same size (${shipped.raw} B), different bytes`
      : `synthetic ${attribution.syntheticRaw} B != shipped ${shipped.raw} B`;
  const cause = built
    ? "BUILD_OPTIONS in this script has drifted from app/scripts/build.mjs"
    : "BUILD_OPTIONS has drifted from app/scripts/build.mjs, or dist/bundle.js is stale (--skip-build)";
  return `  attribution check: ${sizeNote} — ${cause}; re-sync and re-run before quoting the table above`;
}

function printReport({ shipped, budget, attribution, attributionError, built }) {
  const pct = (part) => `${Math.round((part / shipped.raw) * 100)}%`;
  console.log(`${built ? "npm run build" : "existing build"} → app/dist/bundle.js`);
  console.log(`  raw   ${shipped.raw} B`);
  console.log(`  gzip  ${shipped.gzip} B`);

  if (attribution) {
    const flag = attribution.trusted ? "" : "  [UNTRUSTED]";
    console.log(`\nmarginal cost per widget (ablation builds)${flag}`);
    for (const widget of attribution.widgets) {
      console.log(
        `  ${widget.name.padEnd(10)} ${String(widget.raw).padStart(4)} B raw   ${String(widget.gzip).padStart(4)} B gzip   ${pct(widget.raw)} of raw`,
      );
    }
    console.log(
      `  ${"(baseline)".padEnd(10)} ${String(attribution.baseline.raw).padStart(4)} B raw   ${String(attribution.baseline.gzip).padStart(4)} B gzip   registry + entry, no widgets`,
    );
    console.log(
      attribution.trusted
        ? `  attribution check: un-ablated build == dist/bundle.js byte for byte (sha256 ${attribution.shippedHash.slice(0, 12)}) ✓`
        : driftReason(attribution, shipped, built),
    );
  } else {
    console.log(`\nmarginal cost per widget: unavailable — ${attributionError}`);
  }

  if (budget !== null) {
    const verdict = shipped.raw > budget ? "OVER" : "ok";
    console.log(`\nbudget ${budget} B raw → ${verdict} (${Math.round((shipped.raw / budget) * 100)}% used)`);
  }
}

const flags = parseArgs(process.argv.slice(2));

if (!existsSync(join(APP_DIR, "package.json"))) fail(`cannot find the app at ${APP_DIR}`);
if (flags.skipBuild && !existsSync(BUNDLE)) fail("--skip-build was passed but dist/bundle.js does not exist yet");
if (!flags.skipBuild) runRealBuild();
if (!existsSync(BUNDLE)) fail("the build finished but dist/bundle.js is missing");

const bundleBuffer = readFileSync(BUNDLE);
const shipped = { ...sizes(bundleBuffer), hash: sha256(bundleBuffer), mtime: statSync(BUNDLE).mtime.toISOString() };

let attributionError = null;
const attribution = await measureWidgets(shipped).catch((error) => {
  attributionError = /esbuild/i.test(error.message)
    ? `${error.message} — run \`npm install\` in app/`
    : error.message;
  return null;
});

if (flags.json) {
  console.log(
    JSON.stringify(
      { bundle: BUNDLE, built: !flags.skipBuild, shipped, budget: flags.budget, attribution, attributionError },
      null,
      2,
    ),
  );
} else {
  printReport({ shipped, budget: flags.budget, attribution, attributionError, built: !flags.skipBuild });
}

process.exit(flags.budget !== null && shipped.raw > flags.budget ? 1 : 0);
