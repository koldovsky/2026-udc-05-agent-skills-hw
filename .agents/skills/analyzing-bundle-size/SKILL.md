---
name: analyzing-bundle-size
description: Use whenever the user asks about this project's bundle size — e.g. "how big is the bundle?", "what's the current bundle weight?", "did that change affect bundle size?", or before/after adding a widget or dependency to check the impact. Always run the script rather than estimating or reading source to guess a byte count — minified esbuild output size is not something to eyeball from source, and a guessed number is worse than no answer.
---

# Analyzing Bundle Size

`app/dist/bundle.js` is esbuild's minified output — its byte size depends on
minification, tree-shaking, and exact dependency versions, none of which are
predictable by reading `app/src/**`. The only correct way to answer "how big
is the bundle" is to actually build it and read the file.

## When to use this

- The user asks for the current bundle size or weight.
- The user asks whether a change (new widget, new dependency) affected
  bundle size — run the script before and after the change and compare.
- Not for general build failures unrelated to size — just re-run
  `cd app && npm run build` directly for that.

## Instructions

Run the script:

```bash
node .agents/skills/analyzing-bundle-size/scripts/measure-bundle-size.mjs
```

It runs `npm run build` in `app/` (which runs `app/scripts/build.mjs` —
esbuild bundling `app/src/index.ts` into `app/dist/bundle.js`, minified) and
then reads the real file size with `fs.statSync`, printing both bytes and
KB. Report the number it prints — don't estimate, don't reuse a number from
a previous run without re-running, since any source change invalidates the
old number.

## Verify

- The script's own build step must succeed (esbuild errors surface via
  `stdio: "inherit"`, so a build failure is visible, not swallowed).
- `ls -la app/dist/bundle.js` after running — the file's mtime should be
  current, confirming the number came from a fresh build, not a stale one.

## Scripts

- `scripts/measure-bundle-size.mjs` — runs `npm run build` in `app/` and
  prints the real `app/dist/bundle.js` size. Resolves the repo root from its
  own file path, so it works from any working directory.
