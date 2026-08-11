---
name: creating-widget
description: Golden path for adding a new widget to the app/ widget-registry library — folder layout, the pure factory + register() pattern, the colocated vitest test, and wiring into widgets/index.ts. Use when asked to add, create, or scaffold a widget/component (e.g. "add a spinner widget"), or when reviewing whether an existing widget follows the project's structure.
---

# Creating a widget

The `app/` library is a framework-free widget registry: a widget is a **pure
function returning an HTML string** that registers itself under a string name,
so callers do `create("badge", { label: "New" })` without importing the widget
module. Every widget follows the same three-file path — no exceptions, no
alternative registration mechanisms.

## When to use this

- "Add a `<name>` widget" / "create a new component for the library".
- Scaffolding, renaming, or moving a widget under `app/src/widgets/`.
- Checking whether a widget someone else added follows the project pattern.

Not for: changing the registry itself (`app/src/core/registry.ts` is a
protected shared contract — see the `architecture-deep-dive` skill).

## Instructions

Work through all three steps. Skipping step 3 is the most common failure — the
widget compiles and its test passes, but `create("<name>", …)` throws at
runtime because the module was never imported and its `register()` never ran.

### 1. `app/src/widgets/<name>/<name>.ts`

One folder per widget, named in kebab-case, file named after the folder.

```ts
import { register, type WidgetProps } from "../../core/registry.js";

export interface SpinnerProps extends WidgetProps {
  label: string;
  size?: "sm" | "md" | "lg";
}

export function createSpinner(props: SpinnerProps): string {
  const size = props.size ?? "md";
  return `<span class="spinner spinner--${size}">${props.label}</span>`;
}

register("spinner", createSpinner);
```

Rules this encodes:

- Props interface is `PascalCase` + `Props`, and **extends `WidgetProps`** —
  `register<P extends WidgetProps>` will not accept it otherwise.
- Factory is named `create<Name>`, takes exactly one props argument, returns a
  `string`. **Named export only** — no default exports anywhere in this repo.
- The factory is **pure**: no DOM access, no I/O, no mutation. The only
  side effect in the module is the single `register(...)` call at the bottom,
  which runs at module load.
- Optional props get defaults via `??` inside the factory (mirror
  `app/src/widgets/badge/badge.ts` — it is the canonical example).
- Imports use the **`.js` extension** even though the source is `.ts` (ESM +
  `"type": "module"`); TypeScript is strict, so no `any` and no `@ts-ignore`.
- `register(name, …)` throws if `name` is already taken — one registration per
  widget name, and the name is the kebab-case widget name as a plain string.

### 2. `app/src/widgets/<name>/<name>.test.ts`

Colocated in the same folder, vitest, mirroring `badge.test.ts`. Test the
factory function directly (import it by name) — at minimum the default-value
case and one explicit-value case, asserting the exact HTML string:

```ts
import { describe, expect, it } from "vitest";
import { createSpinner } from "./spinner.js";

describe("createSpinner", () => {
  it("defaults to the md size", () => {
    expect(createSpinner({ label: "Loading" })).toBe(
      '<span class="spinner spinner--md">Loading</span>',
    );
  });

  it("respects an explicit size", () => {
    expect(createSpinner({ label: "Loading", size: "lg" })).toBe(
      '<span class="spinner spinner--lg">Loading</span>',
    );
  });
});
```

### 3. Wire it into `app/src/widgets/index.ts`

Add a side-effect import so the module loads and its `register()` call runs:

```ts
import "./spinner/spinner.js";
```

Keep the existing `export { listWidgets, create } from "../core/registry.js";`
line as-is. Do **not** re-export the factory here — discovery happens through
`create(name)`, not through direct imports.

Nothing else needs touching: `app/src/index.ts` already re-exports from
`widgets/index.ts`, so a correctly wired widget reaches the bundle
automatically.

## Verify

```bash
cd app
npm test        # vitest — the new colocated test must pass alongside the rest
npm run typecheck   # tsc --noEmit — catches a props interface that doesn't extend WidgetProps
```

Then confirm the pattern by hand:

- `grep -r "register(" app/src/widgets/<name>/` → exactly one call, with the
  widget's own name as a string literal.
- `grep "<name>" app/src/widgets/index.ts` → the side-effect import is present.
- `grep -r "export default" app/src/widgets/<name>/` → no matches.
- Runtime check that step 3 actually took effect — `listWidgets()` should now
  include the new name, and `create("<name>", …)` should not throw.

There is no lint step in this project — don't invent one.

## References

- `materials/architecture-brief.md` — the source of truth this skill encodes.
- `app/src/widgets/badge/` — the seeded canonical example to mirror.
- The `architecture-deep-dive` skill — for *why* the registry is shaped this
  way, or when the change touches `core/registry.ts` rather than a widget.
