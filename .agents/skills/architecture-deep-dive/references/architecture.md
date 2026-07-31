# Reference: Widget-Registry Architecture

## Overview

Deep-dive into the widget-registry library's internal design: the registry contract, module boundaries, widget lifecycle, and the rationale behind each architectural choice. This is separate from `SKILL.md` because the depth here would bloat the skill's instruction body — agents load this only when they need to answer "how" or "why" questions about the architecture.

## Deep dive

### Core: `app/src/core/registry.ts`

The registry is a module-scoped `Map<string, WidgetFactory>` — not exported, not accessible from outside. All interaction goes through three public functions:

```ts
// Types
export type WidgetProps = Record<string, unknown>;
export type WidgetFactory<P extends WidgetProps = WidgetProps> = (props: P) => string;

// Public API (stable — signatures must not change)
export function register<P extends WidgetProps>(name: string, factory: WidgetFactory<P>): void;
export function create(name: string, props: WidgetProps = {}): string;
export function listWidgets(): string[];
```

**Behaviour details:**

| Function | Happy path | Error path |
|----------|-----------|------------|
| `register(name, factory)` | Stores factory in the Map under `name` | Throws `Error` if `name` is already registered (no silent overwrite) |
| `create(name, props)` | Looks up factory by `name`, calls it with `props`, returns the HTML string | Throws `Error` if `name` not found; message lists all registered widget names |
| `listWidgets()` | Returns `[...widgets.keys()]` — an array of all registered names | Never throws |

**Invariants:**
- The Map is private — no way to unregister, clear, or iterate factories from outside.
- `register` is generic over `P extends WidgetProps` — the factory's props type is preserved at the call site, but stored as the base `WidgetFactory` (via cast) since `create()` accepts generic `WidgetProps`.
- `props` defaults to `{}` in `create()`, so callers can omit it for zero-prop widgets.

### Widget layer: `app/src/widgets/<name>/`

Each widget is a self-contained folder with exactly two files:

1. **`<name>.ts`** — the implementation:
   - Imports `register` and `WidgetProps` from `../../core/registry.js`.
   - Defines a props interface extending `WidgetProps` (e.g. `BadgeProps`).
   - Exports a named factory function `create<Name>(props: <Name>Props): string`.
   - Calls `register("<name>", create<Name>)` at module top-level.

2. **`<name>.test.ts`** — colocated vitest tests:
   - Imports the factory directly (not via registry) for unit-level testing.
   - Tests default prop behaviour and explicit overrides.

**Canonical example — `app/src/widgets/badge/badge.ts`:**

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

**Key constraints on widget factories:**
- **Pure** — no DOM access, no network calls, no mutable external state.
- The only side effect is the `register()` call at module load, which runs exactly once.
- Return value is always a plain HTML string.
- Named export only — no `export default`.

### Wiring: `app/src/widgets/index.ts`

```ts
import "./badge/badge.js";
// add new widgets here

export { listWidgets, create } from "../core/registry.js";
```

This file serves two purposes:
1. **Side-effect imports** — importing each widget module triggers its `register()` call.
2. **Re-export** — exposes `create` and `listWidgets` so consumers have a single entry point.

When a new widget is added, only one line needs appending here: `import "./<name>/<name>.js";`.

### Bundle entry: `app/src/index.ts`

The library's public entry point for `npm run build` (esbuild → `dist/bundle.js`, minified). It imports from `./widgets/index.js`, which transitively pulls in every widget.

Tree-shaking is limited because widget modules are imported for their side effects (`register()` calls). Every registered widget ends up in the bundle regardless of whether a consumer uses it.

### Module boundaries and dependency flow

```
Consumer
  ↓ imports create/listWidgets
app/src/index.ts
  ↓ re-exports from
app/src/widgets/index.ts
  ↓ side-effect imports each widget
app/src/widgets/<name>/<name>.ts
  ↓ imports register
app/src/core/registry.ts
```

**Direction of knowledge:**
- Widgets depend on the registry (they import `register`).
- The registry knows nothing about individual widgets — it stores opaque factories.
- `widgets/index.ts` knows the list of widget modules (it imports them), but doesn't use their exports.
- Consumers only know about `create(name, props)` — they never import widget modules directly.

### Design rationale

| Decision | Why |
|----------|-----|
| String-keyed registry | Decouples consumers from widget implementations — you can add/remove widgets without changing consumer code. |
| Private `Map`, no unregister | Simplicity; prevents accidental deregistration in production. The registry is append-only by design. |
| Throws on duplicate name | Catches copy-paste errors at module load time rather than silently overwriting. |
| Throws on unknown widget | Fail-fast with a helpful error listing available widgets, rather than returning `undefined`. |
| Pure factories returning strings | No DOM dependency → trivially testable; output is deterministic and serializable. |
| Self-registration at import time | Adding a widget = creating its folder + one import line. No central manifest to maintain. |
| Colocated tests | Widget + test are one conceptual unit; easy to find, move, or delete together. |
| `.js` extension in imports | Required by ESM module resolution (TypeScript `moduleResolution: "bundler"` or `"node16"`). |

## Related

- `.agents/skills/creating-widget/SKILL.md` — step-by-step instructions for adding a new widget (uses this reference as background knowledge).
- `.agents/skills/analyzing-bundle-size/SKILL.md` — bundle analysis skill (the "tree-shaking is limited" point above is relevant context).
- `materials/architecture-brief.md` — the original source-of-truth brief this reference expands on.
