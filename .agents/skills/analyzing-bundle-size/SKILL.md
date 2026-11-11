---
name: analyzing-bundle-size
description: Measures the real size of this repo's esbuild bundle (app/dist/bundle.js) by running the actual build script. Load it when the user asks how big the bundle is, about bundle size or bundle weight, or whether a change grew or shrank the bundle; skip it for adding widgets or architecture questions.
---

# Analyzing bundle size

## When to use this

- The user asks "how big is the bundle?", "what's the bundle size/weight?",
  or anything else about the size of `app/dist/bundle.js`.
- The user asks what effect a change (a new widget, a refactor, a new
  import) had or will have on bundle size.
- You are about to claim a bundle size in a summary, PR description, or
  review comment.

Do not use it for adding widgets (use `creating-widget`) or for questions
about how the registry and build fit together (use `architecture-deep-dive`).

## Instructions

1. Always run the script. Never estimate, guess, or reuse a number from
   memory, docs, or an earlier conversation. From the repo root:

   ```sh
   node .agents/skills/analyzing-bundle-size/scripts/measure-bundle.mjs
   ```

   The script resolves `app/` from its own location, so it works from any
   working directory. It runs `npm run build` in `app/` (which runs
   `app/scripts/build.mjs`) and then reads the size of `app/dist/bundle.js`.
2. Report the final line verbatim, for example
   `bundle size: N bytes (X.XX KB) — app/dist/bundle.js`.
3. For "did my change grow the bundle?", measure twice:
   - Run the script **before** the change (or on the unchanged code, e.g.
     after `git stash`) and note the byte count.
   - Apply the change and run the script **again**.
   - Report both numbers and the difference in bytes and as a percentage.
4. If the script exits with code 1, report the error it printed (build
   failure or missing `dist/bundle.js`). Do not substitute an estimate.
5. Do not edit `app/scripts/build.mjs` or `app/package.json` to change how
   the bundle is measured, and do not add dependencies (e.g. a gzip or
   bundle-analyzer package) unless the user explicitly asks.

## Interpreting the output

- The number is the **raw, minified ESM** size that esbuild writes
  (`bundle: true`, `minify: true`, `format: "esm"`, `platform: "neutral"`,
  entry `app/src/index.ts`). It is **not** gzip or brotli size; over the
  wire it would be smaller. Say so if the user asks about transfer size.
- KB in the output is bytes / 1024, rounded to two decimals.
- The build also prints its own line (`dist/bundle.js — N bytes`); it should
  match the script's final line.
- Every widget imported via `app/src/widgets/index.ts` ends up in the bundle,
  so adding a widget is expected to grow it.
- Do not hardcode or memorize a baseline number in docs or answers — the
  bundle changes whenever the code changes. Always compare against a fresh
  measurement taken on the code you are comparing to.

## Verify

- The script printed a final `bundle size: ... bytes (... KB)` line and
  exited with code 0.
- The number you reported matches that line exactly.
- For before/after comparisons, both numbers came from actual script runs.

## Scripts

- `scripts/measure-bundle.mjs` — runs `npm run build` in `app/` and prints the real byte/KB size of `app/dist/bundle.js`; exits 1 if the build fails or the file is missing.
