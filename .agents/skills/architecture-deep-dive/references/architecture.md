# Reference: widget-registry architecture

## Overview

This reference explains how the seeded TypeScript library in `app/` is structured and why new features should follow the widget pattern instead of changing core registry behavior. It is separate from `SKILL.md` so deep details are loaded only when architecture guidance is requested.

## Deep dive

`app/src/core/registry.ts` is the central contract used by all widgets:

- `register(name, factory)` stores widget factories in an internal `Map<string, WidgetFactory>`.
- `register` throws if the same `name` is registered twice.
- `create(name, props)` resolves factory by string key and throws with registered names if not found.
- `listWidgets()` returns current registered names.

This contract is intentionally small and stable. The homework guardrail is to keep signatures of `register`, `create`, and `listWidgets` unchanged.

Widgets follow a module self-registration pattern:

- A widget module (example: `app/src/widgets/badge/badge.ts`) exports a typed pure factory (`createBadge`) that returns HTML string.
- The same module calls `register("badge", createBadge)` at top level.
- Tests are colocated next to the implementation (`badge.test.ts`) and validate rendering behavior.

`app/src/widgets/index.ts` is the registry bootstrap point:

- It imports each widget module with side effects (`import "./badge/badge.js";`).
- This import ensures `register(...)` runs during module evaluation.
- It re-exports `create` and `listWidgets` from `../core/registry.js`.

`app/src/index.ts` is the bundle entry point and re-exports from widgets index. For build and bundle-size analysis, this is what `npm run build` bundles.

### Golden path for adding a widget

1. Create `app/src/widgets/<name>/<name>.ts` with `create<Name>(props): string` and `register("<name>", create<Name>)`.
2. Create `app/src/widgets/<name>/<name>.test.ts` with Vitest coverage for default and explicit variants.
3. Add `import "./<name>/<name>.js";` to `app/src/widgets/index.ts`.

### Common mistakes

- Implementing widget in `core/` instead of `widgets/`.
- Forgetting top-level `register(...)`, causing `create("<name>", ...)` to throw unknown widget.
- Forgetting import wiring in `app/src/widgets/index.ts`.
- Using default exports or `any` in strict TypeScript setup.

## Related

- `materials/architecture-brief.md`
- `app/src/core/registry.ts`
- `app/src/widgets/badge/badge.ts`
- `app/src/widgets/badge/badge.test.ts`
- `app/src/widgets/index.ts`

