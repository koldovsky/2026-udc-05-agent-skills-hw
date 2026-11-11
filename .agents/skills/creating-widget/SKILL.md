---
name: creating-widget
description: Golden path for adding a new widget (UI component that returns an HTML string) to this widget-registry library under app/src/widgets/. Load it when the user asks to add, create, or scaffold a new widget such as "add an alert widget"; skip it for registry changes, build/bundle-size work, or general architecture questions.
---

# Creating a widget

## When to use this

- The user asks to add, create, scaffold, or implement a new widget (for
  example "add an alert widget" or "create a spinner component") in `app/`.
- A change request needs a new `create("<name>", ...)` ID to exist.

Do not use it for changes to `app/src/core/registry.ts`, build or bundle-size
work, or questions about how the architecture works.

## Instructions

Follow `app/src/widgets/badge/` exactly. It is the canonical widget. A new
widget is exactly three changes: two new files and one added import line.

Naming, using `status-pill` as an example:

- `<name>`: kebab-case, used for the folder, the file names, and the registry
  ID. Example: `status-pill`.
- `<Name>`: the PascalCase form, used for types and the factory. Example:
  `StatusPillProps` and `createStatusPill`.

### 1. Factory module: `app/src/widgets/<name>/<name>.ts`

- Import `register` and `type WidgetProps` from `"../../core/registry.js"`.
- Export an interface `<Name>Props extends WidgetProps`. Required props have
  no `?`. Optional props use `?` with a literal-union type where it makes
  sense, like badge's `tone?: "info" | "warn" | "error"`.
- Export a pure function `create<Name>(props: <Name>Props): string` that
  returns an HTML string. Default optional props with `??`, as badge does with
  `props.tone ?? "info"`. Use BEM-style classes like badge:
  `<name>` and `<name>--<modifier>`.
- End the module with a top-level `register("<name>", create<Name>);`. The ID
  must match the folder name.

```ts
import { register, type WidgetProps } from "../../core/registry.js";

export interface StatusPillProps extends WidgetProps {
  label: string;
  state?: "online" | "offline";
}

export function createStatusPill(props: StatusPillProps): string {
  const state = props.state ?? "online";
  return `<span class="status-pill status-pill--${state}">${props.label}</span>`;
}

register("status-pill", createStatusPill);
```

### 2. Colocated test: `app/src/widgets/<name>/<name>.test.ts`

Mirror `badge.test.ts`: use vitest, write one `describe("create<Name>")`, and
include at least one default-options case and one explicit-option case. Assert
exact string equality with `toBe(...)`, not `toContain`. Also assert that the
widget registered itself.

```ts
import { describe, expect, it } from "vitest";
import { listWidgets } from "../../core/registry.js";
import { createStatusPill } from "./status-pill.js";

describe("createStatusPill", () => {
  it("defaults to the online state", () => {
    expect(createStatusPill({ label: "API" })).toBe(
      '<span class="status-pill status-pill--online">API</span>',
    );
  });

  it("respects an explicit state", () => {
    expect(createStatusPill({ label: "DB", state: "offline" })).toBe(
      '<span class="status-pill status-pill--offline">DB</span>',
    );
  });

  it("registers itself as status-pill", () => {
    expect(listWidgets()).toContain("status-pill");
  });
});
```

### 3. Wire it up: `app/src/widgets/index.ts`

Add one line next to the existing `import "./badge/badge.js";`:

```ts
import "./<name>/<name>.js";
```

This side-effect import is the only way a widget is registered. Without it,
`create("<name>")` throws `Unknown widget` at runtime.

### Rules

- Use kebab-case for folders and files and PascalCase for types and interfaces.
- Use named exports only. Never add a default export.
- TypeScript is strict: no `any` and no `@ts-ignore`.
- Factories are pure. They must not access the DOM (`document`, `window`)
  and must have no side effects other than the top-level `register()` call.
- Relative imports must use the `.js` extension (ESM), for example
  `"../../core/registry.js"` and `"./<name>.js"`.
- Never change the signatures of `register`, `create`, or `listWidgets` in
  `app/src/core/registry.ts`. Never edit that file to add a widget.
- Do not put widget code in `app/src/core/`. One widget means one folder
  under `app/src/widgets/` with exactly `<name>.ts` and `<name>.test.ts`.
- Do not invent another registration mechanism, such as a manual map, a
  `widgets` array, or auto-discovery. Use `register()` plus the import in
  `widgets/index.ts`.
- Do not add a UI framework or new npm dependencies.

## Verify

- Run `cd app && npm test`. Every test must pass, and the new
  `<name>.test.ts` must appear in the test file count.
- Run `cd app && npm run typecheck`. It must report no errors.
- Check that `app/src/widgets/<name>/<name>.ts` contains `register("<name>"`.
- Check that `app/src/widgets/index.ts` contains `import "./<name>/<name>.js";`.
- Check that `listWidgets()` includes `"<name>"` once the module is imported.
  The registration assertion in the test above covers this.
- Lint is not configured in this project. Do not claim a lint run or add a
  linter.
