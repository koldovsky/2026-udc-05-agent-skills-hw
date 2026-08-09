---
name: creating-widget
description: Project-specific workflow for adding a new widget to the widget-registry library. Use when asked to create, add, or scaffold a widget/component in app/src/widgets, including requests that do not specify file layout, registration, tests, or index wiring.
---

# Creating Widget

## When to use this

Use this skill when adding a new widget to the `app/` TypeScript widget-registry
library. The user may say "add a widget", "create a component", "add spinner",
or provide only the widget behavior without naming the project structure.

## Instructions

Follow the existing `badge` widget pattern exactly. The registry contract in
`app/src/core/registry.ts` is protected; do not change the signatures of
`register`, `create`, or `listWidgets`.

1. Create `app/src/widgets/<name>/<name>.ts`.
   - Use kebab-case for the folder and file name.
   - Import `register` and `WidgetProps` from `../../core/registry.js`.
   - Define a PascalCase props interface that extends `WidgetProps`.
   - Export a named pure factory function `create<Name>(props): string`.
   - Return an HTML string only. Do not access the DOM, add framework code, or
     introduce side effects inside the factory.
   - Call `register("<name>", create<Name>)` once at module load.

2. Create `app/src/widgets/<name>/<name>.test.ts`.
   - Use Vitest with colocated tests, mirroring
     `app/src/widgets/badge/badge.test.ts`.
   - Import the named factory from `./<name>.js`.
   - Cover defaults and at least one explicit prop-driven rendering path when
     the widget has optional props.

3. Update `app/src/widgets/index.ts`.
   - Add `import "./<name>/<name>.js";` so the widget module's top-level
     `register(...)` call runs.
   - Keep the existing `create` and `listWidgets` re-export from
     `../core/registry.js`.

4. Keep project conventions intact.
   - Named exports only; no default exports.
   - No `any` and no `@ts-ignore`.
   - Do not add npm dependencies unless the user explicitly asks and there is
     a documented reason.
   - Do not add React, Vue, or another UI framework.

## Verify

Run:

```bash
cd app && npm test
```

Also check the new widget file contains exactly one top-level registration call:

```bash
: "${WIDGET_NAME:?Set WIDGET_NAME to the new widget's kebab-case name}"
WIDGET_FILE="app/src/widgets/${WIDGET_NAME}/${WIDGET_NAME}.ts"
REGISTRATION_COUNT=$(rg --fixed-strings --count-matches "register(\"${WIDGET_NAME}\"" "$WIDGET_FILE") || REGISTRATION_COUNT=0

if [ "$REGISTRATION_COUNT" -ne 1 ]; then
  echo "Expected exactly one register(\"${WIDGET_NAME}\" call in ${WIDGET_FILE}, found ${REGISTRATION_COUNT}"
  exit 1
fi
```

Confirm `app/src/widgets/index.ts` imports `./<name>/<name>.js`; otherwise
`create("<name>", props)` will not discover the widget.
