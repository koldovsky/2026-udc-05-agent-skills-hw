---
name: analyzing-bundle-size
description: Measures the real size of app/dist/bundle.js by running the project's actual esbuild build and reading the file — never estimating. Use when asked how big the bundle is, whether a change (e.g. a new widget) affects bundle size, or to compare bundle weight before and after an edit.
---

# Analyzing bundle size

Bundle size is a **measured number, not an estimate**. A language model
guessing "roughly 2 KB" is worse than useless here — the build is one command
away and the answer is exact. This skill always runs the real build.

## When to use this

- "How big is the bundle?" / "What's the current bundle size?"
- "Does adding this widget affect the bundle?" — measure before and after.
- Reviewing a change for size impact, or checking the effect of a dependency.

## Instructions

Run the script from the **repo root**:

```bash
node .agents/skills/analyzing-bundle-size/scripts/measure-bundle.mjs
```

It runs `npm run build` in `app/` (esbuild: `src/index.ts` → `dist/bundle.js`,
minified, ESM), then `stat`s the output and reports its real byte size, gzipped
size, and the registered widget count for context.

**To compare a change** (`--baseline` / `--compare`):

1. With the working tree **before** the change:
   `node .agents/skills/analyzing-bundle-size/scripts/measure-bundle.mjs --baseline`
   — this writes the measurement to `app/dist/.bundle-baseline.json`.
2. Apply the change (e.g. add the widget).
3. `node .agents/skills/analyzing-bundle-size/scripts/measure-bundle.mjs --compare`
   — reports the new size plus the delta against the saved baseline.

Reporting rules:

- Quote the **exact byte count** the script printed. Don't round it into a
  vague claim, and don't reuse a number from earlier in the conversation —
  re-run after any source change.
- If the script fails, report the failure and the build error. Do **not**
  fall back to estimating a number.
- Prerequisite: `cd app && npm install` must have run at least once (esbuild
  is a devDependency and its postinstall must be allowed). If esbuild is
  missing, say so rather than reporting a size.

Context for interpreting the result: every registered widget lands in the
bundle. `app/src/index.ts` re-exports from `widgets/index.ts`, which
side-effect-imports every widget module, so the registry map keeps all of them
reachable from the entry point — nothing tree-shakes away. Bundle size
therefore grows roughly linearly with widget count.

## Verify

- The script exits 0 and prints a byte count that matches reality:
  `node -e "console.log(require('fs').statSync('app/dist/bundle.js').size)"`.
- The number changes when you add a widget and re-run — if it doesn't, the
  build didn't actually rerun or the widget isn't wired into
  `app/src/widgets/index.ts`.

## Scripts

- `scripts/measure-bundle.mjs` — runs the real `npm run build` in `app/` and
  reports actual bytes (raw + gzipped) for `app/dist/bundle.js`. Flags:
  `--baseline` (save current measurement), `--compare` (diff against saved
  baseline), `--json` (machine-readable output).
