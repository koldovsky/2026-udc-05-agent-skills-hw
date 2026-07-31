# A/B validation (Task D)

**Skill under test:** `creating-widget`
**Prompt (same for A and B):** the change request from `materials/ab-task.md`
(add an `alert` widget).
**Tool used:** Claude Code (CLI, Opus 4.6)

## Result A — skill available

The agent immediately loaded `.agents/skills/creating-widget/SKILL.md`, then
followed the golden path without any exploratory reads:

- Created `app/src/widgets/alert/alert.ts` — pure factory `createAlert`,
  `AlertProps` extending `WidgetProps`, `register("alert", createAlert)` at
  module level, named export only.
- Created `app/src/widgets/alert/alert.test.ts` — two tests (default tone +
  explicit tone), mirroring `badge.test.ts` structure.
- Updated `app/src/widgets/index.ts` — added `import "./alert/alert.js";`.
- Ran the skill's **Verify** section: `npm test` (green), `grep register(`,
  `grep alert/alert.js`, `npm run typecheck`, and a runtime check via
  `listWidgets()` + `create("alert", ...)`.

## Result B — skill removed

The agent explored the project on its own — read `badge.ts`, `badge.test.ts`,
`registry.ts`, and `widgets/index.ts` to infer the pattern, then produced:

- Created `app/src/widgets/alert/alert.ts` — same correct structure.
- Created `app/src/widgets/alert/alert.test.ts` — same two tests.
- Updated `app/src/widgets/index.ts` — added the import but placed it
  **before** the existing `badge` import (alphabetical order) rather than
  appending at the end.
- Verification: ran `npm test` + `npm run typecheck`, but did NOT run the
  grep-based checks from the skill's Verify section (no explicit confirmation
  that `register()` call and index import exist).

## Difference table

| Aspect | A (skill available) | B (skill removed) |
|--------|---------------------|-------------------|
| Exploration needed | None — went straight to implementation | Read 4+ files to discover the pattern |
| File location | `widgets/alert/alert.ts` ✅ | `widgets/alert/alert.ts` ✅ |
| Registered via `register()` | Yes ✅ | Yes ✅ |
| Colocated test added | Yes ✅ | Yes ✅ |
| Wired into `widgets/index.ts` | Yes (appended at end) ✅ | Yes (inserted alphabetically) ⚠️ |
| Named exports / no `any` | Yes ✅ | Yes ✅ |
| Verification rigour | Full verify section (test + typecheck + greps + runtime) | Only `npm test` + `npm run typecheck` |
| Tool calls spent | 15 (mostly implementation) | 14 (several spent on exploration) |
| Determinism | Guaranteed by documented golden path | Inferred from one example — works here but fragile |

## Conclusion

In this case both runs produced functionally correct code, because the existing
`badge` widget is a clear enough single example to copy from. The skill's real
value was **not** in preventing a wrong result, but in:

1. **Eliminating exploration** — the agent skipped reading badge/registry/index
   and went straight to implementation (faster, fewer tokens).
2. **Structured verification** — the skill's Verify section triggered explicit
   grep checks and a runtime smoke test that Run B never performed.
3. **Deterministic ordering** — the skill says "append" so the import lands at
   the end consistently; without it, the agent chose alphabetical insertion
   (harmless here but could cause merge conflicts in a team).

In a more complex project with multiple different patterns or ambiguous
structure, the skill would provide stronger guardrails. Even here it measurably
improved verification thoroughness and process consistency.
