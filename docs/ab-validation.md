# A/B validation (Task D)



**Skill under test:** `creating-widget`
**Prompt (same for A and B):** the change request from `materials/ab-task.md`

Add a new **alert** widget to the library:

- Renders as `<div class="alert alert--{tone}">{message}</div>`.
- `tone` is optional, one of `"info" | "warn" | "error"`, defaulting to `"info"`
  (mirror the `badge` widget's tone handling).
- Make it discoverable the same way every other widget is.

**Tool used:** Claude Code

## Result A — skill available

The request was implemented by following the golden
path exactly:

- Created `app/src/widgets/alert/alert.ts` — correct folder/naming, matching
  the `badge` widget's structure. Exports an `AlertProps` interface (named
  export, no `any`) and a pure `createAlert(props: AlertProps): string`
  function.
- Called `register("alert", createAlert)` at module load, mirroring how
  `badge`/`spinner` self-register.
- Added the colocated test file `app/src/widgets/alert/alert.test.ts` with
  two vitest cases: default (`info`) tone and an explicit tone (`error`).
- Updated `app/src/widgets/index.ts` to add `import "./alert/alert.js";` so
  the registration actually runs.
- Verified with `npm test` (6/6 passing, including the 2 new alert tests)
  and `npm run typecheck` (clean) before reporting done.

No manual correction was needed — output matched the brief on the first
pass.

## Result B — skill removed

- Created `app/src/widgets/alert/alert.ts` — correct folder/naming, matching
  `badge`. Named export `AlertProps` (`message: string`, `tone?: "info" |
  "warn" | "error"`), pure `createAlert(props: AlertProps): string`, no `any`.
- Called `register("alert", createAlert)` at module load — inferred purely
  from reading `core/registry.ts` and seeing how `badge.ts` self-registers.
- Added colocated `app/src/widgets/alert/alert.test.ts` with the same two
  cases as `badge.test.ts` (default `info` tone, explicit `error` tone).
- Updated `app/src/widgets/index.ts` with `import "./alert/alert.js";` so the
  widget is actually reachable via `create()`/`listWidgets()`.
- `npm test`: 6/6 passing. `npm run typecheck`: clean.

Two things worth noting rather than glossing over:

1. **No functional gap materialized this time.** Because this repo has
   exactly one existing widget (`badge`) with an explicit code comment
   pointing at it as "the pattern every widget follows," and the prompt
   itself says "mirror the badge widget's tone handling," a capable agent
   exploring the real source tree converged on the same location,
   registration mechanism, and test shape as the skill-assisted run —
   without ever seeing the skill or the architecture brief. The failure modes
   `ab-task.md` warns about (wrong location, missing `register()` call,
   skipped test, default export) did not occur here.
2. **The agent caught a real inconsistency the skill-assisted run didn't
   mention**: `spinner.ts` is never imported by `widgets/index.ts` (only by
   its own test file), so `spinner` is not actually reachable through
   `create()`/`listWidgets()` in the built bundle — only `badge` follows the
   "proper" barrel-import pattern. The no-skill run noticed this ambiguity,
   reasoned about it explicitly, and correctly chose to mirror `badge` (not
   replicate `spinner`'s gap) without going out of scope to "fix" it.

The one cosmetic difference: import order in `widgets/index.ts` (`badge`
then `alert` here, vs. `alert` then `badge` in a re-check of the
skill-assisted path) — functionally irrelevant.

## Difference table

| Aspect | A (skill available) | B (skill removed) |
|---|---|---|
| File location | `widgets/alert/alert.ts` | `widgets/alert/alert.ts` (same) |
| Registered via `register()` | yes | yes (same) |
| Colocated test added | yes (default + explicit tone) | yes (default + explicit tone, same) |
| Wired into `widgets/index.ts` | yes | yes |
| Named exports / no `any` | yes | yes |
| Prop name for message | `message` | `message` (same — inferred from the ticket's own wording, not a documented convention) |
| Extra observations | none noted | flagged that `spinner` isn't wired into `widgets/index.ts` (pre-existing repo issue, out of scope, left untouched) |

## Conclusion

For this specific task, the skill did not change the *outcome* — a capable
agent freely exploring the real source tree reached the same golden path on
its own, because the repo has exactly one prior widget acting as a
self-documenting template and the prompt already told it what to mirror. The
value the skill would add is more about **consistency and speed under worse
conditions**: a larger codebase with multiple divergent widget patterns (like
the `spinner` barrel-import gap surfaced above), a less careful model, or a
prompt that didn't explicitly say "mirror the badge widget," are exactly the
conditions where an explicit `creating-widget` skill (encoding the golden
path, the test shape, and the registration rule up front) would prevent
drift instead of merely getting lucky that the AI inferred it correctly by
reading code.
