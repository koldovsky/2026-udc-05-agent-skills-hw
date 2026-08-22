---
name: analyzing-bundle-size
description: Measures the real bundle size of the app/ library by running the actual esbuild build and reading dist/bundle.js from disk. Use when asked how big the bundle is, or to assess the bundle-size impact of a change (e.g. after adding a widget). Never estimate or guess the number — always run the script.
allowed-tools: Bash, Read
model: claude-sonnet-5
---

# Analyzing bundle size

## Recommended model

**Mid-complexity task**: the script does the measuring, but the agent still
has to run it correctly, interpret the numbers, compute deltas across
baselines, and spot anomalies (e.g. the registration-canary case below).
Route to the balanced mid tier:

1. **Preferred:** Claude Sonnet (`claude-sonnet-5`, or `claude-sonnet-4-6`) —
   the right speed/intelligence balance for run-and-interpret work.
2. **Fallback:** step up to Opus-tier only if the analysis turns into a real
   optimization investigation; step down to Haiku only for a bare "print the
   current number" ask.

(This skill's `model:` frontmatter key mirrors this preference as a machine-readable hint; tools that don't support it ignore
the key — apply the ladder manually when delegating.)

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

3. For machine-readable output (e.g. when another script or agent step will
   parse the result), pass `--json` — it prints a single line:
   `{"raw":<bytes>,"gzip":<bytes>}`.

4. For impact analysis: run the script on the baseline (e.g. `git stash` the
   change or check out the base commit), record the size, re-apply the
   change, run again, and report the delta in bytes and percent.

5. Registration canary: after adding a widget, the bundle **must grow**
   (every registered widget is pulled in via `widgets/index.ts`). If the size
   is unchanged after adding a widget, its `import "./<name>/<name>.js";`
   line in `app/src/widgets/index.ts` is missing — the widget is not
   registered. Report that as a bug, not as "zero size impact".

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
  works). Supports `--json` for machine-readable output; exits 1 with an
  actionable message if `app/node_modules` is missing or the build fails.