# A/B validation (Task D)

**Skill under test:** `creating-widget`
**Prompt (same for A and B):** the change request from `materials/ab-task.md`
(add an `alert` widget).
**Tool used:** <Copilot/Auto>

## Result A — skill available

Produced simple widget. Added register(). Created 2 tests for widget.

## Result B — skill removed

Actually this was unexpected. the result is same widget, tests, register called BUT agent read all documents and materials and created skills before widget creation. So, It read all repo and instead of executing the only prompt I provided, did additional job for creating skills that did not exist but mentioned in tasks.

## Difference table

| Aspect | A (skill available) | B (skill removed) |
|---|---|---|
| File location | `widgets/alert/alert.ts` | `widgets/alert/alert.ts` |
| Registered via `register()` | YES | YES |
| Colocated test added | YES | YES |
| Wired into `widgets/index.ts` | YES | YES |
| Named exports / no `any` | YES | YES |

## Conclusion

Actually, in this case skill limited execution to just doing exact task without scanning full repo and executing some other jobs.