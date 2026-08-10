# Reference: reading a `measure-bundle` report

## Overview

This file is the depth behind the `analyzing-bundle-size` skill: what the two
size columns mean, why the per-widget marginals deliberately do not add up to
the total, how to answer a before/after question, and what to do when the table
is flagged `[UNTRUSTED]`. It is separate from `SKILL.md` because none of it is
needed to *run* the script — only to interpret what it printed (progressive
disclosure, tier 2).

**This file quotes no byte counts.** The skill's whole premise is that the only
trustworthy number is the one your run just produced; a worked example with
frozen sizes in it would be the exact failure the skill exists to prevent.

## The report, field by field

```text
npm run build → app/dist/bundle.js
  raw   <N> B
  gzip  <N> B

marginal cost per widget (ablation builds)
  <name>      <N> B raw    <N> B gzip   <P>% of raw
  (baseline)  <N> B raw    <N> B gzip   registry + entry, no widgets
  attribution check: un-ablated build == dist/bundle.js byte for byte (sha256 <hex>) ✓
```

- **`raw`** — the minified file on disk, exactly what `wc -c app/dist/bundle.js`
  reports. This is the headline number, and it comes from the build the script
  just ran, never from a cache or an estimate.
- **`gzip`** — `zlib.gzipSync(bytes, { level: 9 })` over that same file, roughly
  what crosses the wire. **Quote both.** A widget that repeats existing markup
  patterns is far cheaper gzipped than raw, and this library is nothing but
  repeated markup patterns, so the raw number alone systematically overstates
  what a new widget costs a user.
- **`<P>% of raw`** — that widget's marginal raw bytes as a share of the shipped
  raw total. A share of `raw`, never of `gzip`; the two do not scale together.
- **`(baseline)`** — a build with every widget ablated: the registry plus the
  entry point. This is the floor the project pays before any widget exists.

### Why gzip level 9, and why it matters that the script pins it

`gzip -c file | wc -c` (the obvious shell equivalent) defaults to compression
level 6 **and** writes a header carrying the original filename and an mtime, so
it reports a different, non-reproducible number for identical bytes. Both
methods are defensible; only one is stable across sessions. The script exists as
much to *pin the method* as to save the work — two numbers taken a week apart
are only comparable if they were produced the same way. If you ever compare
against a number you did not produce with this script, say so explicitly.

## Marginal cost, and why the numbers do not sum

Marginals are measured by **ablation**: the script builds the real entry point
with the widget, and again with that widget's module replaced by an empty one,
and reports the difference. That is the honest answer to "what does this widget
cost us" in this project specifically, because **every registered widget ships
whether or not anyone calls `create()` for it** — registration is a module-load
side effect, so nothing tree-shakes it away (see
[`architecture-deep-dive` → the bundle consequence](../../architecture-deep-dive/references/architecture.md#the-bundle-consequence)).

`baseline + Σ marginals` comes out **below** the shipped total, and the gap is
real, not rounding:

- code shared between widgets, which survives as long as any one of them is
  present and is therefore attributed to none of them;
- minifier wins that are only available when a widget is absent — shorter
  mangled identifiers, fewer live bindings.

The consequence for how you phrase an answer:

- ✅ "removing `<name>` would save about N B raw / M B gzip"
- ❌ "`<name>` occupies N B of the bundle"

The second is a claim about attribution that ablation cannot support, and it
invites the follow-up "so what do the parts add up to?" — which has no clean
answer.

## Answering a size-*impact* question

Measure twice, quote the delta — never infer it, and never subtract from a
number quoted earlier in the conversation:

```bash
node .agents/skills/analyzing-bundle-size/scripts/measure-bundle.mjs --json > before.json
# ... make the change ...
node .agents/skills/analyzing-bundle-size/scripts/measure-bundle.mjs --json > after.json
```

- Whole-bundle answer: `shipped.raw` / `shipped.gzip` between the two runs.
- Per-widget answer, if the change added a widget: that widget's own line in the
  `after` run's `attribution.widgets`.
- CI-style check: `--budget <bytes>` and let the exit code decide (`1` = over).

If the change has **not been made yet** ("how much would another widget add?"),
you cannot measure it. Bound it with the observed spread of the existing widget
marginals, label it explicitly as a projection from those, and say it needs a
real measurement afterwards.

## When the table says `[UNTRUSTED]`

The ablation builds come from `npm run ablate` (`app/scripts/ablate.mjs`), which
shares `app/scripts/build-options.mjs` with `app/scripts/build.mjs` — the two
builds cannot drift by editing one and forgetting the other. They can still
disagree for other reasons, so the guard stays: the **un-ablated** ablation
build must reproduce `app/dist/bundle.js` byte for byte, compared by sha256 —
not by size, since a diverged build can easily land on the same byte count with
different contents. This works only because the script ablates by swapping
modules inside the *real* `src/index.ts` graph; a hand-written synthetic entry
would produce a differently mangled — and so never hash-equal — bundle.

When the hashes differ the script prints `[UNTRUSTED]` and names the likely
cause:

- **after a real build** — `ablate.mjs` no longer reproduces what `build.mjs`
  writes (an option applied on only one side, or a plugin that leaks into the
  un-ablated build). Fix that, then re-run.
- **under `--skip-build`** — either that same divergence, or `dist/bundle.js` is
  simply stale relative to the source. Re-run without `--skip-build` first; if
  it still disagrees, the two builds really have parted ways.

Either way: **the headline `raw`/`gzip` numbers remain valid** — they are read
off the artefact the real `npm run build` produced, and no ablation feeds them.
Only the per-widget table is suspect. That asymmetry is the intended design:
wrong attribution announces itself, and the measured number never degrades
silently.

## Failure modes that are not `[UNTRUSTED]`

| Symptom | Meaning |
|---|---|
| exit `2`, `\`npm run build\` failed` | the build is broken — fix that first; there is no number to report |
| exit `2`, `cannot find the app at …` | the script was moved out of `.agents/skills/<name>/scripts/`; it resolves `app/` four levels up from itself |
| `marginal cost per widget: unavailable — …` | the headline numbers are still real; only ablation failed (usually `esbuild` missing → `npm install` in `app/`). In `--json` the reason is in `attributionError` |
| exit `1` | not an error — the budget you passed was exceeded |
| a widget in `listWidgets()` but not in the table | it is registered from somewhere other than a side-effect import in `app/src/widgets/index.ts`, which is the only place the script looks |

## Related

- [`SKILL.md`](../SKILL.md) — when to invoke the skill, and the `## Verify` block
  that re-derives the headline number with the project's own tools.
- [`architecture-deep-dive`](../../architecture-deep-dive/SKILL.md) — why
  registration is a load-time side effect, and why that makes every widget
  unconditional weight.
