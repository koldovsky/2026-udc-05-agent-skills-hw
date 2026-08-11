---
name: analyzing-bundle-size
description: Measures the real, current size of app/dist/bundle.js by running the actual esbuild build — never estimate or guess a byte count from reading source. Use this whenever asked to check bundle size, estimate the impact of a change on bundle size, or answer "how big is the bundle" / "did that change bloat the bundle" for this widget-registry library. Not applicable to explaining why the codebase is structured a certain way (see architecture-deep-dive) or to adding new widgets (see creating-widget).
---

# Analyzing bundle size

<!--
Everything below this line only loads into context when the agent actually
invokes the skill — keep the frontmatter description tight (it's ALWAYS in
context for every skill you have installed), and put the real instructional
weight here.
-->

## When to use this

- The user asks how big the bundle is, or wants a bundle-size check.
- The user asks whether a change (new widget, refactor, dependency) grew or
  shrank the bundle — run the script before and after the change to compare.
- Not applicable to general architecture questions (`architecture-deep-dive`)
  or to scaffolding a new widget (`creating-widget`).

## Instructions

Counting bytes by eyeballing source is not something a model can do
reliably — the actual number only exists after esbuild bundles and
minifies. Don't estimate; run `scripts/measure-bundle-size.mjs`, which runs
the project's real `npm run build` (`app/scripts/build.mjs`, esbuild bundle
+ minify) and then reads the resulting `app/dist/bundle.js` with `statSync`:

```
node .agents/skills/analyzing-bundle-size/scripts/measure-bundle-size.mjs
```

Report the number the script prints, not a guess. To measure the impact of
a change, run the script once before the change (or on `main`) and once
after, and report both numbers plus the delta.

## Verify

- The reported byte count must come from this run's script output — if you
  find yourself typing a number the script didn't print, stop and run it.
- If the script fails, read the build error it surfaced (it runs with
  `stdio: "inherit"`, so esbuild/tsc errors show directly) rather than
  reporting a stale or invented size.
