---
name: analyzing-bundle-size
description: Measures the real minified/gzipped size of app/dist/bundle.js by running the project's own esbuild build via scripts/measure-bundle.mjs, and compares a change against a baseline. Use when asked how big the bundle is, whether a change (e.g. a new widget or dependency) grows it, or to check bundle-size impact before merging. Never estimate the number — run the script.
---

# Analyzing bundle size

## When to use this

- "How big is the bundle?", "яка зараз вага бандла?", "what's the minified /
  gzipped size of this library?"
- "Does adding `<widget>` / `<dependency>` grow the bundle?" — before/after
  impact of a change.
- Reviewing a PR that adds a widget, an import, or an npm dependency and the
  size cost matters.

Do **not** answer a bundle-size question from memory or by eyeballing source
files — an LLM cannot predict esbuild's minified output. Run the script.

## Instructions

The bundle is produced by `app/scripts/build.mjs` (esbuild:
`src/index.ts` → `dist/bundle.js`, `bundle: true, minify: true, format: "esm",
platform: "neutral"`). The skill script wraps that same `npm run build` — it
adds no bundler config of its own.

1. **Measure the current size:**

   ```bash
   node .agents/skills/analyzing-bundle-size/scripts/measure-bundle.mjs
   ```

   It runs `npm run build` in `app/`, then reports the real minified byte
   count, the gzipped byte count, the build timestamp, and the entry source
   size. The script resolves `app/` from its own location, so the cwd does
   not matter.

2. **For before/after impact of a change**, capture the baseline first, then
   apply the change and pass the old number back in:

   ```bash
   # before the change
   node .agents/skills/analyzing-bundle-size/scripts/measure-bundle.mjs
   # ... make the change ...
   node .agents/skills/analyzing-bundle-size/scripts/measure-bundle.mjs --baseline=<old bytes>
   ```

   The report then adds `baseline`, `delta` in bytes and a percentage.

3. **Flags:**
   - `--baseline=<bytes>` — compare against a previously measured number.
   - `--json` — machine-readable output (`rawBytes`, `gzipBytes`, `bundle`,
     `builtAt`, plus baseline/delta when given); use when chaining.
   - `--skip-build` — measure the existing `app/dist/bundle.js` without
     rebuilding. Only safe when nothing changed since the last build;
     otherwise the number is stale.

4. **Report both raw and gzipped** numbers, and say which build they came
   from. Quote the exact bytes the script printed — do not round them into a
   vague "about 0.5 KB" unless you also give the byte count.

5. **Interpreting a delta.** This library is deliberately tiny (hundreds of
   bytes), so a single widget is a visible percentage jump — report the
   absolute bytes, not just the percentage, or the number is misleading. If
   the bundle grew unexpectedly, the usual causes are: a new
   `import "./<name>/<name>.js";` line in `app/src/widgets/index.ts` (each
   widget is only bundled once it is imported there), or a new runtime npm
   dependency (the project currently has **zero** runtime deps — all deps are
   dev-only).

6. **Constraints.** The script only runs the project's own npm script; it
   makes no network calls, deletes nothing, and writes nothing outside
   `app/dist/`. Keep it that way. If the build fails, the script exits
   non-zero and reports the failure — say the build is broken rather than
   producing a number.

## Verify

- The script was actually executed and a real number was read — the output
  ends with the measured `dist/bundle.js` line from `app/scripts/build.mjs`
  itself, which is an independent cross-check of the raw byte count.
- Sanity-check the file directly:

  ```bash
  ls -l app/dist/bundle.js
  ```

  This must match the `minified` byte count in the report.
- Confirmed working: on the seeded repo (badge widget only) the script
  reports **411 bytes minified / 278 bytes gzipped**. A materially different
  number means the tree changed — re-measure, don't reuse this figure.

## Scripts

- `scripts/measure-bundle.mjs` — runs `npm run build` in `app/`, then reports
  real minified + gzipped sizes for `app/dist/bundle.js`. Invoke with
  `node .agents/skills/analyzing-bundle-size/scripts/measure-bundle.mjs`
  (flags: `--baseline=<bytes>`, `--json`, `--skip-build`).

