# A/B validation (Task D)

**Skill under test:** `creating-widget`
**Prompt (same for A and B):** the change request from `materials/ab-task.md`
(add an `alert` widget).
**Tool used:** <e.g. Cursor / Claude Code>

## Result A — skill available

<what the AI produced: which files, correct folder/naming, did it call
`register()`, did it add a colocated test, did it update `widgets/index.ts`?>
AI produced correct files in widgets folder: alert.ts and alert.test.ts
AI updated index.ts file

## Result B — skill removed

<what the AI produced without the skill: wrong location? missing test?
different registration mechanism? forgot to wire it into `widgets/index.ts`?>

## Difference table

| Aspect | A (skill available)      | B (skill removed)                  |
|---|--------------------------|------------------------------------|
| File location | `widgets/alert/alert.ts` | `src/alert.ts`>                    |
| Registered via `register()` | yes                      | no                                 |
| Colocated test added | yes                      | yes                                |
| Wired into `widgets/index.ts` | yes                      | forgotten |
| Named exports / no `any` | yes                      | default export               |

## Conclusion

<1–3 sentences: did the skill actually change behaviour? was the difference
worth the effort of writing the skill? anything that surprised you?>
Skill changed behaviour and added transparency to process if something need to be done several times with same rules or 
specific modifications in files and folders.
