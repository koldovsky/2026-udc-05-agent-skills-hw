# A/B validation (Task D)

**Skill under test:** `creating-widget`
**Prompt (same for A and B):** the change request from `materials/ab-task.md`
(add an `alert` widget).
**Tool used:** Cursor

Artifacts kept for comparison:
- A → `app/src/widgets/alert/`
- B → `app/src/widgets/alert_wo_skill/`

## Result A — skill available

AI followed the `creating-widget` golden path and mirrored `badge`:

- Created `app/src/widgets/alert/alert.ts` with `createAlert(props)`,
  `AlertProps extends WidgetProps`, `tone ?? "info"`, and
  `register("alert", createAlert)` at module load.
- Added colocated `app/src/widgets/alert/alert.test.ts` that calls
  `createAlert` directly (default tone + explicit `error` tone), same style
  as `badge.test.ts`.
- Updated `app/src/widgets/index.ts` with `import "./alert/alert.js";`.
- Named exports only; no `any`; HTML matches the ticket:
  `<div class="alert alert--{tone}">{message}</div>`.

## Result B — skill removed

AI still produced a working alert-like module, but did **not** match the
project’s canonical widget pattern as closely:

- Files lived under a non-canonical folder name
  `app/src/widgets/alert_wo_skill/` (not `widgets/alert/`).
- Factory named `alert` instead of `createAlert`; props are plain `type`
  aliases and do **not** extend `WidgetProps`.
- Still called `register("alert", alert)` and returned the correct HTML.
- Added a colocated test, but it exercises `create("alert", …)` /
  `listWidgets()` after a side-effect import, not the factory-direct style
  used by `badge`.
- Was **not** wired into `app/src/widgets/index.ts` (only the A path
  `./alert/alert.js` is imported there).

## Difference table

| Aspect | A (skill available) | B (skill removed) |
|---|---|---|
| File location | `widgets/alert/alert.ts` | `widgets/alert_wo_skill/alert.ts` |
| Factory naming | `createAlert` (matches `createBadge`) | `alert` |
| Props typing | `interface` + `extends WidgetProps` | `type` aliases, no `WidgetProps` |
| Registered via `register()` | yes | yes |
| Colocated test added | yes — factory-direct like `badge` | yes — via `create()` / `listWidgets()` |
| Wired into `widgets/index.ts` | yes (`./alert/alert.js`) | no |
| Named exports / no `any` | yes | yes |

## Conclusion

The skill clearly changed behaviour: with it, the agent reproduced the
project’s `badge` conventions (path, `createAlert`, `WidgetProps`, test
style, and `widgets/index.ts` wiring). Without it, the agent still
registered a working HTML factory and wrote tests, but drifted on naming,
types, folder layout, and discoverability via `index.ts`. That gap is
exactly what the skill is for — worth keeping for consistent new widgets.
