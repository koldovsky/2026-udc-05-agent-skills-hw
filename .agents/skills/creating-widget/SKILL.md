---
name: creating-widget
description: Add a new widget to the framework-free widget-registry library in app/ (pure factory returning an HTML string + self-registration + colocated vitest test + import in widgets/index.ts). Use when asked to add, create, or scaffold a widget/component such as "alert", "spinner", "tooltip" in this repo, or when renaming/removing an existing widget. Not for changes to app/src/core/registry.ts itself.
---

# Creating a widget

## When to use this

- "Add a widget `<name>`", "create an `alert` component", "scaffold a spinner
  widget", "додай widget ...".
- Someone asks where a new UI-producing feature belongs in `app/`.
- A widget must be renamed, removed, or its props extended (same file layout
  rules apply).

Do **not** use it for changes to the registry contract itself
(`app/src/core/registry.ts`) — its public API (`register`, `create`,
`listWidgets`) is stable and must not change signature.

## Instructions

A widget is a **pure function returning an HTML string** that self-registers
under its own name at module load. The canonical example is
`app/src/widgets/badge/badge.ts` — read it before writing anything.

Golden path for a widget named `<name>` (kebab-case, e.g. `alert`), factory
`create<Name>` (PascalCase suffix, e.g. `createAlert`):

1. **Create `app/src/widgets/<name>/<name>.ts`:**

   ```ts
   import { register, type WidgetProps } from "../../core/registry.js";

   export interface <Name>Props extends WidgetProps {
     // required props first, optional ones with `?`
     label: string;
     tone?: "info" | "warn" | "error";
   }

   export function create<Name>(props: <Name>Props): string {
     const tone = props.tone ?? "info";
     return `<div class="<name> <name>--${tone}">${props.label}</div>`;
   }

   register("<name>", create<Name>);
   ```

   Rules:
   - Relative import ends with `.js`, even though the source file is `.ts`
     — `tsconfig` uses `moduleResolution: "Bundler"` so it is not enforced,
     but every existing file in `src/` does it. Match the convention.
   - Props interface **extends `WidgetProps`** and is exported.
   - Named exports only — no `default export`.
   - The factory is pure: no DOM, no `document`, no I/O, no state. The only
     side effect allowed in the module is the single top-level
     `register("<name>", create<Name>)` call, placed at the bottom of the file.
   - `register()` throws if the name is already taken — pick a name not in
     `app/src/widgets/`.
   - Strict TypeScript: no `any`, no `@ts-ignore`. Defaults via `??`.

2. **Create the colocated test `app/src/widgets/<name>/<name>.test.ts`** (see
   `app/src/widgets/badge/badge.test.ts`):

   ```ts
   import { describe, expect, it } from "vitest";
   import { create<Name> } from "./<name>.js";

   describe("create<Name>", () => {
     it("renders the default variant", () => {
       expect(create<Name>({ label: "Hi" })).toBe('<div class="<name> <name>--info">Hi</div>');
     });

     it("respects an explicit tone", () => {
       expect(create<Name>({ label: "Oops", tone: "error" })).toBe(
         '<div class="<name> <name>--error">Oops</div>',
       );
     });
   });
   ```

   Cover at least: the default-props output and one explicit-props output.
   Assert the exact HTML string with `toBe`.

3. **Register the module for the bundle** — add one line to
   `app/src/widgets/index.ts`, keeping the existing imports:

   ```ts
   import "./<name>/<name>.js";
   ```

   Without this the `register()` call never runs and `create("<name>", ...)`
   throws `Unknown widget`.

4. **Do not** touch `app/src/core/registry.ts`, `app/src/index.ts`, or
   `package.json`. No new npm dependencies, no UI framework — this library is
   framework-free by design.

## Verify

```bash
cd app
npm test          # vitest — must be green, incl. the new <name>.test.ts
npm run typecheck # tsc --noEmit — strict, must be clean
```

Then check the structural invariants:

```bash
ls app/src/widgets/<name>/            # exactly <name>.ts and <name>.test.ts
grep -n 'register("<name>"' app/src/widgets/<name>/<name>.ts
grep -n '<name>/<name>.js' app/src/widgets/index.ts
```

Sanity-check registration at runtime if useful: `create("<name>", { ... })`
from `app/src/index.ts` returns the HTML string, and `listWidgets()` includes
`"<name>"`.

Note: there is **no linter** configured in this project — say so rather than
inventing a lint command.

