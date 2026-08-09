# A/B validation (Task D)

**Skill under test:** `creating-widget`
**Prompt (identical in every run):** the change request from
[`materials/ab-task.md`](../materials/ab-task.md) — add an `alert` widget. Extracted
from that file programmatically, never retyped, never reworded
([`ablation-harness.sh`](./task-d/ablation-harness.sh) `setup`).
**Tool:** Claude Code 2.1.226, headless (`claude -p`), one fresh session per run,
same allowlist everywhere: `Read Write Edit Glob Grep Bash TodoWrite`.
**Date:** 2026-08-09 · Node v26.0.0 · **17 sessions** (5 configurations)
**Reproduce:**

```bash
bash docs/task-d/ablation-harness.sh setup
bash docs/task-d/ablation-harness.sh run          # one trial per rung
bash docs/task-d/ablation-harness.sh trials 5     # rungs A/B/E, trials 2..5
LAB=… python3 docs/task-d/grade.py rubric|pertrial|trials|trace
```

Every number below is a line in [`docs/task-d/results/`](./task-d/results/) —
that directory is the grader's output, committed verbatim, not retyped.

## Why two cells were not enough

The naive A/B — skill present vs skill deleted — has a confound in *this* repo,
and it is worth stating before the results rather than after: the golden path is
written down in at least five places, and deleting one skill removes exactly one
of them.

| Where the golden path also lives | Still present with the skill deleted? |
|---|---|
| `app/src/widgets/badge/` — a complete worked example, two files | yes (the prompt itself says "mirror the `badge` widget") |
| `app/AGENTS.md` — "One widget = one folder … self-registers" + a `## Skills` bullet restating the skill's four steps | yes |
| `materials/architecture-brief.md` — the three-step golden path, numbered | yes |
| `.agents/skills/architecture-deep-dive/references/architecture.md` — "A new widget → `<name>.ts` + `<name>.test.ts` + one import line" | yes |
| `docs/walkthrough.md` + `docs/task-a-verification.md` | yes |

So a two-cell test cannot distinguish "the skill works" from "the repo teaches
the same thing four other ways". The fix is to ablate in **layers** and see at
which layer the behaviour actually changes.

| Rung | What the agent can see | Purpose |
|---|---|---|
| **A** | everything (full skill library) | the skill-assisted condition |
| **B** | `creating-widget/` moved **out of** `.agents/skills/`; every pointer to it left in place | **the run Task D asks for** — walkthrough-literal removal |
| **C** | B, plus every mention of the skill scrubbed (`app/AGENTS.md` bullet, root `AGENTS.md`, `docs/`); other two skills stay | is the *pointer* doing the work? |
| **D** | no `.agents/` at all, no root docs; `app/AGENTS.md` + `materials/` remain (its `## Skills` bullets now dangle) | is the *skills layer* doing the work? |
| **E** | `app/` source only — no skills, no `AGENTS.md`, no `materials/` | the model-prior floor |

Rungs A/B/E were run **five times each** (n=5); C and D once. Each rung is a
full copy of the repo in its own git repo whose `HEAD` is the ablated baseline,
so `git diff` after a run shows exactly what the agent changed. The working repo
was only ever read. This write-up and its harness are stripped from **every**
rung, so no agent could read the result it was supposed to produce.

## Rubric — fixed before the first run

15 mechanical checks ([`grade.py`](./task-d/grade.py) `rubric`): file at
`widgets/alert/alert.ts`; colocated `alert.test.ts`; top-level
`register("alert", …)`; import line in `widgets/index.ts`; `.js` on every
relative import; named export, no default; no `any`;
`AlertProps extends WidgetProps`; tone union + `?? "info"` default; exact
markup; `core/registry.ts` untouched; `npm test` green; `tsc --noEmit` clean;
built bundle's `create("alert", …)` returns the exact HTML;
`listWidgets()` contains `alert`.

Thirteen of the fifteen also run **per trial** (`grade.py pertrial`), off that
trial's file snapshot and post-run capture. The other two — `registry.ts`
untouched, typecheck clean — need the full tree, which the next trial's reset
overwrites, so they are reported per rung only. Both splits are in
[`results/`](./task-d/results/): `pertrial.txt` and `rubric.txt`.

⚠️ **One of the fifteen did not hold up: read every rung as 14/14 decided, not
15/15.** A review after the runs found check 13 ("typecheck clean") scored the
exit code of `npm run typecheck 2>&1 | tail -4` — under `/bin/sh` that is
`tail`'s code, always 0, so the check passed unconditionally and proved nothing.
`grade.py`'s `sh()` now runs under `bash` with `set -o pipefail`, and 12 and 13
additionally assert on the output (`Tests N passed`, no `error TS`), so neither
can go vacuous again; verified by injecting a type error and seeing the pipeline
return 2. The lab directory was deleted before the bug was found, so the
recorded runs cannot be re-scored: **typecheck is unverified for all 17
sessions.** Nothing else moves — the A-vs-rest result rests on the trace facts
in `trials.txt`, which never touched this code path, and the other 14 checks
score identically on every rung either way. `results/rubric.txt` is left exactly
as the grader emitted it; its `PASS 13` lines are the bug's output, not evidence.

Behaviour is scored from the stream-json tool trace only — never from the
agent's own summary. That rule was earned in
[task-a-verification.md](./task-a-verification.md#run-2--the-defect), where a
run confidently denied reading a skill its trace showed it had read. This
experiment paid it off again: see B4 below.

## Result A — skill available

**15/15 per rung as scored — 14 of those decided, check 13 vacuous — and 13/13
in every one of the five trials.**
`app/src/widgets/alert/alert.ts`, colocated `alert.test.ts` (default tone +
explicit tone, exact-string assertions), `import "./alert/alert.js";` added to
`widgets/index.ts`, `core/registry.ts` untouched, 7/7 tests green, `tsc` clean,
and the built bundle reports `["alert","badge","spinner"]` with
`create("alert", {message:"Saved"})` → `<div class="alert alert--info">Saved</div>`.

The trace shows where that came from — trial A1, verbatim from
[`results/traces.txt`](./task-d/results/traces.txt):

```
Bash      find runA -type f -not -path '*/.git/*' -not -path '*/node_modules/*' | head -50
Read      .agents/skills/creating-widget/SKILL.md      <- before any Write
Read      app/src/widgets/badge/badge.ts, badge.test.ts, index.ts, core/registry.ts
Read      app/AGENTS.md
Write     app/src/widgets/alert/alert.ts
Write     app/src/widgets/alert/alert.test.ts
Edit      app/src/widgets/index.ts
Bash      cd app && export NAME=alert && export PROPS='{"message":"Saved"}' && npm test …
Bash      export NAME=alert && export PROPS='{"message":"Saved"}' && npm run build … && node -e
          "import('./dist/bundle.js').then(m => { console.log(m.listWidgets());
            console.log(m.create(process.env.NAME, JSON.parse(process.env.PROPS))) })"
```

`SKILL.md` was read before the first `Write` in **5 of 5** A trials. Those last
two commands are the `## Verify` block of `SKILL.md` executed as written,
`NAME`/`PROPS` exports included — that string appears in **5 of 5** A trials and
in **0 of the 12** sessions on every other rung. An unambiguous fingerprint that
the file was not merely read but followed.

## Result B — skill removed

**The same score on the same rubric — 15/15 per rung (14 decided) and 13/13 in
all five trials.** Same file locations, same
`register("alert", createAlert)`, same colocated test, same import line, tests
green, typecheck clean.

Two things changed, and neither is about the code:

- **Nobody proved the wiring at runtime.** 0 of 5 B trials built the bundle and
  called `create("alert", …)`; all five stopped at `npm test` + `npm run
  typecheck`. Both of those stay green even if `widgets/index.ts` is never
  touched — the colocated test imports the factory directly, so the one failure
  mode the skill exists to prevent is invisible to them.
- **The dangling pointer got noticed.** All 5 B trials ran `ls .agents/skills/`
  looking for the advertised skill; 4 of 5 said so in their answer, e.g. B4:
  "`app/AGENTS.md` points at a `creating-widget` skill for exactly this task,
  but `.agents/skills/` holds only `analyzing-bundle-size` and
  `architecture-deep-dive` — that skill dir does not exist." Removing a skill
  without removing its bullet is a real, self-inflicted paper cut.

B4 is also the trial that justifies scoring from traces. Its answer states the
widget "works via `create("alert", {...})`" — its trace contains no `npm run
build` and no `import('./dist/bundle.js')`. It never ran the thing it reported
as working. The claim happened to be true; the evidence for it did not exist.

## Difference table

The template's rows, filled honestly — this is the null half of the result:

| Aspect | A (skill available) | B (skill removed) |
|---|---|---|
| File location | `widgets/alert/alert.ts` | `widgets/alert/alert.ts` — identical |
| Registered via `register()` | yes, top-level | yes, top-level |
| Colocated test added | yes, 2 exact-string cases | yes, 2 exact-string cases |
| Wired into `widgets/index.ts` | yes, 5/5 | yes, 5/5 |
| Named exports / no `any` | yes | yes |
| **`alert.ts` raw bytes** | `sha256 77c0bc63ca7a…` | `sha256 77c0bc63ca7a…` — **one distinct hash across all 17 sessions** |
| `alert.test.ts` raw bytes | 2 variants (3× `62c44cb9…`, 2× `cd8782b0…`) | 1 variant (`cd8782b0…`, 5/5) |

`alert.ts` came out **byte-identical on every rung including E**, the copy with
no skills, no `AGENTS.md` and no `materials/` — one sha256 over all 17 files,
confirmed independently with `md5` over the snapshots. The two `alert.test.ts`
variants differ only in line wrapping plus one trailing comma; both are
whitespace-normalised separately in `grade.py` (`src`/`test` are raw-byte
hashes, `src_ws`/`test_ws` collapse whitespace), so "identical" here means
identical bytes, not identical formatting.

The prompt says "mirror the `badge` widget", `badge/` is a complete two-file
worked example, and imitation is enough to reproduce the golden path. On the
artefact, the skill's marginal value here is zero, and no amount of write-up
framing changes that.

Where the runs *do* separate is one rung up — in what the agent does after
writing the files:

| | A (skill) | B (walkthrough-literal) | C (pointers scrubbed) | D (no skills layer) | E (code only) |
|---|---|---|---|---|---|
| rubric, rung (14 decided of 15) | pass | pass | pass | pass | pass |
| 13/13 rubric (per trial) | 5/5 | 5/5 | 1/1 | 1/1 | 5/5 |
| ran the **runtime** wiring check | **5/5** | **0/5** | 0/1 | 0/1 | **0/5** |
| ran `SKILL.md`'s `## Verify` verbatim | 5/5 | 0/5 | 0/1 | 0/1 | 0/5 |
| read `creating-widget/SKILL.md` | 5/5 | — (absent) | — | — | — |
| opened another skill instead | 0/5 | 0/5 | 0/1 | — | — |
| median turns / seconds | 13 / 44 | 15 / 44 | 7 / 30 | 8 / 39 | 13 / 35 |
| median answer length | 828 ch | 855 ch | 479 ch | 635 ch | 497 ch |

Fisher exact, two-sided, on the runtime-check row: **A vs B p = 0.008**,
**A vs E p = 0.008**, **A vs all 12 non-A sessions pooled p = 0.00016**. Three
tests on one pre-specified row, uncorrected; the pooled one is the honest
headline, the other two are it split. The effect is the cleanest one this design
can produce — 5/5 against 0/12 — and it points at one behaviour, not at code
quality.

One caveat the numbers cannot remove: the outcome being measured is written
inside the treatment. `## Verify` in `SKILL.md` *is* the build-and-`create()`
step, so "A ran the runtime check" is partly "A did as instructed", and the
`export NAME=alert` fingerprint makes that explicit rather than hiding it. What
the ladder still buys is the other half of the claim — that no rung reproduced
the behaviour from `AGENTS.md`, `materials/`, the seeded `badge`, or the other
two skills (0/12). The skill did not merely get followed; nothing else supplied
the instruction.

C vs D is the answer to "is it the skill or the pointer?" Neither ran the
runtime check, and neither reached for a different skill: C (pointer scrubbed,
other skills present) spent its shortest session of the set — 7 turns — and D
reported the missing `.agents/` directory it had been pointed at. **The pointer
alone buys nothing; the prose behind it is the payload.** Both rungs are n=1, so
read them as consistent with the A/B result, not as independent evidence for it.

## Conclusion

The skill did not change *what* was built — the seeded `badge` widget already
teaches that, and all five configurations produced the same `alert.ts` down to
the byte. It changed *how the result was checked*: with the skill, the agent
built the bundle and called `create("alert", …)` in 5 of 5 runs, executing the
skill's own `## Verify` block; without it, 0 of 5 at every other rung. That gap
matters precisely because the missed check is the one that catches the classic
failure — a widget never imported in `widgets/index.ts` passes `npm test` and
`tsc` and throws `Unknown widget` in production.

What surprised me: (1) the artefact null result — I expected the control to at
least misplace the test or forget the import, and it never did, in 12 chances;
(2) the runtime check is *only* the skill's — no rung reproduced it from
`AGENTS.md`, from `materials/`, or from the other two skills; (3) the skill is
nearly free here — 13 turns / 44 s median against 15 / 44 for B and 13 / 35 for
E, i.e. the same work plus one build, not a heavier process.

Practical consequence for how the library is written: **put the value where
imitation cannot reach.** A `SKILL.md` that only restates what the seeded code
already shows earns nothing measurable; the `## Verify` block, which no example
file can demonstrate, is the part that survived every ablation.

## Honest notes on the run

- The first attempt at trials 2–5 died on `You've hit your session limit`: 12
  sessions returned `is_error` after 1 turn. They are **not** in the numbers
  above — they were re-run after the reset. The harness now detects that case,
  writes `FAILED_<tag>.txt` and refuses to snapshot, and `grade.py` prints and
  excludes any such session, because a session killed by the API is not evidence
  that the agent chose to do nothing.
- An earlier pilot of the same ladder ran before results were being kept; its
  raw traces went to a scratch directory that no longer exists. Nothing from it
  is quoted here — every figure comes from the 17 retained sessions.
- User-level Claude Code configuration (settings, plugins) was live during the
  runs. It is identical across rungs, so it cannot explain an A-vs-rest
  difference, but it does mean absolute turn/second medians are environment
  specific.
- **The wall-clock medians are worth less than the rest of the table.** The
  harness runs a wave concurrently — five sessions at once for `run`, three for
  each `trials` wave — over one shared `node_modules` symlink, so every second
  reported was measured under contention. Rungs within a wave are contended
  equally, so the comparison is not biased *toward* A; but "the skill costs one
  extra build, not a heavier process" is a claim about turn counts, which are
  load independent, and only loosely about the seconds next to them.
- The typecheck check was scored by a bug for all 17 sessions (see the rubric
  section). Fixed in `grade.py`; unverifiable for these runs.
- C and D are single sessions. The A/B/E comparisons carry the argument.

## Repo state

Every session ran in an isolated copy under a scratch lab directory; the working
repo was only read, never written by an agent. No `alert` widget is committed —
`app/src/widgets/` still holds `badge` and `spinner`, so the byte counts in
[task-c-verification.md](./task-c-verification.md) stay valid. `cd app && npm
test` → **5 passed**, `npm run typecheck` clean.
