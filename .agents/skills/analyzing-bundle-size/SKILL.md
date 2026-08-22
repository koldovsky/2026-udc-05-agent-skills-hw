---
name: analyzing-bundle-size
description: Measures the real bundle size of the app/ library by running the actual esbuild build and reading dist/bundle.js from disk. Use when asked how big the bundle is, or to assess the bundle-size impact of a change (e.g. after adding a widget). Never estimate or guess the number — always run the script.
---

# Analyzing bundle size

## When to use this

- "What's the current bundle size?" / "how heavy is the bundle?"
- "How much did adding widget X grow the bundle?" — measure **before and
  after** the change and compare.

## Instructions

1. Run the measuring script from the **repo root**:

   ```bash
   node .agents/skills/analyzing-bundle-size/scripts/measure-bundle.mjs
   ```

   It runs the project's real build (`npm run build` in `app/`, which bundles
   `app/src/index.ts` with esbuild, minified) and prints the actual byte size
   of `app/dist/bundle.js` plus its gzipped size. It exits non-zero if the
   build fails.

2. Report the numbers the script printed — **never** infer, estimate, or
   reuse a stale number from memory or docs.

3. For impact analysis: run the script on the baseline (e.g. `git stash` the
   change or check out the base commit), record the size, re-apply the
   change, run again, and report the delta in bytes and percent.

Note: `app/` needs `npm install` to have been run once (esbuild is a
devDependency); if the script fails with a missing-module error, run
`cd app && npm install` first.

## Verify

- The script actually ran (its output includes the esbuild line
  `dist/bundle.js — <n> bytes` followed by the report) — if you didn't see
  script output, you don't have a number.
- `app/dist/bundle.js` exists and its `stat` size matches the reported raw
  size.

## Scripts

- `scripts/measure-bundle.mjs` — runs `npm run build` in `app/` and reports
  the raw + gzipped size of `app/dist/bundle.js`. Invoke with
  `node .agents/skills/analyzing-bundle-size/scripts/measure-bundle.mjs`
  from the repo root (it locates the repo relative to itself, so any CWD
  works).