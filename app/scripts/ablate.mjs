#!/usr/bin/env node
// Marginal cost per widget, by ablation: bundle the real src/index.ts graph,
// then bundle it again with one widget's module replaced by an empty one, and
// report the difference. Prints JSON on stdout and nothing else — the Task C
// `analyzing-bundle-size` skill's script wraps `npm run ablate` and formats it.
//
//   npm run ablate            # from app/
//
// Every build here stays in memory (`write: false`): dist/ is never touched, so
// this never disturbs the artefact `npm run build` produced.
import { build } from "esbuild";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { basename, dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { gzipSync } from "node:zlib";
import { BUILD_OPTIONS } from "./build-options.mjs";

const APP_DIR = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const WIDGETS_INDEX = join(APP_DIR, "src/widgets/index.ts");

function sizes(buffer) {
  return { raw: buffer.byteLength, gzip: gzipSync(buffer, { level: 9 }).byteLength };
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

// Replaces the named widget modules with empty ones *as imported by
// widgets/index.ts*, leaving the rest of the graph untouched. Ablating this way
// — rather than rebuilding a hand-written entry — is what lets the un-ablated
// build be byte-identical to the shipped bundle, which is the drift check.
function ablatePlugin(specifiers) {
  const drop = new Set(specifiers);
  return {
    name: "ablate-widgets",
    setup(esbuild) {
      if (!drop.size) return;
      esbuild.onResolve({ filter: /^\.\// }, (args) =>
        drop.has(args.path) && args.importer === WIDGETS_INDEX
          ? { path: args.path, namespace: "ablated" }
          : null,
      );
      esbuild.onLoad({ filter: /.*/, namespace: "ablated" }, () => ({ contents: "", loader: "js" }));
    },
  };
}

async function buildWithout(specifiers) {
  const result = await build({
    ...BUILD_OPTIONS,
    absWorkingDir: APP_DIR,
    write: false,
    plugins: [ablatePlugin(specifiers)],
  });
  return Buffer.from(result.outputFiles[0].contents);
}

const imports = readWidgetImports();
const fullBuffer = await buildWithout([]);
const full = sizes(fullBuffer);
const baseline = sizes(await buildWithout(imports.map((widget) => widget.specifier)));

const widgets = [];
for (const widget of imports) {
  const without = sizes(await buildWithout([widget.specifier]));
  widgets.push({ name: widget.name, raw: full.raw - without.raw, gzip: full.gzip - without.gzip });
}

// The hash lets the caller assert that this un-ablated build reproduced the
// shipped dist/bundle.js byte for byte — the guard on the whole table.
console.log(JSON.stringify({
  widgets,
  baseline,
  full: { ...full, hash: createHash("sha256").update(fullBuffer).digest("hex") },
}));
