---
name: analyzing-bundle-size
description: Measure the real size of this repo's bundle (app/dist/bundle.js) by running the project's own esbuild build and stat-ing the output, and report the raw/gzipped bytes plus which widgets ship. Use whenever asked how big the bundle is, whether a change grew it, or to compare before/after — never estimate the number from reading source.
---

# Analyzing bundle size

## When to use this

- "How big is the bundle right now?" / "what's the gzipped size?"
- "Did adding the `alert` widget grow the bundle?" — before/after comparison.
- Reviewing a change that adds a widget or a dependency and someone asks about
  the cost.
- **Not** for: runtime performance questions, or bundling questions about a
  tool this repo doesn't use — the only build here is
  `app/scripts/build.mjs` (esbuild, minified ESM).

## Instructions

Never guess or infer a byte count from source files. Run the script:

```bash
node .agents/skills/analyzing-bundle-size/scripts/bundle-size.mjs
```

It runs `npm run build` in `app/` (esbuild → `app/dist/bundle.js`), then reads
the real file: raw minified bytes, gzipped bytes (`zlib` level 9), and the
widgets that actually ship — obtained by importing the built bundle and calling
its own `listWidgets()`, not by pattern-matching minified source. Flags:

- `--json` — machine-readable output (`{ file, bytes, gzipBytes, registered }`),
  useful when you need to diff two runs.
- `--no-build` — reuse an existing `app/dist/bundle.js` instead of rebuilding.
  Only use it when you know the bundle is current; otherwise you will report a
  stale number.

Prerequisite: `cd app && npm install` must have been run once — the script
checks for `app/node_modules` and says so explicitly. A build that fails for
any other reason (TypeScript/esbuild error) is reported as a build failure with
its diagnostics on stderr, including in `--json` mode, and exits `1`. The same
applies if the bundle cannot be imported or no longer exports `listWidgets()` —
the script exits `1` rather than printing a report with an empty widget list.

**For a before/after comparison**, run the script on the baseline first, save
the number, apply the change, run it again, and report both plus the delta —
do not compute the "after" number analytically.

When reporting, include the gzipped figure alongside the raw one, and note
that this library eagerly imports every widget from `app/src/widgets/index.ts`,
so there is no tree-shaking: every registered widget ships to every consumer.

## Verify

- The script printed a number it read from disk, and
  `ls -l app/dist/bundle.js` (or `stat`) agrees with it.
- The build actually ran. In the default (human-readable) mode, npm's own
  banner and esbuild's `dist/bundle.js — <n> bytes` line from
  `app/scripts/build.mjs` appear somewhere in the output — npm may print
  its own lines first, so look for the line, don't expect it first. In
  `--json` mode that output is silenced by design: verify instead that the
  exit code is `0`, `file` is `app/dist/bundle.js`, and `bytes` matches the
  file on disk.
- Baseline sanity check: with `badge` + `alert` registered (current `main`)
  the bundle is ≈ 509 bytes raw / ≈ 310 gzipped; with `badge` alone it was
  411 / 278 — i.e. one small widget costs ≈ 98 bytes. A figure far outside
  that range means the bundle is stale or the source changed materially —
  investigate before reporting it.

## Scripts

- `scripts/bundle-size.mjs` — runs the project's own `npm run build` in `app/`
  and reports raw + gzipped size of `app/dist/bundle.js` and the widgets it
  contains. Runs no network calls and writes nothing outside `app/dist/`.
