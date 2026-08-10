---
name: creating-widget
description: Add or modify a widget in this repo's widget-registry library. Use when the user asks to create a new widget/component so the agent follows the exact project structure, registration flow, and colocated tests.
---

# Creating Widget

## When to use this

- User asks to add a new widget to the library.
- User asks to scaffold a component-like HTML widget in `app/src/widgets/`.
- User request includes rendering requirements but does not specify project structure.

## Instructions

1. Keep `app/src/core/registry.ts` API unchanged: do not modify public signatures of `register`, `create`, or `listWidgets`.
2. Create widget files in one folder:
   - `app/src/widgets/<name>/<name>.ts`
   - `app/src/widgets/<name>/<name>.test.ts`
3. In `<name>.ts`:
   - Use named exports only.
   - Define `<Name>Props` extending `WidgetProps` from `../../core/registry.js`.
   - Implement a pure `create<Name>(props): string` function returning HTML.
   - Register at module load with `register("<name>", create<Name>)`.
4. In `<name>.test.ts`:
   - Use Vitest (`describe`, `it`, `expect`).
   - Add colocated tests for default behavior and one explicit variation.
5. Wire the widget in `app/src/widgets/index.ts` by adding:
   - `import "./<name>/<name>.js";`
6. Keep TypeScript strict conventions:
   - No `any`, no `@ts-ignore`, no default exports.
   - No DOM access or side effects beyond module-load-time `register()`.

## Verify

1. Run tests:
   - `cd app && npm test`
2. Check registration call exists in the new widget module:
   - `grep -n "register(\"<name>\"" app/src/widgets/<name>/<name>.ts`
3. Confirm widget import is present in `app/src/widgets/index.ts`.

