# Reference: widget-registry architecture

> Loaded only when the `architecture-deep-dive` skill needs depth (progressive
> disclosure, tier 2). Verified against `app/src/core/registry.ts` and
> `app/src/widgets/**` — do not invent APIs beyond what those files export.

## Overview

This reference explains how the framework-free widget-registry library is
wired: the shared contract in `registry.ts`, module boundaries between
`core/` and `widgets/`, and why each widget is a self-registering pure
factory. Keep it here so `SKILL.md` can stay short.

## Deep dive

### Domain

A **widget** is a pure function `(props) => string` that returns an HTML
string. Callers never import a widget module directly for rendering; they call
`create("badge", { label: "New" })` (string ID + props). Registration happens
when widget modules are imported (side effect at module load).

### Module map

```
app/src/
  core/registry.ts          # shared contract: types + Map + public API
  widgets/
    <name>/<name>.ts        # pure factory + register("<name>", …)
    <name>/<name>.test.ts   # colocated vitest tests
    index.ts                # side-effect imports every widget; re-exports create/listWidgets
  index.ts                  # bundle entry: re-exports create/listWidgets from widgets/index
```

**Boundaries:**

| Layer | Owns | Must not |
|---|---|---|
| `core/registry.ts` | Name→factory map; `register` / `create` / `listWidgets` | Know any concrete widget (badge, spinner, …) |
| `widgets/<name>/` | One widget's props type, factory, tests, self-`register` | Change registry signatures; touch DOM |
| `widgets/index.ts` | Import every widget module (so `register` runs); re-export registry API | Re-export individual factories |
| `src/index.ts` | Public bundle surface used by `npm run build` | Contain widget logic |

### `app/src/core/registry.ts` — the shared contract

**Types (real exports):**

```ts
export type WidgetProps = Record<string, unknown>;
export type WidgetFactory<P extends WidgetProps = WidgetProps> = (props: P) => string;
```

**Private state:** `const widgets = new Map<string, WidgetFactory>();` — not
exported. The map is the single source of registered factories.

**Public API (stable — do not change signatures):**

| Function | Signature | Behaviour |
|---|---|---|
| `register` | `<P extends WidgetProps>(name: string, factory: WidgetFactory<P>): void` | `widgets.set(name, factory)`. Throws if `widgets.has(name)`: `Widget "<name>" is already registered`. |
| `create` | `(name: string, props: WidgetProps = {}): string` | Looks up factory; throws `Unknown widget "<name>". Registered: …` if missing; otherwise `return factory(props)`. |
| `listWidgets` | `(): string[]` | Returns `[...widgets.keys()]` (registration order of Map insertion). |

Nothing else is exported from this module. There is no unregister, no
middleware, no async API, no React/DOM types.

### Why widgets are laid out this way

Each widget lives in `app/src/widgets/<name>/` with exactly two files in the
intended pattern:

1. `<name>.ts` — named-export factory `create<Name>(props): string` plus a
   top-level `register("<name>", create<Name>)`.
2. `<name>.test.ts` — colocated vitest tests that import the factory from
   `./<name>.js` and assert HTML strings.

**Why self-register at module load?**

- The registry stays free of widget imports (no circular dependency, no
  central switch statement).
- Callers use string IDs via `create` / `listWidgets` without coupling to
  concrete modules.
- `widgets/index.ts` is the single place that must import every widget so
  registration runs before `create` is used from the public entry.

**Why pure factories (HTML string, no DOM)?**

- Matches `WidgetFactory`: `(props) => string`.
- Keeps the library framework-free and easy to test with string equality.
- The only allowed side effect in a widget module is the module-load
  `register(...)` call.

### Worked examples from real code

**badge** (`app/src/widgets/badge/badge.ts`):

- Props: `BadgeProps extends WidgetProps` with `label: string` and optional
  `tone?: "info" | "warn" | "error"`.
- Factory: `createBadge` → `<span class="badge badge--${tone}">…</span>`
  (`tone` defaults to `"info"`).
- Registration: `register("badge", createBadge)`.

**spinner** (`app/src/widgets/spinner/spinner.ts`):

- Props: `SpinnerProps` with optional `size?: "sm" | "md" | "lg"` and
  `label?: string`.
- Factory: `createSpinner` → `<span class="spinner spinner--${size}" role="status" aria-label="…">`.
- Registration: `register("spinner", createSpinner)`.

**Wiring** (`app/src/widgets/index.ts`):

```ts
import "./badge/badge.js";
import "./spinner/spinner.js";

export { listWidgets, create } from "../core/registry.js";
```

**Bundle entry** (`app/src/index.ts`):

```ts
export { create, listWidgets } from "./widgets/index.js";
```

Note: public consumers get `create` / `listWidgets` only — not `register` and
not per-widget factories — unless they import those modules themselves.

### Data flow (runtime)

1. Importing `app/src/index.ts` (or `widgets/index.ts`) evaluates side-effect
   imports → each widget module calls `register`.
2. Caller invokes `create("badge", { label: "New" })`.
3. Registry looks up `"badge"` in the private `Map` and runs the factory.
4. Caller receives the HTML string.

### Common pitfalls

- Forgetting the side-effect import in `widgets/index.ts` → `create("<name>")`
  throws `Unknown widget`.
- Calling `register` twice for the same name → throws already registered.
- Putting DOM / framework code in the factory → breaks the `(props) => string`
  contract and colocated string tests.
- Changing `register` / `create` / `listWidgets` signatures → every widget and
  the public bundle surface depend on them.
- Re-exporting individual factories from `widgets/index.ts` — current code does
  not; keep the public surface as `create` + `listWidgets` only.

### Conventions that match the code

- Named exports only (see badge/spinner — no default exports).
- Imports use `.js` extensions in TypeScript source (`../../core/registry.js`,
  `./badge/badge.js`) for ESM resolution.
- Files/folders: kebab-case (`badge`, `spinner`); types: PascalCase
  (`BadgeProps`, `SpinnerProps`).

## Related

- Golden path to add a widget: skill `creating-widget`
  (`.agents/skills/creating-widget/SKILL.md`).
- Intent summary (homework source of truth): `materials/architecture-brief.md`.
- App-level agent notes: `app/AGENTS.md`.
- Bundle size / entry point: `app/src/index.ts` + `npm run build` (skill
  `analyzing-bundle-size` when present).
