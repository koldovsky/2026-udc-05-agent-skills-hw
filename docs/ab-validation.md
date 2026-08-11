# A/B validation (Task D)

**Skill under test:** `creating-widget`
**Prompt (same for A and B):** the change request from `materials/ab-task.md`
(add an `alert` widget) — pasted verbatim, not reworded between runs.
**Tool used:** Claude Code (Opus 5) · 2026-08-10 · `ws05/FeschenkoNatalia`

**Preconditions.** A: the skill was present in `.agents/skills/` and mirrored into
`.claude/skills/`, and was invoked as the run's first action. B: no
`creating-widget` existed anywhere in the tree (repo-wide search for
`*creating-widget*` returned nothing) — absent, not merely renamed.

## Result

Both runs produced the same three files and left `core/registry.ts` untouched:
`widgets/alert/alert.ts` (factory + module-level `register("alert", createAlert)`),
`widgets/alert/alert.test.ts` (2 colocated cases), and the side-effect import in
`widgets/index.ts`. Both: `AlertProps extends WidgetProps`, named exports, no
`any`, `props.tone ?? "info"` — faithfully mirroring `createBadge` **as it stood
during the run**. Both green on `npm test` (3 files / 7 tests) and
`npm run typecheck`.

> `createBadge` no longer looks like that: the coalescing default was later
> replaced with a comparison against the allowed literals in all three widgets,
> for the reason the copying illustrates — `create()` erases props to
> `Record<string, unknown>`, so `??` passes any non-nullish value straight into
> the attribute. What the run establishes is that both A and B copied the seeded
> widget faithfully, and that is unaffected by what the seed later became.

| Aspect | A (skill available) | B (skill removed) |
|---|---|---|
| Factory file | `app/src/widgets/alert/alert.ts` — `createAlert` | `app/src/widgets/alert/alert.ts` — `createAlert` |
| `register()` call | `register("alert", createAlert)`, module level | `register("alert", createAlert)`, module level |
| Colocated test | `app/src/widgets/alert/alert.test.ts` — 2 cases | `app/src/widgets/alert/alert.test.ts` — 2 cases |
| Wired into barrel | `app/src/widgets/index.ts` — `import "./alert/alert.js"` | `app/src/widgets/index.ts` — `import "./alert/alert.js"` |
| Named exports / no `any` | yes | yes |
| ID-collision check before writing | yes — `grep -rn 'register("'` | not run |
| Discovery before first write | 4 calls / 1 tool round | 8 file reads / 4 tool rounds |
| Bundle `listWidgets()` check | **run** — `[ 'badge', 'spinner', 'alert' ]` | **not run** — stopped at tests + typecheck |

## Conclusion

Read down the table: **five rows are ties, three are not.**

**No difference in the output** (rows 1–5). Same files, same structure, same
exports, same wiring. `app/AGENTS.md` and the two example widgets already teach
the convention, so B copied it correctly without the skill.

**The entire gap is two skipped checks** (rows 6 and 8). B never ran the
ID-collision `grep`, and never ran `npm run build` + `listWidgets()`. The second
is the one that matters: it is the *only* check that catches a forgotten
`index.ts` import, because tests and `tsc` stay green without it — every test
imports its widget directly. B's import was correct by luck, not by verification.
Neither check is inferable from reading `badge.ts`, which is exactly why the
codebase alone could not supply them.

**Plus cost** (row 7): one tool round instead of four.

**Verdict:** keep the skill for its checks, not its pattern — the pattern is
already in the repo. Its value would grow on a repo with no example widget to
copy.

> **Later change to `alert.ts`.** After this comparison, review flagged that
> `props.message` was interpolated into HTML unescaped, so all three widgets were
> hardened with a shared `escapeHtml` helper and runtime `tone`/`size` narrowing.
> That is a change to the artifact both runs produced, not to the comparison:
> neither A nor B escaped anything, so the row-by-row result above stands as
> recorded. The skill version used in this comparison checked wiring and
> registration, not output safety. The current skill also documents
> output-safety checks.
