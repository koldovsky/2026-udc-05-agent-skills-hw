---
name: analyzing-bundle-size
description: Measure the real bundle size for this widget-registry app. Use when asked for the current bundle weight, bundle size, app/dist/bundle.js size, or the bundle-size impact of a code change.
---

# Analyzing Bundle Size

## Instructions

Use the bundled script instead of estimating bundle size from source code.
Bundle size questions must be answered from a real `npm run build` in `app/`
and a real filesystem stat of `app/dist/bundle.js`.

Run:

```bash
node .agents/skills/analyzing-bundle-size/scripts/measure-bundle-size.mjs
```

Report the script output directly. If the user asks for impact after a change,
run the script before and after the change when possible and compare the byte
counts.

Do not modify `app/src/core/registry.ts` for bundle-size reporting. The app's
existing build command is `npm run build`, which uses `app/scripts/build.mjs`
and writes `app/dist/bundle.js`.

## Scripts

- `scripts/measure-bundle-size.mjs` — runs `npm run build` in `app/`, reads
  `app/dist/bundle.js`, and prints the bundle size in bytes and KiB.

## Verify

Run:

```bash
node .agents/skills/analyzing-bundle-size/scripts/measure-bundle-size.mjs
```

The output must include a real byte count for `app/dist/bundle.js`, not a
placeholder or estimated value.
