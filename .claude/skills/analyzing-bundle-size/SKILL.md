---
name: analyzing-bundle-size
description: Measuring the real weight of app/dist/bundle.js by running the project's own build. Use when asked how big the bundle is, what a change costs in bytes, or whether a widget is worth its weight — the number must come from scripts/measure-bundle.mjs, never an estimate. Not for explaining why the bundle is shaped the way it is; that's architecture-deep-dive.
---

# Analyzing bundle size

## When to use this

Any question whose answer is a number of bytes: "how big is the bundle?", "what
did that change cost?", "is adding this widget worth it?"

## Instructions

Run the script and report what it prints. **Never estimate, extrapolate, or
reuse a number from earlier in the conversation** — a plausible bundle size is
worse than no number, because it looks like a measurement.

Paths are relative to this skill's own directory — run the copy you loaded,
`.agents/skills/analyzing-bundle-size/` or the `.claude/skills/` mirror. Either
works, from any cwd:

```bash
node <this-skill>/scripts/measure-bundle.mjs
```

It builds `app/`, then reports raw and gzipped bytes, the bundle's exports, and
which widgets are actually registered. `--baseline=<bytes>` prints the delta
against an earlier run; `--json` gives machine-readable output. To cost a
change, run it once **before** the edit — nothing is stored, so a number you
didn't capture is gone.

If the build fails, the script exits non-zero and prints no size. Report the
failure; don't fall back to a guess.

## Verify

**From the repo root**, `ls -l app/dist/bundle.js` reports the same byte count
as the script's `raw`. Unlike the command above, this path is relative to the
cwd — the script resolves `app/` by walking up from its own file, the report
just labels it `app/dist/bundle.js` either way.

## Scripts

- `scripts/measure-bundle.mjs` — runs the project's own `npm run build` in
  `app/`, then measures `app/dist/bundle.js`. It writes no report of its own,
  but the build it runs does create or overwrite `app/dist/bundle.js`. Makes no
  network calls, and needs `npm install` to have been run in `app/`.
