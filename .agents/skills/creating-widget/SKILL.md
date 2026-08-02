---
name: creating-widget
description: >-
  Adds a new widget to the app/ widget-registry library following the project
  golden path (folder under src/widgets/, pure factory, register(), colocated
  test, widgets/index.ts import). Use when the user asks to add, create, or
  scaffold a new widget or component in this library.
---

# Creating a widget

## When to use this

- User asks to add/create a new widget (e.g. `spinner`, `alert`, `avatar`)
- User asks to scaffold a component in this widget-registry library
- Do **not** use for unrelated refactors, registry API changes, or non-widget files

## Instructions

Follow the golden path from `materials/architecture-brief.md`. Mirror
`app/src/widgets/badge/` exactly.

1. **Create the widget module** — `app/src/widgets/<name>/<name>.ts`
   - Import `register` and `WidgetProps` from `../../core/registry.js`
   - Export a props interface extending `WidgetProps` (named exports only)
   - Export a pure factory `create<Name>(props): string` that returns an HTML
     string (no DOM access, no side effects in the factory body)
   - At module load, call `register("<name>", create<Name>)`
   - File names: kebab-case; types: PascalCase
   - No `any`, no `@ts-ignore`, no default exports
   - Do **not** change public signatures of `register` / `create` / `listWidgets`
     in `app/src/core/registry.ts`

2. **Create the colocated test** — `app/src/widgets/<name>/<name>.test.ts`
   - Vitest (`describe` / `it` / `expect`)
   - Import the factory from `./<name>.js`
   - Cover at least the default/happy path and any optional props (see
     `badge.test.ts`)

3. **Wire it into the registry root** — edit `app/src/widgets/index.ts`
   - Add: `import "./<name>/<name>.js";`
   - Keep the existing re-exports of `create` / `listWidgets`

**Canonical shape** (replace `<name>` / `Name` / props as needed):

```ts
import { register, type WidgetProps } from "../../core/registry.js";

export interface NameProps extends WidgetProps {
  /* required + optional props */
}

export function createName(props: NameProps): string {
  return `<!-- HTML string -->`;
}

register("name", createName);
```

## Verify

- [ ] `app/src/widgets/<name>/<name>.ts` exists and calls `register("<name>", …)`
- [ ] `app/src/widgets/<name>/<name>.test.ts` exists
- [ ] `app/src/widgets/index.ts` imports `./<name>/<name>.js`
- [ ] `cd app && npm test` is green
- [ ] No changes to `register` / `create` / `listWidgets` signatures in
      `app/src/core/registry.ts`
