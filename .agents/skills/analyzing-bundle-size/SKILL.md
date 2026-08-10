---
name: analyzing-bundle-size
description: Measure real bundle size for this project by running the actual build and reporting bytes from `app/dist/bundle.js`. Use when the user asks for current bundle size or size impact of a change.
---

# Analyzing Bundle Size

## When to use this

- User asks for current bundle size.
- User asks whether a change increased or decreased bundle weight.
- User asks for a build-size check based on real output, not estimates.

## Instructions

1. Run the dedicated script in this skill instead of guessing size.
2. The script must:
   - run `npm run build` inside `app/`
   - read `app/dist/bundle.js`
   - print size in bytes and KiB
3. If build fails, return the build error and do not fabricate numbers.
4. If asked for change impact, run before/after and report deltas.

## Verify

- Run script manually:
  - `node .agents/skills/analyzing-bundle-size/scripts/report-bundle-size.mjs`
- Confirm output includes:
  - absolute path to `bundle.js`
  - file size in bytes and KiB

## Scripts

- `scripts/report-bundle-size.mjs` - Runs `npm run build` in `app/`, reads `dist/bundle.js`, and reports measured size.

