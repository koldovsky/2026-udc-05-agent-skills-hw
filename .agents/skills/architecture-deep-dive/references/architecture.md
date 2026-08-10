# Reference: Widget Registry Architecture

## Overview

This reference documents the internal architecture of the `app/` widget-registry library. It is separate from `SKILL.md` because the depth here — exact function signatures, module boundary rules, data flow — is only needed when a deep explanation or structural decision is required, not for every task.

All claims below are verified against `app/src/core/registry.ts` and `app/src/widgets/badge/`.

## Deep dive

### The registry (`app/src/core/registry.ts`)

The registry is a module-scoped `Map<string, WidgetFactory>`. It exposes exactly three functions — **do not change their signatures**:

```ts
export type WidgetProps = Record<string, unknown>;
export type WidgetFactory<P extends WidgetProps = WidgetProps> = (props: P) => string;

// Throws if name is already registered (duplicate guard)
export function register<P extends WidgetProps>(name: string, factory: WidgetFactory<P>): void

// Throws if name is not registered ("Unknown widget X. Registered: ...")
export function create(name: string, props: WidgetProps = {}): string

// Returns a snapshot of registered widget names
export function listWidgets(): string[]
```

`register()` throws on duplicate — widgets must be registered exactly once (at module load time, not inside factory functions).

`create()` throws on unknown name and includes the list of registered widgets in the error message — useful for debugging missing `index.ts` imports.

### Widget modules (`app/src/widgets/<name>/<name>.ts`)

Each widget is a single folder containing exactly two files:

```text
app/src/widgets/
  badge/
    badge.ts        ← factory function + register() call
    badge.test.ts   ← colocated vitest tests
```

A widget module (`badge.ts`) follows this structure:

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

register("badge", createBadge);  // ← module-level, runs once at import time
```

Key constraints:
- **Pure function**: no DOM access, no async, no state, no side effects beyond the single module-load-time `register()` call
- **Named exports only**: no `default` export
- **TypeScript strict**: no `any`, no `@ts-ignore`
- Props interface must extend `WidgetProps` from `../../core/registry.js`
- `.js` extension in imports (TypeScript ESM convention — resolves to `.ts` at compile time)

### Auto-discovery via `app/src/widgets/index.ts`

```ts
import "./badge/badge.js";
// (future widgets added here)

export { listWidgets, create } from "../core/registry.js";
```

This file is the **only production/runtime orchestration point** that imports widget modules. Importing a widget module causes its `register()` call to execute, making the widget available to `create()`. If a new widget is not imported here, `create("<name>", props)` will throw "Unknown widget".

**Exception for tests:** Colocated test files (e.g., `app/src/widgets/alert/alert.test.ts`) may import their widget module directly for unit testing the factory function in isolation — this does not conflict with the orchestration rule since tests run separately from the bundle.

The file also re-exports `create` and `listWidgets` so consumers only need one import point.

### Bundle entry (`app/src/index.ts`)

```ts
// imports widgets/index.ts (and transitively all widget modules)
// → all register() calls execute
// → dist/bundle.js includes everything
```

Used by `npm run build` (esbuild, minified) to produce `app/dist/bundle.js`.

### Module boundary rules

| Module | Rule |
|---|---|
| `core/registry.ts` | Shared contract — public API (`register`, `create`, `listWidgets`) is **frozen**. No changes without affecting every widget. |
| `widgets/<name>/` | Each widget is isolated. Only imports from `../../core/registry.js`. No cross-widget imports. |
| `widgets/index.ts` | Orchestration only — import each widget module, re-export `create`/`listWidgets`. No logic here. |
| `index.ts` | Bundle entry — imports `widgets/index.ts`. No logic here. |

### Why pure functions?

Widgets return HTML strings so they can be rendered in any context (server-side, test, browser) without a DOM. Pure functions also make testing trivial — no setup, no teardown, no mocking.

### Common pitfalls

1. **Forgot to add import to `widgets/index.ts`** — `create("<name>", props)` throws "Unknown widget". Fix: add `import "./<name>/<name>.js";` to `index.ts`.
2. **Called `register()` inside the factory** — registers on every `create()` call, throws on second call. Fix: move `register()` to module level.
3. **Used `default` export** — breaks named-import conventions. Fix: use `export function create<Name>`.
4. **Used `any` in props** — The project's design rules prohibit explicit `any` in props (even if TypeScript's noImplicitAny allows it). Fix: extend `WidgetProps` with a typed interface instead.
5. **Used `.ts` extension in import** — ESM requires `.js`. Fix: `import from "../../core/registry.js"`.

## Related

- `app/src/core/registry.ts` — the actual registry implementation
- `app/src/widgets/badge/badge.ts` — canonical widget example
- `.agents/skills/creating-widget/SKILL.md` — step-by-step guide for adding a new widget
