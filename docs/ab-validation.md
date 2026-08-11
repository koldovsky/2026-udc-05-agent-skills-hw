# A/B validation (Task D)

> Copy to `docs/ab-validation.md` and fill in. Run the SAME prompt twice — once
> with your `creating-widget` skill available, once with it temporarily
> **moved entirely out of `.agents/skills/`** (e.g. to a repo-root scratch
> folder: `mv .agents/skills/creating-widget /tmp/creating-widget-disabled`,
> or just `git rm -r .agents/skills/creating-widget` and `git checkout --
> .agents/skills/creating-widget` afterward to restore it) — in a NEW chat
> each time. Just renaming the folder in place (e.g. adding a `.off` suffix)
> is NOT reliable: some tools discover any `SKILL.md` found anywhere under
> `.agents/skills/`, so a renamed-but-still-nested folder can still get
> picked up.

**Skill under test:** `creating-widget`
**Prompt (same for A and B):** the change request from `materials/ab-task.md`
(add an `alert` widget).
**Tool used:** Claude Code

## Result A — skill available

The `creating-widget` skill triggered automatically on the prompt (no
mention of "skill", "register", or file layout in the prompt itself — just
"add a new alert widget"). It produced:

- `app/src/widgets/alert/alert.ts` — a pure `createAlert(props: AlertProps): string`
  function, named export, `AlertProps extends WidgetProps` with an optional
  `tone?: "info" | "warn" | "error"` defaulting to `"info"` via
  `props.tone ?? "info"`, returning
  `` `<div class="alert alert--${tone}">${props.message}</div>` ``. Ends with
  a top-level `register("alert", createAlert)` call, mirroring
  `badge.ts` line for line in structure.
- `app/src/widgets/alert/alert.test.ts` — colocated vitest test with two
  cases (default `"info"` tone, explicit `"error"` tone), same shape as
  `badge.test.ts`.
- `app/src/widgets/index.ts` — added `import "./alert/alert.js";` alongside
  the existing `badge`/`spinner` imports (alphabetically placed before
  `badge`), so the registration side effect runs without anyone needing to
  import `createAlert` by name.
- Did not touch `core/registry.ts`.
- Verified with `npm test` (6/6 passing, including the 2 new alert tests)
  and `npm run typecheck` (clean, no errors) before reporting done.

## Result B — skill removed

Run in a fresh chat (started with `/clear`) with `creating-widget`
unavailable: `.agents/skills/creating-widget/` on disk contained only a
stray `.DS_Store` — its `SKILL.md` was not in the working tree (it currently
lives in `git stash@{0}`, titled "creating-widget"). Consistent with that,
`creating-widget` did not appear in the session's available-skills listing
at all. The prompt was the exact text from `materials/ab-task.md`'s "The
request" section, with "don't run any skills" appended as a second
safeguard against it firing.

Without the skill, the AI:

- Read the existing `badge` widget (`app/src/widgets/badge/badge.ts`,
  `badge.test.ts`) and `app/src/widgets/index.ts` directly, on its own
  initiative, to infer the project's widget pattern before writing anything.
- Produced `app/src/widgets/alert/alert.ts` — a pure
  `createAlert(props: AlertProps): string`, `AlertProps extends WidgetProps`,
  optional `tone?: "info" | "warn" | "error"` defaulting via
  `props.tone ?? "info"`, returning
  `` `<div class="alert alert--${tone}">${props.message}</div>` ``, ending
  with a top-level `register("alert", createAlert)` call — structurally
  identical to what Result A describes.
- Produced `app/src/widgets/alert/alert.test.ts` with the same two cases
  (default tone, explicit tone) as `badge.test.ts`.
- Updated `app/src/widgets/index.ts` with `import "./alert/alert.js";`,
  placed alphabetically before `badge`.
- Did not touch `core/registry.ts`.
- Verified with `npx vitest run` — 3 files / 6 tests passing, including the
  2 new alert tests.
- None of the "common no-skill failure modes" listed in `materials/ab-task.md`
  occurred: no wrong location (`core/`), no missing `register()` call, no
  skipped test, no default export, no invented registration mechanism.

## Difference table

| Aspect | A (skill available) | B (skill removed) |
|---|---|---|
| File location | `app/src/widgets/alert/alert.ts` | same |
| Registered via `register()` | yes, `register("alert", createAlert)` at module load | same |
| Colocated test added | yes, `alert.test.ts` (default + explicit tone) | same |
| Wired into `widgets/index.ts` | yes, `import "./alert/alert.js";` added | same |
| Named exports / no `any` | yes, `createAlert` named export, no `any` | same |
| How the pattern was learned | supplied instantly by the skill's instructions | derived by reading `badge.ts` / `badge.test.ts` / `index.ts` as reference before writing |
| Verified before reporting done | `npm test` + typecheck | `npx vitest run` (6/6 passing) |

## Conclusion

The two runs converged on an identical implementation — none of the "common
no-skill failure modes" (`materials/ab-task.md`) showed up in Result B. That's
because `badge` is a clean, self-documenting template exactly one file-read
away, and the AI found and mirrored it unprompted. So in this repo the
skill's payoff wasn't *correctness* (both runs were correct) but *cost*:
Result A got the pattern for free from the skill's instructions, while
Result B spent a few extra tool calls (reading `badge.ts`, `badge.test.ts`,
`index.ts`) rediscovering it before writing anything. In a codebase with a
less obvious existing example, or with conventions that aren't visible from
a single sibling file (e.g. a non-obvious `WidgetProps` contract, registry
side-effect timing, naming rules), the gap between A and B would likely be
larger — `creating-widget` is cheap insurance against needing that exploration
step, and against an AI skipping it.

**Methodology note:** Result B's "skill removed" condition happened by
circumstance rather than by following the doc's own `mv`/`git rm` recipe —
`creating-widget/SKILL.md` is currently sitting in `git stash@{0}` ("On
ws05/MykolaV: creating-widget"), leaving only a stray `.DS_Store` on disk.
The prompt's added "don't run any skills" was a second, redundant safeguard.
Run `git stash pop` (or `git stash show -p stash@{0}` to inspect first) to
restore `creating-widget` before relying on it again — see `materials/ab-task.md`'s
"Keeping the repo green" section for the intended cleanup flow.
