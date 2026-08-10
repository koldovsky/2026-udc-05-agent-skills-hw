---
name: analyzing-bundle-size
description: Use when the user asks about the bundle size of the widget-registry library, wants to measure the impact of a change on dist/bundle.js, or needs to compare sizes before and after a change. Runs a real build and reads the actual file size — do not guess or estimate.
---

# Analyzing Bundle Size

## When to use this

- "What is the current bundle size?"
- "How big is dist/bundle.js?"
- "Will adding this widget increase the bundle size?"
- "Compare bundle size before and after this change"

## Instructions

**Never guess the bundle size.** Always run the script to get the real number.

### Run the script

```bash
node .agents/skills/analyzing-bundle-size/scripts/analyze-bundle-size.mjs
```

This runs `npm run build` in `app/` and reports the actual size of `app/dist/bundle.js`.

### To compare before/after a change

1. Run the script — note the baseline size
2. Make the change
3. Run the script again — compare

### Build details

- Entry point: `app/src/index.ts`
- Output: `app/dist/bundle.js` (minified, esbuild)
- Command: `cd app && npm run build`

## Scripts

- `scripts/analyze-bundle-size.mjs` — runs `npm run build`, reads `dist/bundle.js` size, prints bytes and KB
