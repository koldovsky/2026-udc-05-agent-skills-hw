---
name: analyzing-bundle-size
description: Use when asked to estimate the bundle size of this library (app/) or check the size impact of a change — e.g. "how big is the bundle", "did this change increase bundle size", "check bundle size impact", "reduce the bundle". Runs `npm run build` and reports the actual `dist/bundle.js` byte size rather than guessing.
---

# Analyzing bundle size

<!--
Everything below this line only loads into context when the agent actually
invokes the skill — keep the frontmatter description tight (it's ALWAYS in
context for every skill you have installed), and put the real instructional
weight here.
-->

## When to use this

- The user asks how big the bundle is, or to check/estimate `dist/bundle.js`
  size.
- The user asks whether a change (new widget, refactor, dependency) grew or
  shrank the bundle, i.e. a before/after size comparison.
- The user asks how to reduce the bundle size.

Not for the step-by-step of adding a new widget — that's `creating-widget`.
Not for explaining the registry's internal architecture — that's
`architecture-deep-dive`.

## Instructions

1. Run `node .agents/skills/analyzing-bundle-size/scripts/check-bundle-size.mjs`
   (add `--json` for machine-readable output) — it runs the real
   `npm run build` in `app/` (esbuild bundles `src/index.ts` -> minified
   `dist/bundle.js`, see `app/scripts/build.mjs`) and reads the real byte
   size of `app/dist/bundle.js` with `statSync`. Never guess or estimate a
   size from reading source.
2. For a before/after comparison: run the script on the base state, note the
   byte count, apply the change, run the script again, and report the delta
   in bytes and percent.
3. Only code reachable from `src/index.ts` (the bundle entry point) affects
   the measured size — widgets not imported by `src/widgets/index.ts` won't
   show up in it.

## Verify

- The reported number matches what `node scripts/check-bundle-size.mjs`
  actually printed — not an invented or remembered number.
- If the build fails or `app/dist/bundle.js` is missing, the script exits
  non-zero with an error instead of silently reporting a stale/fake size.

## Scripts

- `scripts/check-bundle-size.mjs` — runs `npm run build` in `app/` and
  prints the real `app/dist/bundle.js` byte size. Invoke with `node
  .agents/skills/analyzing-bundle-size/scripts/check-bundle-size.mjs`.
