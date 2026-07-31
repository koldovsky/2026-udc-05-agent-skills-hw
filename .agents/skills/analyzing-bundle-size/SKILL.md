---
name: analyzing-bundle-size
description: Use when asked to check, measure, or reduce the library's bundle size, or to assess the size impact of a code change. Provides the workflow for building, measuring, and comparing bundle output.
---

# Analyzing Bundle Size

## When to use this

- The user asks "how big is the bundle?", "what's the bundle size?", "check the build output".
- The user wants to know how a change (new widget, refactor) affects the final bundle.
- The user asks to optimize, reduce, or analyze what's included in the bundle.

## Instructions

### Measure current bundle size

```bash
cd app && npm run build
```

This runs esbuild: `src/index.ts` → `dist/bundle.js` (minified). The command prints the byte size on completion.

### Compare before/after a change

1. Run `npm run build` and note the size **before** the change.
2. Apply the change.
3. Run `npm run build` again and note the size **after**.
4. Report the delta (absolute bytes and percentage).

Use the script `scripts/measure-bundle.sh` for automated before/after comparison when available.

### Key facts about this project's bundle

- Entry point: `app/src/index.ts` → imports `app/src/widgets/index.ts`.
- `widgets/index.ts` uses **side-effect imports** (`import "./badge/badge.js"`) to trigger `register()` calls.
- Tree-shaking is limited: every imported widget ends up in the bundle regardless of consumer usage.
- Adding a new widget always increases bundle size (there is no lazy loading).
- The bundle format is ESM, minified by esbuild.

### What to report

When answering a bundle-size question, always include:
1. The exact byte size of `dist/bundle.js` (from build output).
2. If comparing: the before/after delta.
3. Context: what caused the size (e.g. "the new spinner widget added ~120 bytes minified").
4. If asked to optimize: explain that side-effect imports prevent tree-shaking, and that splitting would require a different architecture (dynamic `import()`).

## Verify

- `npm run build` completes without errors.
- `dist/bundle.js` exists after the build.
- Reported size matches the actual file size (`wc -c < app/dist/bundle.js` or build output).

## Scripts

- `scripts/measure-bundle.sh` — automates build + size measurement (invoke with `bash scripts/measure-bundle.sh` from the repo root).
