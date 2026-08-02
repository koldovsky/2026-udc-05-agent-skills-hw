# A/B validation (Task D)

**Skill under test:** `creating-widget`
**Prompt (same for every run):** the change request from `materials/ab-task.md`
(add an `alert` widget), pasted verbatim, never reworded between runs — plus
the two additions described under Method.
**Tool used:** Claude Code — every run executed as a fresh `general-purpose`
subagent on Sonnet 5 (no shared context, no memory of each other or of this
repo's history), so each started cold like a genuinely new chat.

## Method, and its one deliberate compromise

Subagents spawned via the `Agent` tool in this environment have a known
limitation: the `description` field of project skills does not reach them,
only the bare skill name, so autonomous discovery/triggering can't be tested
reliably this way (confirmed earlier, during Task A validation: a skill-blind
subagent silently skipped the skill and copied `badge.ts` directly). To route
around that specific limitation rather than test against it, Run A's prompt
**explicitly instructed the subagent to invoke the `creating-widget` skill via
the Skill tool before starting**. What is measured here is therefore "does
following the skill's instructions change the work" — not "does the model
notice the skill unprompted."

Autonomous discovery was already validated separately, in a real new top-level
chat during Task A: with the skill present, the literal prompt «додай widget
spinner» (no structural detail) triggered `creating-widget` unprompted and
produced `app/src/widgets/spinner/spinner.ts` + its colocated test + the
`widgets/index.ts` import — the widget still in the tree today. All three
skills' discovery checks are recorded in `docs/skill-validation.md`.

Full disclosure on prompt fidelity: the change request itself was pasted
verbatim into every run, but each prompt carried two additions beyond it — the
repo path to work in, and a four-item reporting block (files created or
modified, files read and tool calls before the first write, verification
commands run, and what supplied the widget's structure). The reporting block
is post-hoc and identical in kind across arms, so it doesn't bias the work;
its fourth item was worded differently for arm A ("did you invoke the Skill
tool, and what did it tell you") than for arms B and C ("what told you where
the files should go"), because arm A is the only one where the skill was an
available answer. The tool-call and files-read counts below come from those
self-reports.

Three arms, same prompt, tree reset to an identical starting state before each
run (no `app/src/widgets/alert/` folder, no `import "./alert/alert.js";` line
in `app/src/widgets/index.ts`):

| Arm | `creating-widget` skill | `app/AGENTS.md` |
|---|---|---|
| A | present, explicitly invoked | intact |
| B | folder moved out of `.agents/skills/`; `.claude/` symlink left dangling | intact |
| C | same as B | golden path + `## Skills` section removed |

## Result A — skill available

Invoked `creating-widget` via the Skill tool, then followed it:

- Created `app/src/widgets/alert/alert.ts` — `AlertProps extends WidgetProps`,
  pure named-export `createAlert(props): string`, top-level
  `register("alert", createAlert);`.
- Created colocated `app/src/widgets/alert/alert.test.ts` — default-tone case
  + explicit `tone: "error"` case, importing `createAlert` directly rather
  than through the registry, mirroring `badge.test.ts`.
- Updated `app/src/widgets/index.ts` — added `import "./alert/alert.js";`.
- Ran **all four** of the skill's `## Verify` steps: `npm test` (green),
  `npm run typecheck` (clean), `grep -n "register(" …/alert.ts` (one match),
  `grep -n "alert/alert.js" …/index.ts` (present).

**3 tool calls before the first file write** (call 1 was the Skill invocation),
**1 file read**: `badge.ts`.

## Result B — skill removed

`.agents/skills/creating-widget` moved fully outside `.agents/skills/`; the
`.claude/skills/creating-widget` symlink confirmed dangling, not just renamed
in place. Same exact prompt, no mention of any skill, fresh subagent.

Produced the same three file changes as Result A, and ran `npm test` +
`npm run typecheck` on its own initiative — both green.

**8 tool calls before the first file write**, **5 files read**: `badge.ts`,
`badge.test.ts`, `index.ts`, `registry.ts`, `app/AGENTS.md`.

Two things this run revealed that the previous round of this experiment
missed:

- It read `app/AGENTS.md`, saw the `## Skills` section pointing at
  `creating-widget`, went looking for the file, and found the dangling
  symlink. The removal was **detected, not invisible** — the run knew a skill
  was supposed to exist and fell back deliberately.
- Asked what told it the structure, it named `app/AGENTS.md` **first**: "One
  widget = one folder: `src/widgets/<name>/<name>.ts` + `<name>.test.ts`",
  self-registered "via a top-level `register(...)` call". That is the skill's
  golden path restated in a file the agent always loads — so arm B was never
  a skill-free control at all. Hence arm C.

## Result C — skill removed and the `AGENTS.md` golden path removed

Same as B, plus `app/AGENTS.md` temporarily stripped of the two Architecture
sentences describing widget structure, the two `## Conventions` bullets
("One widget = one folder…", "Widget factories are pure…"), and the whole
`## Skills` section. `## Stack`, `## Commands` and `## Guardrails` were left
intact. That leaves `app/src/widgets/badge/` as the only place in `app/` where
the pattern exists.

Produced the same three file changes again. Verified with `npx vitest run`,
`npx tsc --noEmit` and `npm run build` (636 bytes).

**6 tool calls before the first file write**, **4 files read**: `badge.ts`,
`badge.test.ts`, `index.ts`, `registry.ts`.

Recorded but not concluded from: C reached for `npx vitest run` / `npx tsc
--noEmit` even though `## Commands` was left intact and lists `npm test` /
`npm run typecheck`. One run is not a trend and this may be plain run-to-run
variance.

## A disclosed setup error (first attempt at Result C)

The first attempt at arm C was contaminated: the reset removed the `alert/`
folder but left `import "./alert/alert.js";` in `app/src/widgets/index.ts`. The
run reported it outright — "`index.ts` already contained `import
"./alert/alert.js";`, telling me the wiring step was already done and only the
widget module itself was missing" — so it never had to discover the wiring
step, the single behaviour that arm most needed to test. It was re-run against
a verified-clean tree, and the Result C numbers above are from that clean
re-run.

Kept here rather than deleted because it accidentally measured something
useful: one pre-existing import line hands the agent the discoverability
answer outright, and the agent will say so instead of re-deriving it.

## Difference table

| Aspect | A (skill, invoked) | B (no skill) | C (no skill, no `AGENTS.md` path) |
|---|---|---|---|
| File location | `widgets/alert/alert.ts` | same | same |
| Registered via `register()` | yes, single call | yes, single call | yes, single call |
| Colocated test added | yes, 2 cases | yes, 2 cases | yes, 2 cases |
| Wired into `widgets/index.ts` | yes | yes | yes |
| Named exports / no `any` | yes | yes | yes |
| Resulting `alert.ts` / `alert.test.ts` | — | byte-identical to A | byte-identical to A |
| Tool calls before first write | **3** | **8** | **6** |
| Files read before first write | **1** | **5** | **4** |
| Named source of the structure | the skill | `app/AGENTS.md`, then `badge.ts` | `badge.ts` only |
| Verification source | skill's `## Verify` steps | agent-selected | agent-selected |

Artifact equality was checked, not eyeballed — and each arm's raw output is
preserved in `docs/ab-runs/{a,b,c}/` so the check is re-derivable rather than
taken on trust:

```console
$ diff -r docs/ab-runs/a docs/ab-runs/b && echo "a == b"
a == b
$ diff -r docs/ab-runs/a docs/ab-runs/c && echo "a == c"
a == c
$ diff docs/ab-runs/a/alert.ts app/src/widgets/alert/alert.ts && echo "a == shipped"
a == shipped
```

Each folder holds that arm's `alert.ts`, `alert.test.ts` and the resulting
`app/src/widgets/index.ts`. Arm C's are from the clean re-run, not the
contaminated first attempt.

Git makes the identity self-proving without running anything — the three arms
share blob hashes, so `git ls-files -s docs/ab-runs` shows one hash per
filename across all three folders:

```console
529e5421…  docs/ab-runs/{a,b,c}/alert.ts
6d4f91c9…  docs/ab-runs/{a,b,c}/alert.test.ts
a52f735a…  docs/ab-runs/{a,b,c}/index.ts
```

## Conclusion

The skill did **not** change the artifact. Three arms — including one with both
the skill *and* `app/AGENTS.md`'s golden path removed — produced byte-identical
widget code, test coverage and registry wiring. None of the failure modes
`materials/ab-task.md` calls out (wrong location, missing `register()`, skipped
test, default export, forgotten `index.ts` wiring) appeared in any run.

Arm C is the one that makes this a finding rather than a shrug. It rules out
the obvious rival explanation — that `app/AGENTS.md` was quietly carrying the
pattern for arm B — and leaves `app/src/widgets/badge/badge.ts` as the thing
actually doing the work. One legible reference widget is sufficient for this
task at this model capability. That matches the earlier Task A finding: a fresh
Haiku subagent, given only «додай widget spinner» and with no skill description
reaching it, read `badge.ts` and produced the correct golden-path result anyway.

What the skill *did* change is measurable, just not in the output:

- **Cost.** 3 tool calls and 1 file read before the first write, against 6–8
  calls and 4–5 reads without it. The skill replaced the exploration phase, not
  the implementation phase — the agent stopped needing to reverse-engineer a
  convention that was already written down.
- **Determinism.** A's verification came from the skill's `## Verify` list and
  ran all four checks, including both greps. B and C verified on their own
  initiative and picked their own commands — correct here, not guaranteed to
  be. Correctness by instruction repeats; correctness by inference is a
  property of whichever model happens to be running.

Honest scope of the null: it holds for a codebase with exactly one clean
reference example, a task whose prompt already points at that example ("mirror
the `badge` widget's tone handling"), and a capable model. It says nothing
about a codebase with several widget variants under subtly different rules, a
convention with no in-tree example to copy, or a weaker model — which is where
a guarantee starts to be worth more than a probability.

Residual leak, disclosed: the repo-root `AGENTS.md` (seeded, not edited) still
says at lines 16 and 19 that `app/src/widgets/badge/` is "the pattern every new
widget… should follow" and that tests are colocated `*.test.ts`. Arm C could
not remove that without editing seeded material. It points at the example
rather than spelling out the structure, so C is a strong control, not a perfect
one.

`cd app && npm test` is green (3 files / 6 tests) with the alert widget kept as
a real change on this branch — every arm produced the same code, so there was
nothing to reconcile between them. The repo was restored to its pre-experiment
state afterwards (skill folder back in `.agents/skills/`, `app/AGENTS.md`
byte-identical to before), verified with `git diff`.
