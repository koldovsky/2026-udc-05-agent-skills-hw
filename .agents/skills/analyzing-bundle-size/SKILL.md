---
name: analyzing-bundle-size
description: >-
  Measures and reports the bundle size of the widget-registry library by
  wrapping `npm run build` (esbuild) and reading `app/dist/bundle.js`. Use when
  the user asks to estimate the bundle size, check how a change affects bundle
  size, or compare before/after build output.
---

## When to use this

- User asks to estimate / measure the bundle size of the library or `app/`.
- User asks whether a change (new widget, new import, refactor) affects the
  bundle size — i.e. "will this make the bundle bigger?".
- User wants a before/after comparison of `dist/bundle.js` around a change.
- User wants to confirm the bundle entry surface (`src/index.ts` → `widgets/index.ts`).

Do **not** use this skill to add a widget (use `creating-widget`) or to explain
architecture (use `architecture-deep-dive`).

## Instructions

1. **Run the real build** via the skill script (it wraps the project's own
   `npm run build`, which esbuild-bundles `src/index.ts` into a minified
   `dist/bundle.js`):

   ```bash
   node .agents/skills/analyzing-bundle-size/scripts/analyze-bundle-size.mjs
   ```

   The script prints the real byte size of `dist/bundle.js`. Never estimate the
   size "by hand" — run the script.

2. **Explain the number.** Keep the explanation grounded in the entry point
   chain `app/src/index.ts` → `app/src/widgets/index.ts` (which imports every
   widget module for its `register()` side effect) → the widget factories. Every
   widget wired into `widgets/index.ts` is included in the bundle.

3. **For before/after** (e.g. after adding a widget): run the script once
   before the change and once after, and report the delta in bytes/KiB. Do not
   guess the impact — measure it.

## Verify

- The script ran successfully (`node .../scripts/analyze-bundle-size.mjs`) and
  printed a concrete size, e.g. `dist/bundle.js — 1234 bytes (1.21 KiB)`.
- The build is real: `app/scripts/build.mjs` produced `app/dist/bundle.js` via
  `npm run build`.
- The script did not touch anything outside `app/` and made no network calls.
- Explanation references only the real entry chain
  (`src/index.ts` → `src/widgets/index.ts` → widgets).
