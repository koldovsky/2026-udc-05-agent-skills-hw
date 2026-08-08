# Task A — step 5 verification: did the agent find and apply the skill?

**Skill under test:** `creating-widget`
**Prompt (new chat, no structural hints):** "add widget `spinner`"
**Tool used:** Claude Code

This is Task A step 5 only — a check that the skill is *discoverable and
applied unprompted*. The A/B comparison (same prompt with the skill removed)
is Task D, in [ab-validation.md](./ab-validation.md).

## Evidence — the agent's own tool trace

Verbatim from the run (tool calls, trimmed to the ones that matter):

```
> add widget spinner

Bash    ls -la && ls -la .agents/ app/
Read    AGENTS.md
Bash    find .agents app/src app/scripts -type f | sort
          -> .agents/skills/creating-widget/SKILL.md
Read    app/AGENTS.md
Read    .agents/skills/creating-widget/SKILL.md     <- skill pulled into context
Read    badge.ts, badge.test.ts, index.ts, registry.ts
Write   app/src/widgets/spinner/spinner.ts
Write   app/src/widgets/spinner/spinner.test.ts
Edit    app/src/widgets/index.ts   (+1 line)
Bash    npm test && npm run typecheck
Bash    npm run build && node -e 'import("./dist/bundle.js")...'
```

`SKILL.md` was read **before** the first `Write` — the structure in the output
came from the skill, not from the prompt.

**Honest caveat about how it was found:** the agent located the skill by
listing the repo (`find`) and reading it as a file, not via a
description-matched autoload. The root `AGENTS.md` also names the path
`.agents/skills/creating-widget/SKILL.md`, so discovery is partly attributable
to that pointer. This step proves *discovery + application*; proof that the
skill **changes behaviour** is the removal run in
[ab-validation.md](./ab-validation.md) (Task D), which is the stronger test.

## What the agent produced

Nothing about the folder layout, the registration mechanism or the test
location was in the prompt — all of it came from the skill.

| Golden-path step | Result |
|---|---|
| `app/src/widgets/spinner/spinner.ts` | ✅ correct folder, kebab-case name |
| Pure factory `createSpinner(props): string` | ✅ template literal, no DOM APIs |
| `SpinnerProps extends WidgetProps` | ✅ |
| Top-level `register("spinner", createSpinner)` | ✅ last line, outside the function |
| Colocated `spinner.test.ts` | ✅ 2 tests: defaults + explicit props, exact-string assertions (a 3rd test, for the no-argument call, was added afterwards when the skill was tightened — not part of this run) |
| Side-effect import in `app/src/widgets/index.ts` | ✅ `import "./spinner/spinner.js";` — the step that is classically skipped |
| `.js` extension on relative imports | ✅ |
| Named exports, no `any` | ✅ |

Props chosen by the agent: `size` (`sm` / `md` / `lg`, default `md`) and
`label` (default `Loading`).

## Verification output

Ran the skill's own `## Verify` block. Two snapshots, because the suite grew
after the run: the agent wrote 2 spinner tests, and a 3rd (the no-argument
call) was added later when the skill was tightened.

**As of the run under test — 4 tests:**

```
$ npm test
 ✓ src/widgets/spinner/spinner.test.ts (2 tests) 1ms
 ✓ src/widgets/badge/badge.test.ts (2 tests) 1ms
 Test Files  2 passed (2)
      Tests  4 passed (4)

$ npm run typecheck
> tsc --noEmit
(no output — clean)

$ npm run build && node -e "import('./dist/bundle.js').then(m => { ... })"
[ 'badge', 'spinner' ]
<span class="spinner spinner--sm" role="status" aria-label="Loading"></span>
```

**Current state of the repo — 5 tests, re-run verbatim from the skill's
`## Verify` block with `NAME=spinner`, `PROPS='{}'`:**

```
$ npm test
 ✓ src/widgets/spinner/spinner.test.ts (3 tests) 1ms
 ✓ src/widgets/badge/badge.test.ts (2 tests) 1ms
 Test Files  2 passed (2)
      Tests  5 passed (5)

$ npm run typecheck
> tsc --noEmit
(no output — clean)

$ grep -n "register(\"$NAME\"" "src/widgets/$NAME/$NAME.ts"
14:register("spinner", createSpinner);
$ grep -n "$NAME/$NAME.js" src/widgets/index.ts
4:import "./spinner/spinner.js";

$ npm run build
dist/bundle.js — 567 bytes
$ node -e "import('./dist/bundle.js').then(m => { ... })"
[ 'badge', 'spinner' ]
<span class="spinner spinner--md" role="status" aria-label="Loading"></span>
```

(The `sm` vs `md` difference is just the `PROPS` passed to `create()`, not a
behaviour change.)

The runtime check is the one that matters: `listWidgets()` contains `spinner`
and `create("spinner", { size: "sm" })` returns HTML instead of throwing
`Unknown widget "spinner"` — proof that `widgets/index.ts` was actually wired.

## Conclusion

The skill triggered on a bare "add a widget X" request, with no mention of
the skill by name and no structural detail in the prompt. That proves the
positive direction of the trigger: the `description` is broad enough to fire
on a bare `add widget <name>`.

The `spinner` widget is kept in the repo as the artefact of this run; all tests
are green.

## Open items — what this file does NOT yet prove

Two claims are still asserted rather than demonstrated. Each has a run that
would settle it; neither has been done.

1. **Autoload vs. file-listing.** As noted above, the agent reached the skill
   via `find` + the path pointer in the root `AGENTS.md`. To isolate
   description-matched autoload, temporarily remove the
   `.agents/skills/creating-widget/SKILL.md` path from the root `AGENTS.md`
   deliverables list, then run `add widget <other-name>` in a new chat. If
   `SKILL.md` is still read before the first `Write`, the `description` alone
   carried it.
2. **Negative trigger.** The skill should stay out of the way for edits to an
   *existing* widget. Untested. Run `change the badge label separator` in a new
   chat and record whether `SKILL.md` was pulled into context. Loading it there
   would mean the `description` is too broad and should be narrowed to
   new-widget wording only.

Until those two runs are recorded here, step 5 is proven for
discovery + application, not for trigger precision.
