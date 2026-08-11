---
name: creating-widget
description: Use this skill when asked to add a new widget or component to the widget-registry library. It defines the project's required widget structure, registration pattern, colocated tests, and index import.
---

# Creating Widget

## When to use this

Use this skill when adding a new widget to the widget-registry library, for example when asked to add a `spinner`, `alert`, `badge`, or another widget.

Do not use it for changes to the registry itself or for unrelated TypeScript work.

## Instructions

Follow the existing widget architecture exactly. Use `app/src/widgets/badge/` as the canonical example.

For a widget named `<name>`:

1. Create:

```text
app/src/widgets/<name>/<name>.ts
app/src/widgets/<name>/<name>.test.ts
```

2. In `app/src/widgets/<name>/<name>.ts`:

   * Import `register` and `WidgetProps` from `../../core/registry.js`.
   * Define a PascalCase props interface extending `WidgetProps`.
   * Export a named factory function `create<Name>(props): string`.
   * Keep the factory pure: it returns an HTML string and does not access the DOM.
   * Do not introduce side effects other than the module-load-time registration.
   * Register the widget at module load:

```ts
register("<name>", create<Name>);
```

3. In the colocated `<name>.test.ts`:

   * Use Vitest.
   * Import the factory directly from `./<name>.js`.
   * Test the HTML string returned by the factory.
   * Follow `app/src/widgets/badge/badge.test.ts` as the canonical example.

4. Add a side-effect import to `app/src/widgets/index.ts`:

```ts
import "./<name>/<name>.js";
```

This import is required so the module's `register()` call executes.

5. Follow project conventions:

   * named exports only;
   * no `any`;
   * no `@ts-ignore`;
   * files use kebab-case;
   * types and interfaces use PascalCase;
   * do not change the public signatures of `register`, `create`, or `listWidgets` in `app/src/core/registry.ts`.

For example, an `alert` widget should have:

```text
app/src/widgets/alert/alert.ts
app/src/widgets/alert/alert.test.ts
```

with:

```ts
register("alert", createAlert);
```

and this import in `app/src/widgets/index.ts`:

```ts
import "./alert/alert.js";
```

## Verify

Run:

```bash
cd app
npm test
npm run typecheck
```

Confirm that the new widget contains a module-level registration:

```bash
grep 'register(' src/widgets/<name>/<name>.ts
```

Also verify that:

* `<name>.ts` and `<name>.test.ts` are colocated;
* the factory is pure;
* the props interface extends `WidgetProps`;
* the widget is imported from `src/widgets/index.ts`;
* no `any`, `@ts-ignore`, or default export was introduced.

Lint is not configured in this project. Do not invent or run a lint command.
