# A/B validation (Task D)

**Skill under test:** `creating-widget`
**Prompt (same for A and B):** the change request from `materials/ab-task.md`
(add an `alert` widget).
**Tool used:** Cursor, Composer 2.5

## Result A — skill available

- added `app/src/widgets/alert/alert.ts` and the test file `app/src/widgets/alert/alert.test.ts`
- called `register("alert", createAlert)` at module load.
- updated `app/src/widgets/index.ts` to import the new widget module
- passed the test `cd app && npm test`

## Result B — skill removed

- same as in Result A, but without the skill (the agent used the badge pattern)

## Difference table

| Aspect | A (skill available) | B (skill removed) |
|---|---|---|
| File location | `widgets/alert/alert.ts` | `widgets/alert/alert.ts` |
| Registered via `register()` | <yes> | <e.g. no / different mechanism> |
| Colocated test added | yes | yes |
| Wired into `widgets/index.ts` | yes | yes |
| Named exports / no `any` | yes | yes |

## Conclusion

In my case, removing the skill did not change the behavour. The new alert widget
implementation is the same as the one made with the skill. Probably the reason is
that without the skill, the model made implementation based on the existing widget code.
