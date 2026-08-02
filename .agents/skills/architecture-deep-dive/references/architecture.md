# Reference: widget-registry architecture

## Overview

This file documents how the `app/` widget-registry library is structured:
the shared registry contract, where widgets live, and how modules wire
together. It is separate from `SKILL.md` so depth loads only when an agent
needs an architecture answer — not on every skill discovery.

## Deep dive

### Domain

A framework-free library. A **widget** is a pure function
`(props) => string` that returns an HTML string. Widgets self-register under
a string name so callers can do `create("badge", { label: "New" })` without
importing the widget module directly.

### Module map

| Path | Role |
|---|---|
| `app/src/core/registry.ts` | Shared contract: in-memory `Map` + public API |
| `app/src/widgets/<name>/` | One folder per widget: factory + colocated test |
| `app/src/widgets/index.ts` | Side-effect imports (run `register`) + re-exports |
| `app/src/index.ts` | Bundle entry for `npm run build` |

### `app/src/core/registry.ts` — the shared contract

Types (exported):

- `WidgetProps` = `Record<string, unknown>`
- `WidgetFactory<P extends WidgetProps = WidgetProps>` =
  `(props: P) => string`

Private state: `const widgets = new Map<string, WidgetFactory>()`.

Public API (signatures must stay stable):

```ts
register<P extends WidgetProps>(name: string, factory: WidgetFactory<P>): void
create(name: string, props?: WidgetProps): string  // props default {}
listWidgets(): string[]
```

Behaviour:

- `register` — throws if `name` is already in the `Map`; otherwise stores the
  factory.
- `create` — looks up `name`; throws listing currently registered names if
  missing; otherwise returns `factory(props)`.
- `listWidgets` — returns `[...widgets.keys()]`.

Nothing else is exported from this module. Do not add alternate registration
APIs or change these signatures when implementing features.

### Why widgets live under `app/src/widgets/<name>/`

Each widget is an isolated unit:

- `<name>.ts` — props interface, pure `create<Name>(props): string`, then
  `register("<name>", create<Name>)` at **module load** (the only allowed
  side effect).
- `<name>.test.ts` — colocated Vitest tests that typically call the factory
  directly (e.g. `createBadge`), not necessarily `create("…")`.

Canonical example: `app/src/widgets/badge/badge.ts` —

```ts
export function createBadge(props: BadgeProps): string { /* HTML string */ }
register("badge", createBadge);
```

The same layout applies to other widgets under `app/src/widgets/` (e.g.
`spinner/`). Factories stay pure: no DOM, no network; only `register` at
top level.

Imports use the `.js` extension in TypeScript sources (ESM emit convention),
e.g. `from "../../core/registry.js"`.

### `app/src/widgets/index.ts` — registration root

Two jobs in one file:

1. **Side-effect imports** so each widget's `register(...)` runs, e.g.
   `import "./badge/badge.js";`
2. **Re-export** the consumer API:
   `export { listWidgets, create } from "../core/registry.js";`

If a widget module is never imported here, it is never registered, and
`create("<name>", …)` will throw.

### `app/src/index.ts` — library entry

Re-exports only:

```ts
export { create, listWidgets } from "./widgets/index.js";
```

`npm run build` bundles this entry to `dist/bundle.js`. Pulling in
`widgets/index.js` also pulls every imported widget module (and thus every
`register` call).

### Data flow

```
import widgets/index
  → import badge.ts (and other widgets)
    → register("badge", createBadge)  // Map write
consumer: create("badge", props)
  → Map lookup → createBadge(props) → HTML string
```

`register` is for widget authors; `create` / `listWidgets` are for library
consumers. Inside this sample repo, tests often call the factory directly;
`create` is still the public string-ID API.

### Where to put new work

| Change | Where |
|---|---|
| New widget | `app/src/widgets/<name>/` + import in `widgets/index.ts` |
| Registry behaviour shared by all widgets | `app/src/core/registry.ts` (signatures stay stable) |
| Bundle / public package surface | `app/src/index.ts` (usually only re-exports) |

### Pitfalls

- Adding a widget file but forgetting the `widgets/index.ts` import → not
  registered.
- Putting a widget under `core/` → breaks the one-folder-per-widget boundary.
- Calling DOM APIs inside a factory → violates purity.
- Default exports or `any` / `@ts-ignore` → against project conventions.
- Changing `register` / `create` / `listWidgets` signatures → breaks every
  widget and the protected public API.

### Commands (for orientation)

```bash
cd app
npm test            # vitest run
npm run typecheck   # tsc --noEmit
npm run build       # esbuild → dist/bundle.js
# lint: not configured
```

## Related

- `materials/architecture-brief.md` — homework source of truth (same golden
  path)
- Skill `creating-widget` — end-to-end steps to add a widget
- Skill `analyzing-bundle-size` — measuring `dist/bundle.js` (Task C)
