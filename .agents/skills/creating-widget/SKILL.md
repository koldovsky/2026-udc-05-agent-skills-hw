---
name: creating-widget
description: >-
  Adds a new widget to the widget-registry library (pure factory, register(),
  colocated test, wire-up in widgets/index.ts). Use when the user asks to add
  or create a new widget/component under app/src/widgets/.
---

## When to use this

- User asks to add / create / implement a new **widget** (or component) in this library.
- User names a widget ID (e.g. `spinner`, `alert`) without describing the folder layout.
- User wants something callable via `create("<name>", props)` that returns an HTML string.

Do **not** use this skill for editing `registry.ts` public API, bundle-size work, or non-widget refactors.

## Instructions

Follow the golden path from `materials/architecture-brief.md`. Mirror `app/src/widgets/badge/` exactly.

1. **Factory module**: create `app/src/widgets/<name>/<name>.ts`:
   - Import `register` and `WidgetProps` from `../../core/registry.js`.
   - Export a props interface: `export interface <Name>Props extends WidgetProps { ... }`.
   - Export a pure factory: `export function create<Name>(props: <Name>Props): string` that returns an HTML string (no DOM, no side effects).
   - At module load, call `register("<name>", create<Name>)`.
   - Named exports only; kebab-case folder/file; no `any` / `@ts-ignore`.
   - Do **not** change signatures of `register` / `create` / `listWidgets` in `registry.ts`.

2. **Colocated tests**: create `app/src/widgets/<name>/<name>.test.ts`:
   - Vitest `describe` / `it` / `expect`.
   - Import the factory from `./<name>.js` and assert the returned HTML string(s).

3. **Wire into the registry**: add one line to `app/src/widgets/index.ts`:

   ```ts
   import "./<name>/<name>.js";
   ```

   (so the module-load `register()` runs). Do not re-export the factory from here; keep exporting only `create` / `listWidgets` from the registry.

Example shape (from `badge`):

```ts
import { register, type WidgetProps } from "../../core/registry.js";

export interface BadgeProps extends WidgetProps {
  label: string;
  tone?: "info" | "warn" | "error";
}

export function createBadge(props: BadgeProps): string {
  const tone = props.tone ?? "info";
  return `<span class="badge badge--${tone}">${props.label}</span>`;
}

register("badge", createBadge);
```

## Verify

Confirm the new widget follows the golden path:

1. Files exist:
   - `app/src/widgets/<name>/<name>.ts`
   - `app/src/widgets/<name>/<name>.test.ts`
2. Factory self-registers: `register("<name>",` appears in `<name>.ts` (search for `register(`).
3. Wired in: `app/src/widgets/index.ts` contains `import "./<name>/<name>.js";`.
4. Factory is pure and returns an HTML string; named export only (no default export).
5. Tests pass and types check:

   ```bash
   cd app && npm test
   cd app && npm run typecheck
   ```

