# A/B validation (Task D)

**Skill under test:** `creating-widget`  
**Prompt (same for A and B):**

```text
Add a new alert widget to the library:
- Renders as <div class="alert alert--{tone}">{message}</div>.
- tone is optional, one of "info" | "warn" | "error", defaulting to "info"
  (mirror the badge widget's tone handling).
- Make it discoverable the same way every other widget is.
```

**Tool used:** GitHub Copilot (JetBrains)

## Result A — skill available

The skill-assisted run followed the project golden path:

- Added `app/src/widgets/alert/alert.ts` with a pure `createAlert(props): string` factory.
- Added top-level `register("alert", createAlert)` in the same module.
- Added colocated `app/src/widgets/alert/alert.test.ts` with default tone and explicit tone cases.
- Updated `app/src/widgets/index.ts` with `import "./alert/alert.js";` so registration runs.
- Kept named exports and strict typing; no `any` introduced.

## Result B — skill removed

Without `creating-widget`, the result was incomplete and missed project-specific wiring:

- Only `app/src/widgets/alert/alert.ts` was produced.
- `app/src/widgets/alert/alert.test.ts` was not created.
- `app/src/widgets/index.ts` was not updated with `import "./alert/alert.js";`.
- The produced module did not include top-level `register("alert", createAlert)`.

## Difference table

| Aspect | A (skill available) | B (skill removed) |
|---|---|---|
| File location | `app/src/widgets/alert/alert.ts` | `app/src/widgets/alert/alert.ts` only |
| Registered via `register()` | yes (`register("alert", createAlert)`) | no |
| Colocated test added | yes (`app/src/widgets/alert/alert.test.ts`) | no |
| Wired into `widgets/index.ts` | yes (`import "./alert/alert.js";`) | no |
| Named exports / no `any` | yes | partial (not enough output to satisfy full project pattern) |

## Conclusion

The `creating-widget` skill changed behavior in a concrete way: with the skill, the output included implementation, registration, colocated tests, and index wiring; without the skill, the run produced only a partial implementation and skipped the project-critical registration and test wiring steps.


