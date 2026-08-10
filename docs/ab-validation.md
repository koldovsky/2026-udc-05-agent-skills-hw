# A/B validation (Task D)

**Skill under test:** `creating-widget`
**Prompt (same for A and B):** the change request from `materials/ab-task.md`
(add an `alert` widget).
**Tool used:** Claude Code — each run was a fresh subagent with no memory of
the other run, given the exact prompt from `materials/ab-task.md`.

## Result A — skill available

The agent read `.agents/skills/creating-widget/SKILL.md` first, then:
- Created `app/src/widgets/alert/alert.ts`.
- Created `app/src/widgets/alert/alert.test.ts`.
- Updated `app/src/widgets/index.ts` with `import "./alert/alert.js";`.
- `cd app && npm test` — 3 files / 6 tests passed. 

## Result B — skill removed

For this run, `.agents/skills/creating-widget/` was moved out of the repo
before starting so the agent had no widget-creation skill available — only
`analyzing-bundle-size` and `architecture-deep-dive` remained. The agent
worked from reading `app/src/widgets/badge/` directly, and produced:
- `app/src/widgets/alert/alert.ts`
- `app/src/widgets/alert/alert.test.ts` — same as for A.
- `app/src/widgets/index.ts` updated with the import `./alert/alert.js`.
- `cd app && npm test` — 3 files / 6 tests passed.

## Difference table

| Aspect | A (skill available) | B (skill removed) |
|---|---|---|
| File location | `widgets/alert/alert.ts` | `widgets/alert/alert.ts` |
| Registered via `register()` | yes, `register("alert", createAlert)` | yes, `register("alert", createAlert)` |
| Colocated test added | yes, 2 cases | yes, 2 cases |
| Wired into `widgets/index.ts` | yes | yes |
| Named exports / no `any` | yes | yes |

## Conclusion

No difference here — both runs produced the same code, because
the one existing example (`badge/`) already makes the pattern obvious. The
skill's value showed up more clearly in Task A's "add a spinner widget"
test, and would likely matter more on a widget with less obvious precedent
or in a bigger codebase with more competing patterns to copy from.
