# Widget-Registry Architecture Reference

Deep architectural patterns, mechanics, and design constraints for the widget-registry library.

## Overview

The widget-registry is a tiny, framework-free library for registering and creating HTML widget factories. Its architecture enforces:
- **Pure functions** — widgets return HTML strings, no side effects
- **Runtime registration** — widgets self-register when their module loads
- **Type safety** — generic types ensure type-safe prop handling
- **Small surface area** — public API is minimal and stable

## Registry Mechanics

### Core Data Structure

The registry is implemented as a simple `Map`:

```typescript
const widgets = new Map<string, WidgetFactory>();
```

**Why a Map?**
- O(1) lookup performance for `create(name, props)`
- Simple, predictable error handling
- No dependencies on external registries or discovery systems
- Easy to test and verify at runtime with `listWidgets()`

### Registration Process

Widgets register themselves at **module load time** by calling:

```typescript
register("<name>", factory);
```

**Flow:**
1. Widget module is imported (e.g., `import "./badge/badge.js"`)
2. The module executes its top-level code
3. `register("badge", createBadge)` adds the factory to the Map
4. All subsequent `create("badge", props)` calls use that factory

**Error handling:**
- If a widget name is already registered, `register()` throws: `"Widget "x" is already registered"`
- If `create()` is called with an unknown name, it throws: `"Unknown widget "x". Registered: [list]"`

This fail-fast behavior makes bugs obvious at development time.

### Type System

```typescript
export type WidgetProps = Record<string, unknown>;
export type WidgetFactory<P extends WidgetProps = WidgetProps> = (props: P) => string;
```

**Why generic `WidgetFactory<P>`?**
- Allows each widget to define its own props interface (e.g., `BadgeProps extends WidgetProps`)
- Type-safe: `create()` can infer the correct props type for a specific widget
- Extensible: new widgets can add any shape of props without changing the registry

**Why `WidgetProps = Record<string, unknown>`?**
- Loose base type to allow any widget to add custom properties
- Still type-safe when a specific factory's props interface is used
- No `any` — TypeScript strict mode compliant

## Widget File Structure

Every widget follows the same folder pattern:

```
app/src/widgets/<name>/
  <name>.ts          # Factory function + register() call
  <name>.test.ts     # Colocated vitest tests
```

### Widget Implementation Pattern

```typescript
// app/src/widgets/badge/badge.ts
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

**Key design choices:**
- **Named exports** — `createBadge` is explicitly exported, not default
- **Pure function** — no `this`, no mutable state, no DOM access
- **TypeScript strict** — all types explicit, no `any` or `@ts-ignore`
- **Self-register** — module-level `register()` call ensures it runs when imported
- **Colocated types** — `BadgeProps` lives with the factory, making the API clear
- **Optional enums** — optional string properties use nullish coalescing (`??`) for defaults

### Why TypeScript strict?

- Catches prop errors at compile time
- Makes widget contracts explicit
- Enables type-safe factory composition
- No hidden `any` types that shadow bugs

## Bundle Structure

### Entry Points

```
src/index.ts                    # Bundle entry (used by npm run build)
└── exports { create, listWidgets }
    └── src/widgets/index.ts    # Dependency root
        ├── imports "./badge/badge.js"
        │   └── calls register("badge", createBadge)
        └── exports { create, listWidgets }
```

**Why two files?**
- `src/index.ts` — what the bundle exports (the public API)
- `src/widgets/index.ts` — where widgets are imported (dependency root)

When esbuild bundles `src/index.ts`, it:
1. Traces the import tree starting from `src/widgets/index.ts`
2. Bundles every imported widget module
3. Runs each module's top-level code (all `register()` calls execute)
4. Includes only the registry functions and registered widgets in the final bundle

### Bundle Entry Point Flow

1. `src/index.ts` imports from `src/widgets/index.js`
2. `src/widgets/index.ts` imports `"./badge/badge.js"` (and will import future widgets)
3. `badge.ts` calls `register("badge", createBadge)` at load time
4. Bundle exports `{ create, listWidgets }`
5. Consumer can call `create("badge", { label: "New" })`

### Dead Code Elimination

Because widgets are registered at load time and the registry is a Map:
- Every widget module must be explicitly imported in `src/widgets/index.ts`
- Unused widgets (not imported) are tree-shaken by esbuild
- The bundle only includes code for widgets actually in use

**Impact on bundle size:**
- Adding a widget increases bundle size by the widget's code + imports
- Removing a widget's import shrinks the bundle
- Shared dependencies (e.g., utility functions) only add their bytes once

## Design Constraints

### Why pure functions?

Widgets are pure (no DOM, no state) because:
- **Testable** — pure functions are easy to unit test
- **Predictable** — same props always produce same HTML
- **Composable** — widgets can be nested or called from other widgets
- **Serializable** — the HTML output can be persisted, logged, or sent over the wire
- **Framework-agnostic** — pure HTML works with any framework (React, Vue, etc.)

### Why module-level register()?

Instead of explicit registry calls in an initialization function:
- **Simpler API** — users just import widgets, they're automatically available
- **Tree-shakeable** — unused widgets are never imported, so `register()` never runs
- **Fail-fast** — duplicate registrations throw immediately at import time, not at app startup
- **Consistent** — every widget uses the same registration pattern

### Why named exports only?

No default exports because:
- **Explicit** — the factory name matches the widget name (less cognitive load)
- **Refactor-safe** — renaming the export is caught by the type system
- **IDE-friendly** — code completion shows the factory function name
- **Consistent** — all widgets follow the same pattern

## Lifecycle and Runtime Behavior

### During Import

```typescript
import "./badge/badge.js";  // Triggers:
```

1. `badge.ts` module loads
2. `createBadge` function is defined
3. `register("badge", createBadge)` executes
4. The Map is updated: `widgets.set("badge", createBadge)`

### During Use

```typescript
const html = create("badge", { label: "New", tone: "info" });
```

1. `create()` looks up `"badge"` in the Map → finds `createBadge`
2. Calls `createBadge({ label: "New", tone: "info" })`
3. Returns `<span class="badge badge--info">New</span>`

### During Testing

```typescript
import { createBadge } from "./badge.js";  // Direct import, bypasses registry

describe("createBadge", () => {
  it("...", () => {
    expect(createBadge({ label: "New" })).toBe("...");
  });
});
```

Tests import the factory function directly, so they don't depend on the registry being set up. This makes tests fast and isolated.

## Adding a New Widget

The golden path (documented in the `creating-widget` skill):

1. **Create** `app/src/widgets/<name>/<name>.ts` with:
   - Props interface extending `WidgetProps`
   - Pure `create<Name>()` factory function
   - Module-level `register()` call

2. **Test** `app/src/widgets/<name>/<name>.test.ts` with:
   - Direct import of the factory function (not the registry)
   - At least two test cases (default + explicit optional props)

3. **Register** in `app/src/widgets/index.ts`:
   - Add `import "./<name>/<name>.js";`

4. **Verify** with `cd app && npm test`

This pattern ensures:
- The widget is type-safe and testable
- It's discoverable via `create()`
- The bundle only includes it if `src/widgets/index.ts` imports it
- No changes to the protected `core/registry.ts` public API

## Why This Architecture Matters

- **Decoupling** — widgets don't depend on each other, only on the registry contract
- **Scalability** — adding widgets doesn't require modifying the registry itself
- **Testability** — pure functions + direct imports make testing straightforward
- **Performance** — Map lookups are O(1); the bundle only includes used widgets
- **Maintainability** — the pattern is consistent and easy to learn
