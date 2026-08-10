---
name: analyzing-bundle-size
description: Use when asked to check the bundle size of this library or the size impact of a code change (e.g. "how big is the bundle?", "did this change grow the bundle?").
---

# Analyzing Bundle Size

## Instructions

Run `node .agents/skills/analyzing-bundle-size/scripts/bundle-size.mjs` from
the repo root. It runs the real `npm run build` in `app/` and reads the
actual `app/dist/bundle.js` file size — report the number it prints, don't
guess or estimate one.

## Verify

- `node .agents/skills/analyzing-bundle-size/scripts/bundle-size.mjs` prints
  a real byte count (not a placeholder).

## Scripts

- scripts/bundle-size.mjs — runs `npm run build` in `app/` and reports the size of `app/dist/bundle.js`.
