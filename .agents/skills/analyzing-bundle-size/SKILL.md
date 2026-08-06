---
name: analyzing-bundle-size
description: >-
  Measures the real size of app/dist/bundle.js by running the project build
  script (not guessing). Use when the user asks for bundle size, bundle
  weight, how large the build is, or the size impact of a change.
---

# Analyzing bundle size

## When to use this

- User asks how large the bundle is / current bundle weight
- User asks to check the size impact of a code change
- User asks for `dist/bundle.js` size after a build
- Do **not** invent or estimate a number — always run the skill script

## Instructions

1. From the **repo root**, run the skill script (do not hardcode a size):

   ```bash
   node .agents/skills/analyzing-bundle-size/scripts/measure-bundle-size.mjs
   ```

2. Report the script's printed byte size for `app/dist/bundle.js` as-is.
3. If the script fails, surface the error (e.g. missing `app/` deps) — do not
   substitute a guessed size.

## Scripts

- [`scripts/measure-bundle-size.mjs`](scripts/measure-bundle-size.mjs) — runs
  `npm run build` in `app/` and reports the real size of `dist/bundle.js`.

## Verify

- The reported number came from running the script, not from memory or an
  estimate
- Output refers to `app/dist/bundle.js` in bytes
