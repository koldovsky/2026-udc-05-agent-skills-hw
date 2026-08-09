---
name: analyzing-bundle-size
description: Measures app/'s real bundle — runs npm run build, reads dist/bundle.js, reports raw + gzip bytes and what each widget costs. Use for any "how big / how much did this add / does it fit the budget" question about the bundle, and before/after any change that adds a widget or an import. Never answer bundle weight from memory or from reading source; this skill exists because the number must be measured.
---

# Analyzing bundle size

## When to use this

**Scope check — before reading further.** This skill produces *numbers*, from a
build that just ran. It does not write widgets and does not explain design.

- **Applies:** "how big is the bundle", "what does `dist/bundle.js` weigh",
  "how much did this change add", "will this fit in X KB", "what does one more
  widget cost", any size-impact question in review.
- **Does not apply:** adding a widget → `creating-widget`. Explaining module
  boundaries or *why* nothing tree-shakes → `architecture-deep-dive`.
- **Both can apply:** "is it worth adding this widget?" — measure here, then
  answer the design half from `architecture-deep-dive`.

## Instructions

**Run the script. Do not estimate, do not add up source file sizes, do not
reuse a number from earlier in the conversation** — the bundle is minified, so
source bytes and bundle bytes are unrelated, and any prior number is stale the
moment a widget or import changes. For the same reason this file quotes **no
sizes**: the only trustworthy number is the one the run in front of you printed.

```bash
node .agents/skills/analyzing-bundle-size/scripts/measure-bundle.mjs
```

It runs `npm run build` in `app/` (esbuild → `app/dist/bundle.js`) and prints
the shipped `raw`/`gzip` bytes, then a per-widget marginal-cost table measured
by ablation builds.

Flags: `--json` (structured output — prefer it when you will compute a delta),
`--budget <bytes>` (raw-byte ceiling, exits 1 when over), `--skip-build` (reuse
the existing `dist/bundle.js` — only when you know nothing changed since),
`--help`. Exit codes: `0` measured, `1` budget exceeded, `2` build/setup failure.

**Quote both raw and gzip**, and report a marginal as "removing X saves ~N B",
never "X occupies exactly N B". Before interpreting the table, before answering
a before/after question, and if the table is flagged `[UNTRUSTED]`, read
[`references/interpreting-results.md`](references/interpreting-results.md) —
marginals deliberately do not sum to the total, and that file says why.

## Verify

The script's headline number must survive an independent re-derivation with the
project's own tools:

```bash
cd app
npm run build
wc -c dist/bundle.js                                        # must equal the script's raw bytes
node -e "import('./dist/bundle.js').then(m=>console.log(m.listWidgets()))"   # must list exactly the widgets the table names
node -e "const z=require('node:zlib'),f=require('node:fs');console.log(z.gzipSync(f.readFileSync('dist/bundle.js'),{level:9}).length)"   # must equal the gzip line
```

If `wc -c` and the script disagree, trust `wc -c` and treat the script as
broken. If `listWidgets()` names a widget the ablation table omits, the widget
is registered from somewhere other than a side-effect import in
`app/src/widgets/index.ts` — the script parses that file to find the widget set.

## Files

- `scripts/measure-bundle.mjs` — runs the real `npm run build` in `app/`, reads
  `dist/bundle.js`, gzips it in memory, and derives per-widget marginal cost
  from in-memory ablation builds (`write: false`, nothing extra hits disk, no
  network). Resolves `app/` from its own location, so cwd does not matter.
- `references/interpreting-results.md` — how to read the output, why marginals
  do not sum, the before/after delta workflow, and what `[UNTRUSTED]` means.
  Open it when interpreting, not when merely running.
