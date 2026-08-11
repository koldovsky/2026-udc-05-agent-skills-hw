---
name: analyzing-bundle-size
description: Measures the real bundle size of app/ by running the build and reading dist/bundle.js. Use when asked how big the bundle is, what a change costs in bundle size, or whether something affects bundle weight.
---

# Analyzing bundle size

## When to use this

- "How big is the bundle?", "what does it weigh?"
- "Did that change bloat the bundle?", "what does adding X cost?"
- Before/after comparisons around a change.

## Instructions

**Never state a bundle size you did not get from `scripts/measure-bundle.mjs`.**
A plausible-looking guess is the failure this skill exists to prevent — run the
script and quote its output.

To compare before and after: run it, make the change, run it again, and report
both numbers plus the delta. The script keeps no baseline, so the "before" number
must be captured before editing.

If the build fails the script exits non-zero and prints no size. Report the build
failure — do not fall back to an earlier number or an estimate.

Two figures come back. `raw` is the minified bytes on disk; `gzip` is what an
HTTP response body actually costs, and is the one to lead with when the question
is about download weight.

## Scripts

- `scripts/measure-bundle.mjs` — runs `npm run build` in `app/` (esbuild →
  minified ESM) and measures the resulting artifact off disk. Resolves `app/`
  from its own location, so it works from any directory.

  ```bash
  node .agents/skills/analyzing-bundle-size/scripts/measure-bundle.mjs
  node .agents/skills/analyzing-bundle-size/scripts/measure-bundle.mjs --json
  ```

  `--json` prints only JSON on stdout (progress goes to stderr), so it is safe
  to pipe.

## Verify

The reported `raw` value must equal `wc -c app/dist/bundle.js`. Cross-check
`gzip` with `gzip -9 -n -c app/dist/bundle.js | wc -c` — the `-n` matters, since
without it the CLI adds a 10-byte filename header that an HTTP response does not.
