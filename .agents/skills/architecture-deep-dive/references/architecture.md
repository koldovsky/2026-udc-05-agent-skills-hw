# Reference: widget-registry architecture

## Overview

This reference explains the real architecture of the framework-free
`app/` widget-registry library. Use it for architecture explanations,
feature-placement decisions, and reviews that need project-specific module
boundaries instead of generic TypeScript advice.

The source of truth is the current code under `app/src/`, especially
`app/src/core/registry.ts`, `app/src/widgets/index.ts`, and each
`app/src/widgets/<name>/` folder.

## Module Map

- `app/src/core/registry.ts` owns the registry contract and registry state.
  It exports `WidgetProps`, `WidgetFactory`, `register`, `create`, and
  `listWidgets`.
- `app/src/widgets/<name>/<name>.ts` owns one widget's props interface, pure
  factory function, and top-level `register("<name>", create<Name>)` call.
- `app/src/widgets/<name>/<name>.test.ts` owns colocated Vitest coverage for
  that widget's factory behavior.
- `app/src/widgets/index.ts` imports every widget module so each top-level
  registration call runs, then re-exports `create` and `listWidgets` from the
  registry.
- `app/src/index.ts` is the library bundle entry point used by `npm run build`;
  it re-exports from `./widgets/index.js`.

## Registry Contract

`app/src/core/registry.ts` defines:

```ts
export type WidgetProps = Record<string, unknown>;
export type WidgetFactory<P extends WidgetProps = WidgetProps> = (props: P) => string;
export function register<P extends WidgetProps>(name: string, factory: WidgetFactory<P>): void;
export function create(name: string, props: WidgetProps = {}): string;
export function listWidgets(): string[];
```

The registry stores factories in a module-local `Map<string, WidgetFactory>`.
`register` throws if a name is registered twice, then stores the factory.
`create` looks up a factory by string name, throws `Unknown widget "<name>"`
with the currently registered names when missing, and otherwise calls the
factory with the provided props. `listWidgets` returns the registered names
from the map.

Do not change the public signatures of `register`, `create`, or
`listWidgets`; they are the shared API all widgets and callers depend on.

## Widget Pattern

Each widget lives in its own folder under `app/src/widgets/<name>/`. The
canonical pattern is `badge`:

- import `register` and `WidgetProps` from `../../core/registry.js`;
- define a PascalCase props interface extending `WidgetProps`;
- export a named factory such as `createBadge(props: BadgeProps): string`;
- return an HTML string from the factory;
- call `register("badge", createBadge)` once at module load.

Widget factories should be pure. They should not read or mutate DOM state,
attach events, start timers, perform network calls, or register other widgets
inside the factory. The only expected side effect is the top-level
`register(...)` call when the module is imported.

Use named exports only. File and folder names are kebab-case; interfaces and
factory names are PascalCase.

## Registration Flow

Callers import from the library entry point and create widgets by string ID:

```ts
import { create, listWidgets } from "widget-registry";

const html = create("badge", { label: "New" });
```

The flow is:

1. `app/src/index.ts` exports from `./widgets/index.js`.
2. `app/src/widgets/index.ts` imports each widget module with side-effect
   imports like `import "./badge/badge.js";`.
3. Each widget module runs its top-level `register(...)` call.
4. `create(name, props)` resolves the factory in the registry map and returns
   the widget's HTML string.

When adding a widget, forgetting the side-effect import in
`app/src/widgets/index.ts` means direct tests of the factory can pass while
`create("<name>", props)` still fails because the factory was never registered.

## Implementation Boundaries

Change `app/src/core/registry.ts` only for behavior shared by every widget, and
preserve the public signatures. Examples: duplicate registration policy,
unknown-widget error behavior, registry listing behavior.

Change an individual `app/src/widgets/<name>/` folder for widget-specific
rendering, props, defaults, and tests. A widget folder should not require
changes in other widget folders.

Change `app/src/widgets/index.ts` when adding or removing a widget module so
registration side effects are included in the public creation path. Keep its
registry re-exports intact.

Change `app/src/index.ts` only for package-level public exports or bundle
entry-point behavior. Bundle-size analysis belongs to the separate
`analyzing-bundle-size` skill.

## Verification

Use these commands from `app/`:

```bash
npm test
npm run typecheck
npm run build
```

There is no lint script configured in this sample project. Do not claim that
lint is available unless `package.json` has been changed to add it.

For a new widget, verify:

- `app/src/widgets/<name>/<name>.ts` has exactly one top-level
  `register("<name>", create<Name>)` call;
- `app/src/widgets/<name>/<name>.test.ts` imports the factory from
  `./<name>.js` and covers default plus explicit prop behavior where relevant;
- `app/src/widgets/index.ts` imports `./<name>/<name>.js`;
- `create("<name>", props)` works through the registry path, not only through a
  direct factory import.

## Common Pitfalls

- Do not add React, Vue, DOM APIs, CSS-in-JS, or runtime event handling. This is
  a framework-free HTML-string library.
- Do not use default exports. The existing code uses named exports.
- Do not omit `.js` in TypeScript import specifiers; the project uses ESM-style
  emitted paths.
- Do not use `any` or `@ts-ignore`; TypeScript is strict.
- Do not make widget registration conditional or move it inside the factory.
- Do not assume package consumers import widget modules directly; the supported
  public path is through `create` and `listWidgets`.
