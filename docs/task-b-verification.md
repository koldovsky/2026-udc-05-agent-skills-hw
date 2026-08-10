# Task B — step 3 verification: does the answer come from the reference file?

**Skill under test:** `architecture-deep-dive`
**Prompt (identical in every run, never reworded):** `поясни архітектуру цього проєкту`
**Tool:** Claude Code (headless, one fresh session per run)

Task B step 3 asks something harder than Task A's. Task A had a mechanical
outcome — either the widget files exist in the right shape or they do not.
Here the output is prose, and a model will *always* produce plausible prose
about "a registry". So the question is not "did it answer?" but **"did the
answer come from `references/architecture.md`, or from generic reasoning about
registries?"**

That needs a discriminator, defined before the runs: a set of **fingerprint
claims** that are true of this code, checked against it, and that generic
reasoning does not produce. They are the facts the reference exists for — the
things `materials/architecture-brief.md` does not say either, so reading the
brief cannot fake them.

## Method

Each run is a separate process with an empty context:

```bash
claude -p "поясни архітектуру цього проєкту" \
  --output-format stream-json --verbose --allowedTools "Read" "Glob" "Grep"
```

`stream-json` gives the full tool trace. **Evidence is the trace, never the
agent's summary of itself** — established in Task A, where a run stated it had
not loaded a skill it had demonstrably read
([task-a-verification.md](./task-a-verification.md#run-2--the-defect)).

Scoring rule, fixed in advance: the skill is doing work only if
`references/architecture.md` is read **before** the answer *and* the fingerprint
claims show up in it.

## Runs

| # | Config | `SKILL.md` read? | `references/architecture.md` read? | Fingerprints in answer | Outcome |
|---|---|---|---|---|---|
| A1 | skill present, pre-fix | ❌ no | ❌ no | 0 / 5 | ❌ **defect** — skill ignored, answered from the brief |
| A2 | skill present, **post-fix** | ✅ yes | ✅ yes | 5 / 5 | ✅ reference-driven answer |
| B | **skill removed** (negative control) | — | — | 0 / 5 | ✅ control behaves as expected |

### Run A1 — the defect

The skill directory was in the agent's own `find` output. It never opened it:

```
Bash   find . -type f -not -path "*/node_modules/*" … | head -100
Read   AGENTS.md
Bash   for f in app/src/core/registry.ts app/src/index.ts …; do cat "$f"; done
Read   materials/architecture-brief.md        <- went here instead
Read   app/src/core/registry.ts
Read   app/src/widgets/{index,badge/badge}.ts
```

The answer was accurate and entirely generic-plus-source: layers, the golden
path, "register throws on a duplicate". Zero fingerprints.

**Root cause — not the frontmatter.** Task A already established that this tool
does not autoload `.agents/skills/`; the trigger lives in prose the agent
actually reads. The agent read the root `AGENTS.md`, and that file pointed at
`materials/architecture-brief.md` as *"the source of truth"* with nothing
pointing at the skill for architecture questions. Faced with two candidate
sources, it took the one the always-loaded file endorsed.

**The fix** (one bullet in the root `AGENTS.md` `## Context`): architecture
questions about `app/` start at `.agents/skills/architecture-deep-dive/SKILL.md`,
not at the brief — the brief is *intent*, the reference is checked against code.
The `## Skills` entry in `app/AGENTS.md` carries the same routing plus the
anti-trigger.

### Run A2 — after the fix

```
Bash   ls -la && find . -type f … | head -100
Read   AGENTS.md
Read   .agents/skills/architecture-deep-dive/SKILL.md              <- skill loaded
Read   .agents/skills/architecture-deep-dive/references/architecture.md   <- tier 2 opened
Read   app/src/core/registry.ts
Read   app/src/widgets/{index,spinner/spinner,badge/badge}.ts
Read   app/scripts/build.mjs, app/package.json
Bash   node -e "import('./dist/bundle.js') …"    (blocked by --allowedTools; noted, not faked)
```

Both files were read **before** the answer, and the source files were read
*after* the reference — the reference set the agenda, the code confirmed it.
The runtime probe it tried to run is straight out of the skill's `## Verify`
block; when the permission was refused it said so instead of inventing output.

### Run B — negative control

Removal was done properly: the whole directory moved **outside** the repo (not
renamed in place — see [walkthrough.md](./walkthrough.md), Task D step 3), and
the two routing pointers reverted, i.e. the repo returned exactly to its
pre-Task-B state. Verified before the run: the only remaining occurrences of
the string `architecture-deep-dive` were the seeded deliverable-path list in
the root `AGENTS.md` and the "not written yet" note in `app/AGENTS.md`.

```
Bash   find . -type f … | head -100
Read   AGENTS.md
Read   app/src/core/registry.ts
Read   materials/architecture-brief.md
Read   app/AGENTS.md
Bash   cat package.json src/index.ts src/widgets/index.ts src/widgets/badge/badge.ts scripts/build.mjs
Read   docs/walkthrough.md
```

The answer was good — layers, data-flow diagram, the golden path, the
side-effect-import trap, "why it is built this way". It even flagged its own
sourcing: *«`architecture-deep-dive` … ще нема — тому це пояснення я зібрав з
коду, а не з reference-файлу»*. Still 0 / 5 fingerprints.

## The discriminator

Five claims, each verified against the code before the runs (every one has a
reproducing command in the reference's
[fact-check ledger](../.agents/skills/architecture-deep-dive/references/architecture.md#fact-check-ledger)):

| # | Fingerprint claim | A1 | A2 | B |
|---|---|---|---|---|
| 1 | Props are **not** type-checked through `create()` — `P` is erased by `factory as WidgetFactory` (`registry.ts:11`); only direct factory imports are checked | ❌ | ✅ | ❌ |
| 2 | A missing required prop renders silently: `create("badge")` → `<span class="badge badge--info">undefined</span>` | ❌ | ✅ | ❌ |
| 3 | Props are interpolated **unescaped** — every widget that renders user text is an injection boundary | ❌ | ✅ | ❌ |
| 4 | Side-effect registration defeats tree-shaking — `spinner` costs ≈156 bytes in the bundle even if nobody creates one | ❌ | ✅ | ❌ |
| 5 | The built bundle exports `create` + `listWidgets` only — `register` is unreachable from `dist/bundle.js`, so a consumer can create widgets but not add one | ❌ | ✅ | ❌ |

A2 produced all five, in its own words, with the numbers intact (`+156` bytes,
the exact `undefined` markup, `registry.ts:11`). A1 and B produced none. Both
also missed the two smaller reference-only facts — `listWidgets()` returns a
*copy*, and its order is import order rather than alphabetical.

## What this proves, and what it does not

- **Proves:** with the skill in place, the answer is the reference's answer.
  Every fingerprint travelled from `references/architecture.md` into the reply,
  and the trace shows the file being read first. Progressive disclosure worked
  as designed — `SKILL.md` was read to decide, the reference was opened for the
  depth.
- **Proves:** the trigger is prose, not frontmatter. Same skill, same
  `description`, same prompt; adding one routing bullet to an always-loaded file
  flipped the run from ignoring the skill to leading with it. A1 → A2 is the
  whole experiment.
- **Does not prove the skill makes a wrong answer right.** Run B's answer is
  not wrong — it is a competent read of ~60 lines of source. The difference is
  *specificity and verification*: B stops at the shape a reader could infer,
  A2 states the boundaries someone would otherwise discover through a silent
  `undefined` in production markup or an unexpectedly heavy bundle. On a larger
  codebase, where reading the whole source is not an option, that gap widens.
- **Honest limitation:** three runs, one tool, one prompt. The prompt was fixed
  across runs, but a differently-worded architecture question was not tested.

## Ledger audit

A reference that claims to be verified has to survive someone running its own
checks. Every row of the
[fact-check ledger](../.agents/skills/architecture-deep-dive/references/architecture.md#fact-check-ledger)
was executed from the repo root, including the two `tsc` rows and the
duplicate-registration row that had previously been argued from reading the
source rather than run:

- `npx tsc --noEmit --strict` on a scratch probe outside `app/src/`: the three
  `create(...)` lines compile clean, `createBadge({ label: 42 })` fails with
  exactly `TS2322: Type 'number' is not assignable to type 'string'`. The
  type-erasure claim holds as written.
- A bundled scratch entry calling `register("x", …)` twice throws
  `Widget "x" is already registered` at module evaluation, before any other
  code runs — confirming it is an import-time failure, not a per-widget one.
- Bundle sizes re-measured with the project's own esbuild settings: 411 bytes
  for registry + `badge`, 567 for the repo's real entry — the ≈156-byte
  tree-shaking cost in fingerprint 4.

Two rows were **wrong and are fixed**:

| Row | Defect | Fix |
|---|---|---|
| "Widgets import only the registry" | the glob `app/src/widgets/*/*.ts` also matched `*.test.ts`, whose imports are `vitest` and the local factory — so the stated expectation ("every line ends `core/registry.js`") did not hold when run | switched to a `find … -not -name '*.test.ts'` command, and the row now says *why* tests are excluded |
| "`listWidgets()` follows import order" | expectation hardcoded `[ 'badge', 'spinner' ]`, so adding a widget would make a correct codebase look like a failing check | compares the output against the `import` lines in `widgets/index.ts`; the literal list is marked "today" |

The same staleness fix was applied to the other rows that pinned the current
widget set, and to the `Registered: …` error text in the registry-contract
section. The ledger is now a check of *shape*, not of a frozen widget list —
which is what it has to be to stay true after Task D adds `alert`.

Separately, one prose claim was corrected: the pitfall about
`noUncheckedIndexedAccess` conflated it with `Map.get`. `widgets.get(name)`
returns `WidgetFactory | undefined` under any config; the flag governs *index*
access in new `core/` code. Overstating what a compiler flag buys is the kind
of plausible-but-wrong detail the reference exists to keep out.

## Repo state

The skill directory and both `AGENTS.md` files were restored after the control
run; `git status` shows only the intended Task B changes. `cd app && npm test` →
6 passed, `npm run typecheck` clean. No `app/src/` file was touched by this task.

The ledger audit's scratch files (the `tsc` probe, the duplicate-registration
entry, the badge-only bundle) were written outside `app/src/` and deleted after
use — `git status` is unchanged by them, and `tsconfig.json`'s
`"include": ["src"]` never saw them.
