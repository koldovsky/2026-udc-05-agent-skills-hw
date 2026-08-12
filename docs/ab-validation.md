# A/B validation (Task D)

**Skill under test:** `creating-widget`
**Prompt (same for A and B):** the change request from `materials/ab-task.md`
(add an `alert` widget).
**Tool used:** Claude Code

## Result A — skill available

AI produced correct files in widgets folder: app/src/widgets/alert/alert.ts and app/src/widgets/alert/alert.test.ts
AI updated index.ts file

## Result B — skill removed

When skill was removed files where generated in wrong folder, registration was missing and no wiring in index.ts file

## Difference table

| Aspect | A (skill available)      | B (skill removed) |
|---|--------------------------|------------------|
| File location | `widgets/alert/alert.ts` | `core/alert.ts`  |
| Registered via `register()` | yes                      | no               |
| Colocated test added | yes                      | yes              |
| Wired into `widgets/index.ts` | yes                      | forgotten        |
| Named exports / no `any` | yes                      | default export   |

## Conclusion

Skill changed behaviour and added transparency to process if something need to be done several times with same rules or 
specific modifications in files and folders.
