---
name: architecture-deep-dive
description: Use when asked to explain the widget-registry architecture, how the registry works internally, where to implement a new feature, or how widgets interact with the core. Provides a structured deep-dive into the project's design decisions and module boundaries.
---

# Architecture Deep-Dive

## When to use this

- The user asks "how does the registry work?", "explain the architecture", "where should I put this feature?".
- The user needs to understand module boundaries, data flow, or design decisions before making changes.
- The user asks why something is structured a certain way (e.g. why widgets self-register, why factories are pure).

## Instructions

Refer to `references/architecture.md` for the full structured reference. Key points to cover:

### Core module: `app/src/core/registry.ts`

- A `Map<string, WidgetFactory>` stores all registered widgets.
- `register(name, factory)` — adds a factory; throws if the name is already taken (no silent overwrite).
- `create(name, props)` — looks up and invokes the factory; throws if the widget is unknown.
- `listWidgets()` — returns all registered names.
- This is the **shared contract** — its public API signatures (`register`, `create`, `listWidgets`) must not change.

### Widget layer: `app/src/widgets/<name>/`

- Each widget is a self-contained folder with exactly two files: `<name>.ts` + `<name>.test.ts`.
- The factory is a **pure function** (no DOM, no side effects) returning an HTML string.
- Registration happens at module top-level — a side effect that runs once on import.
- Widgets know about the registry (they import `register`), but the registry knows nothing about individual widgets.

### Wiring: `app/src/widgets/index.ts`

- Imports every widget module so their `register()` calls execute.
- Re-exports `create`/`listWidgets` for consumer use.
- This is the only file that needs editing when adding a new widget (besides the widget folder itself).

### Bundle entry: `app/src/index.ts`

- Used by `npm run build` (esbuild) to produce `dist/bundle.js`.
- Tree-shaking is limited because all widgets are imported via side-effect imports.

### Design decisions

| Decision | Rationale |
|----------|-----------|
| String-based registry | Consumers create widgets by ID without importing widget modules directly — loose coupling. |
| Pure factories | Testable without DOM; output is a predictable HTML string. |
| Self-registration at module load | No central "list of widgets" to maintain — just import the module. |
| Colocated tests | Each widget is independently testable; easy to find related test. |

## Verify

- The explanation matches what `references/architecture.md` documents.
- Any suggested file placement follows the conventions in `app/AGENTS.md`.
- If the user is deciding where to implement something, the answer references concrete paths (not generic advice).

## References

- `references/architecture.md` — full structured architecture reference (open when answering detailed questions).
