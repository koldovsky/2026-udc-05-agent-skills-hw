# Task C — verification: the script is real, and the agent actually calls it

**Skill under test:** `analyzing-bundle-size`
**Script:** `.agents/skills/analyzing-bundle-size/scripts/measure-bundle.mjs`
**Tool:** Claude Code 2.1.226 (headless, one fresh session per run)
**Date:** 2026-08-09 · Node v26.0.0 · esbuild 0.24.2

Task C asks for two different proofs, and they fail in different ways:

- **Step 3 — the script does real work.** Fails as a stub: a script that prints
  a plausible number without building anything.
- **Step 4 — the agent reaches for it.** Fails as a *guess*: the model answers
  "bundle is about 2 KB" from reading source, or builds by hand and quotes a
  number it derived with a different method than the skill defines.

Both are checked below. Step 4 is scored on one discriminator fixed before the
runs: **does the tool trace contain a `measure-bundle.mjs` invocation before the
number appears in the answer?** Evidence is the trace, never the agent's own
account of itself — the rule established in
[task-a-verification.md](./task-a-verification.md#run-2--the-defect), where a run
claimed not to have used a skill it had demonstrably read.

## Shape of the skill

| File | Lines | Tier | Loaded |
|---|---|---|---|
| `SKILL.md` | 74 | 1 | whenever the skill triggers |
| `references/interpreting-results.md` | 141 | 2 | only when output must be *interpreted* |
| `scripts/measure-bundle.mjs` | 226 | 3 | only when executed |

Neither tier-1 nor tier-2 file quotes a single byte count. That is deliberate:
a skill whose one rule is "never reuse a stale number" must not ship a worked
example with numbers baked into it, or the agent can answer from the document
instead of from the build. Run A2 below tests that the tier-2 split actually
holds — that the reference is *not* pulled in when only a measurement is asked
for.

## Step 3 — I ran it

### Plain run

```
$ node .agents/skills/analyzing-bundle-size/scripts/measure-bundle.mjs; echo "exit=$?"
npm run build → app/dist/bundle.js
  raw   567 B
  gzip  346 B

marginal cost per widget (ablation builds)
  badge        98 B raw     37 B gzip   17% of raw
  spinner     156 B raw     68 B gzip   28% of raw
  (baseline)  219 B raw    187 B gzip   registry + entry, no widgets
  attribution check: un-ablated build == dist/bundle.js byte for byte (sha256 328c47c9e812) ✓
exit=0
```

Cross-checked against the project's own tools, independently of the script:

```
$ cd app && wc -c dist/bundle.js
     567 dist/bundle.js
$ node -e "import('./dist/bundle.js').then(m=>console.log(m.listWidgets()))"
[ 'badge', 'spinner' ]
$ node -e "const z=require('node:zlib'),f=require('node:fs');console.log(z.gzipSync(f.readFileSync('dist/bundle.js'),{level:9}).length)"
346
$ shasum -a 256 dist/bundle.js
328c47c9e812974a8bcbfe2e406bf34679fbca0ad4a8a733462ee61e37cddaf1  dist/bundle.js
```

Raw, gzip, the widget set **and the sha256 the script prints** all match — the
numbers come from the build, not from the script's imagination.

`cd app && npm test` → 5 passed. `npm run typecheck` → clean.

### Flags and exit codes

| Invocation | Result | Exit |
|---|---|---|
| (no flags) | report above, after a real `npm run build` | 0 |
| `--json` | valid JSON: `shipped.raw` 567, `shipped.gzip` 346, `shipped.hash`, `attribution.trusted true`, `attributionError null` | 0 |
| `--budget 100 --skip-build` | `budget 100 B raw → OVER (567% used)` | **1** |
| `--budget 2000 --skip-build` | `budget 2000 B raw → ok (28% used)` | 0 |
| `--budget 0` | `--budget needs a positive byte count` | **2** |
| `--budget abc` | same message | **2** |
| `--skip-build` from `/tmp` (foreign cwd) | same numbers — `app/` is resolved from the script's own path | 0 |
| `--nope` | `measure-bundle: unknown flag --nope (try --help)` | **2** |
| `--help` | header comment of the file, so help text cannot drift from behaviour | 0 |

### The drift guard, deliberately tripped

The per-widget table comes from in-memory ablation builds whose options are a
*copy* of `app/scripts/build.mjs` — a copy that can silently rot. The guard is
that the **un-ablated** ablation build must reproduce `dist/bundle.js`
**byte for byte, by sha256**. Two trips, each reverted immediately after:

`minify: true` → `false`:

```
marginal cost per widget (ablation builds)  [UNTRUSTED]
  badge       201 B raw     55 B gzip   35% of raw
  spinner     282 B raw     85 B gzip   50% of raw
  (baseline)  376 B raw    256 B gzip   registry + entry, no widgets
  attribution check: synthetic 1020 B != shipped 567 B — BUILD_OPTIONS has drifted
  from app/scripts/build.mjs, or dist/bundle.js is stale (--skip-build); re-sync
  and re-run before quoting the table above
```

Adding `keepNames: true` trips it the same way (735 B ≠ 567 B).

The headline `raw 567 B / gzip 346 B` stayed correct throughout both trips,
because it is read off the artefact the real build produced and no ablation
feeds it. That is the intended failure mode: **wrong attribution announces
itself; the measured number never degrades silently.**

### Why the guard hashes instead of comparing sizes

A size-only guard has a real false negative, and this script hit it. The first
implementation built a *hand-written* synthetic entry (`stdin` with the imports
copied out of `widgets/index.ts`) rather than ablating the real `src/index.ts`
graph. Measured against the shipped bundle:

```
synthetic 567 B  sha256 aeb8c6b4e7fe
shipped   567 B  sha256 328c47c9e812   ->  equal size, different bytes
```

Identical length, different content: esbuild mangles identifiers in a different
frequency order when the module graph differs, so `i`/`n` are swapped throughout.
A size comparison passes this; a hash does not. The fix was structural rather
than cosmetic — ablate by swapping a module *inside the real entry graph*
([`ablatePlugin`](../.agents/skills/analyzing-bundle-size/scripts/measure-bundle.mjs)),
which makes the un-ablated build genuinely identical to `npm run build` output
and so makes the byte-for-byte claim true rather than approximate.

I also probed whether any single `BUILD_OPTIONS` change reproduces the
same-size-different-bytes case: of 11 candidates, `platform: browser|node`,
`target: es2020`, `charset: utf8`, `mangleQuoted` and `treeShaking: false` are
byte-identical to the shipped bundle (so attribution stays valid — correctly not
flagged), and the rest change the size. The false negative is therefore a
*structural* drift, not a flag drift — which is precisely the kind a reviewer
would not catch by eye.

## Step 4 — does a fresh agent call it?

```bash
claude -p "<prompt>" --output-format stream-json --verbose \
  --allowedTools "Read" "Glob" "Grep" "Bash"
```

`Bash` is allowlisted in every run, including the control — otherwise the
control could not build even if it wanted to, and the comparison would measure
permissions instead of the skill.

| # | Config | Prompt | Script invoked? | Reference opened? | Number |
|---|---|---|---|---|---|
| A | skill present | `яка зараз вага бандла?` | ✅ yes | ❌ no (correct) | 567 B raw / **346 B** gzip |
| A2 | skill present | `чому маржинальні розміри віджетів не дають у сумі загальну вагу бандла?` | ❌ no (correct) | ✅ yes | — (none needed) |
| B | **skill removed** (control) | `яка зараз вага бандла?` | — (absent) | — | 567 B raw / **356 B** gzip |

### Run A — measurement prompt

Trace, in order:

```
Bash   ls .agents/skills/analyzing-bundle-size/ && ls app
Read   AGENTS.md
Read   .agents/skills/analyzing-bundle-size/SKILL.md
Bash   node .agents/skills/analyzing-bundle-size/scripts/measure-bundle.mjs   <- the measurement
Bash   cd app && wc -c dist/bundle.js && node -e "…gzipSync…"
```

6 turns, 26 s. The last line is unprompted: the agent ran the skill's own
`## Verify` block and reported that the independent re-derivation agreed. It
carried over the caveat the skill states — "прибрати spinner → економія ~156 B",
explicitly not "spinner займає рівно 156 B" — and quoted the byte-for-byte
attribution check. **It never opened `references/interpreting-results.md`**: for
a plain measurement the tier-2 file is not needed, and it was not loaded.

### Run A2 — interpretation prompt

```
Bash   ls -R .agents/skills/analyzing-bundle-size/
Bash   cat docs/task-b-verification.md | head -80
Read   .agents/skills/analyzing-bundle-size/references/interpreting-results.md
Read   .agents/skills/analyzing-bundle-size/SKILL.md
```

5 turns, 30 s. The mirror image of run A: the reference **was** opened, and the
script was **not** run — correctly, since the question is about method, not
about a current number. The answer reproduced both causes of the gap (shared
code attributable to no single widget; minifier wins available only in the
ablated build), gave the ✅/❌ phrasing rule, cited the reference by line, and
closed by offering to run the script for live figures rather than inventing
any. Together A and A2 are the evidence that the tier-1/tier-2 split is load-
bearing and not decorative: each prompt pulled in exactly one of the two.

### Run B — negative control

Removed for this run, then restored: the whole
`.agents/skills/analyzing-bundle-size/` directory moved **outside**
`.agents/skills/` (per the walkthrough's warning that an in-place rename is not
reliable), plus the `analyzing-bundle-size` bullet in `app/AGENTS.md` — that
bullet is part of the skill's delivery, and leaving it in would have pointed the
agent at a script that no longer existed.

```
Bash   ls app && cat app/package.json
Bash   ls -la && cat AGENTS.md | head -60
Bash   ls -R .agents/skills; ls -la app/dist; cat …
Bash   cd app && npm run build 2>&1 | tail -3 && gzip -c dist/bundle.js | wc -c
```

5 turns, 24 s. The control is competent — it built the bundle rather than
guessing, and got the raw size right. The gap is in everything around the
number:

| | A (skill) | B (control) |
|---|---|---|
| Raw size | 567 B | 567 B |
| Gzip size | **346 B** | **356 B** |
| Per-widget marginal cost | badge 98 B / spinner 156 B, measured by ablation | not attempted |
| Method stability | one command, same numbers every time | ad-hoc pipeline, re-derived per session |
| Self-check | ran the skill's `## Verify`, confirmed agreement | none |

**The 10-byte gzip discrepancy is the whole point of this task.** Both runs are
"honest"; only one is reproducible. The control used `gzip -c`, which defaults
to compression level 6 and writes a gzip header carrying the filename and an
mtime; the skill's script uses `zlib.gzipSync(buf, { level: 9 })` on the bytes
alone. Two defensible methods, two different numbers — and if two sessions pick
different ones, a "bundle grew by 10 B" report is pure noise. A script does not
just save the agent work; it **pins the method** so that numbers taken a week
apart are comparable.

## What this proves — and what it does not

- **Proven:** the script runs the real build and reads the real artefact (step
  3, cross-checked four ways including sha256); its failure modes are loud
  (exit 1 budget, exit 2 setup, `[UNTRUSTED]` attribution, and `attributionError`
  in `--json`); the drift guard catches a same-size drift that a size check
  waves through; and with the skill present the agent loads exactly the tier it
  needs and measures before answering (step 4).
- **Not proven:** that *every* phrasing routes correctly — three runs on one
  machine, one tool, one model. The control also shows the floor is not zero: a
  capable agent will build the bundle by hand, so the skill's measurable value
  here is method stability and per-widget attribution, not "it made an
  impossible answer possible".
- **Repo state:** both drift trips and the control's file moves were reverted;
  `git status` shows only the Task C deliverables. `cd app && npm test` (5
  passed) and `npm run typecheck` are green; `app/dist/` remains gitignored.
