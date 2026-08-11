# A/B Validation — `creating-widget` Skill

## Prompt

The exact same prompt was used for both runs:

> Add a new **alert** widget to the library:
>
> * Renders as `<div class="alert alert--{tone}">{message}</div>`.
> * `tone` is optional, one of `"info" | "warn" | "error"`, defaulting to `"info"` (mirror the `badge` widget's tone handling).
> * Make it discoverable the same way every other widget is.

## Environment

* **Run A:** `creating-widget` skill available.
* **Run B:** `creating-widget` directory temporarily moved outside `.agents/skills/`. The prompt was executed in a new chat.

## Results

### Run A (skill available)

The agent explicitly followed the `creating-widget` skill and the existing `badge` widget pattern.

Implemented:

* `app/src/widgets/alert/alert.ts`
* `app/src/widgets/alert/alert.test.ts`
* Added `import "./alert/alert.js";` to `app/src/widgets/index.ts`

The implementation:

* created a pure `createAlert()` factory;
* registered the widget using `register("alert", createAlert)`;
* used named exports;
* mirrored the `badge` widget's tone handling;
* included colocated Vitest tests;
* passed `npm test` and `npm run typecheck`.

### Run B (skill unavailable)

After removing the `creating-widget` skill from `.agents/skills/` and using the same prompt in a new chat, the agent still produced a correct implementation.

The implementation also:

* created `alert.ts`;
* created a colocated `alert.test.ts`;
* registered the widget with `register("alert", createAlert)`;
* updated `app/src/widgets/index.ts`;
* passed tests and type checking.

The agent did not explicitly mention following the `creating-widget` skill.

## Comparison

| Criterion                           | Run A (Skill) | Run B (No Skill) |
| ----------------------------------- | ------------- | ---------------- |
| Correct folder structure            | ✅             | ✅                |
| Pure factory                        | ✅             | ✅                |
| `register("alert", createAlert)`    | ✅             | ✅                |
| Colocated test                      | ✅             | ✅                |
| Updated `widgets/index.ts`          | ✅             | ✅                |
| Named exports                       | ✅             | ✅                |
| Tests pass                          | ✅             | ✅                |
| Typecheck passes                    | ✅             | ✅                |
| Explicitly follows project workflow | ✅             | ⚠️ Implicit only |
| References the skill                | ✅             | ❌                |

## Conclusion

For this small project, removing the `creating-widget` skill did **not** significantly change the implementation produced by the agent. The repository already provides strong guidance through the existing `badge` widget, `AGENTS.md`, and the project structure, allowing the agent to infer the correct implementation.

The value of the skill is therefore not that it enables the implementation, but that it makes the expected workflow explicit, reusable, and portable. In larger projects, or projects without such strong existing examples, this kind of skill would likely have a greater impact on consistency and correctness.
