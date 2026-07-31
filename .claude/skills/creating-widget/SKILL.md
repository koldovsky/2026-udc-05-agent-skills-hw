---
name: creating-widget
description: Use when asked to add a new widget (component) to the widget-registry library — e.g. "create a tooltip widget", "add a card component", "new widget called X". Encodes the exact file structure, registration pattern, and conventions required by the project.
---

# Creating a Widget

## When to use this

- The user asks to add a new widget/component to the library.
- The user says "create a … widget", "add a … component", "new widget called …".
- The user wants to extend the widget registry with a new entry.

## Instructions

Every widget follows the same three-step pattern. Use the `badge` widget (`app/src/widgets/badge/`) as the canonical reference.

### 1. Create the widget file `app/src/widgets/<name>/<name>.ts`

```ts
import { register, type WidgetProps } from "../../core/registry.js";

export interface <Name>Props extends WidgetProps {
  // required and optional props for this widget
}

export function create<Name>(props: <Name>Props): string {
  // Pure function — returns an HTML string, no DOM access, no side effects
  return `<some-html>...</some-html>`;
}

register("<name>", create<Name>);
```

Key rules:
- Import path uses `.js` extension (ESM resolution).
- The interface extends `WidgetProps`.
- The factory is a **pure function** returning an HTML string.
- `register()` is called at module top-level (the only side effect allowed).
- Named exports only — no `export default`.
- No `any`, no `@ts-ignore` (strict TypeScript).
- File and folder names are kebab-case; types/interfaces are PascalCase.

### 2. Create the colocated test `app/src/widgets/<name>/<name>.test.ts`

```ts
import { describe, expect, it } from "vitest";
import { create<Name> } from "./<name>.js";

describe("create<Name>", () => {
  it("renders with default props", () => {
    expect(create<Name>({ /* minimal required props */ })).toBe("<expected HTML>");
  });

  it("respects optional props", () => {
    // test each optional prop override
  });
});
```

### 3. Register the import in `app/src/widgets/index.ts`

Add one line:

```ts
import "./<name>/<name>.js";
```

This ensures the widget's `register()` call runs when the library is loaded.

## Verify

Run from the project root:

```bash
cd app && npm test
```

Also confirm:
- `grep 'register(' app/src/widgets/<name>/<name>.ts` shows the registration call.
- `grep '<name>/<name>.js' app/src/widgets/index.ts` shows the import was added.
- `npm run typecheck` passes with no errors (`cd app && npm run typecheck`).
