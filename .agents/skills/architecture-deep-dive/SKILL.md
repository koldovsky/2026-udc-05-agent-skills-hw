---
name: architecture-deep-dive
description: Deep architectural knowledge of the widget-registry library. Use for understanding design patterns, registry mechanics, type safety, bundle structure, or when debugging widget behavior.
---

# Architecture Deep Dive

Comprehensive reference for the widget-registry's design patterns, constraints, and implementation details.

## When to use this

- Explaining why widgets must be pure functions
- Debugging registration failures or "unknown widget" errors
- Understanding how the bundle is structured (for Task C)
- Explaining the public API contract in `core/registry.ts`
- Optimizing widget performance or reducing bundle size

## Instructions

See `references/architecture.md` for the complete architectural deep dive, including:
- Registry mechanics and error handling
- Type system design for `WidgetProps` and `WidgetFactory`
- Module loading and registration lifecycle
- Bundle entry point and dependency tree
- Design constraints and why each one matters

Key principles to remember:
- **Registry is a Map** — O(1) lookups, keys are widget names (strings)
- **Register-at-load-time** — widgets self-register when their module is imported
- **Pure functions** — no DOM, no state, no side effects except `register()`
- **Type safety** — generic `WidgetFactory<P>` ensures type-safe props
- **Bundle-aware** — `src/index.ts` is the entry point, `src/widgets/index.ts` is the dependency root

## Verify

Understanding of the architecture lets you:
- Explain why `register()` throws if a widget name is already taken
- Predict what happens when `create()` is called with an unknown widget name
- Understand why tests are colocated and how they verify factory functions
- Anticipate bundle size implications of adding new widgets
- Know which files are safe to modify vs. protected (public API in `core/registry.ts`)

## References

- `references/architecture.md` — Detailed architectural patterns, type system, and lifecycle
