---
name: analyzing-bundle-size
description: Use this when the user asks to estimate or check the widget-registry library's bundle size, or to assess how a change (new widget, new dependency, edit to core/registry.ts) affects bundle size.
---

# Analyzing Bundle Size

## When to use this

- the user asks to check/estimate the bundle size ("яка зараз вага бандла", "how big is the build");
- the user asks whether a change (new widget, new import, edit to `registry.ts`) will grow the bundle;
- before/after comparisons of bundle size for a proposed or just-made change.

Not for adding a new widget (use `creating-widget`) and not for general architecture questions (use `architecture-deep-dive`).

## Instructions

1. Run `scripts/check-bundle-size.mjs` (see below) — it runs the real `npm run build` in `app/` and reports the real byte size of `app/dist/bundle.js`. Do not estimate or guess the number.
2. For a before/after comparison, run the script on the base state, then again after the change, and diff the two reported sizes.
3. Remember `src/index.ts` only re-exports `create`/`listWidgets` from `widgets/index.ts`, which imports every widget module — so any widget added to `widgets/index.ts` is included in the bundle even if unused by the caller.

## Verify

- The script completes and prints a real byte size for `dist/bundle.js` (not a guessed number).

## Scripts
- scripts/check-bundle-size.mjs — runs `npm run build` in `app/` and prints the real size of `app/dist/bundle.js`. Invoke: `node .agents/skills/analyzing-bundle-size/scripts/check-bundle-size.mjs`.
