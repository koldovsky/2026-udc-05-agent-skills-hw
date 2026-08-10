# Reference: widget-registry architecture

## Overview

This explains how `app/src/core/registry.ts` and `app/src/widgets/**` fit
together — the module boundaries, why the registry hides its state behind a
tiny function API, and how a widget goes from "a file on disk" to "creatable
by string ID". It's separate from `SKILL.md` because this depth (data flow,
the reasoning behind each boundary, bundle-size implications) would bloat the
always-loaded frontmatter/instructions for no benefit on every invocation.

## Deep dive

### The contract layer: `app/src/core/registry.ts`

Everything the registry does is four exports:

```ts
export type WidgetProps = Record<string, unknown>;
export type WidgetFactory<P extends WidgetProps = WidgetProps> = (props: P) => string;

export function register<P extends WidgetProps>(name: string, factory: WidgetFactory<P>): void
export function create(name: string, props: WidgetProps = {}): string
export function listWidgets(): string[]
```

The actual storage — `const widgets = new Map<string, WidgetFactory>()` — is
a **module-private variable, never exported**. That's the key design choice:
every consumer (widgets, callers, tests) is forced through `register` /
`create` / `listWidgets`, never touches the `Map` directly. This is what lets
`AGENTS.md` call this file's public API "PROTECTED" — the internal storage
could change (a different data structure, added metadata, etc.) without
breaking anything, as long as those three signatures don't move.

Two behaviors worth knowing when reasoning about correctness:

- `register(name, factory)` **throws** if `name` is already registered
  (`Widget "${name}" is already registered`) — this is a deliberate guard
  against a copy-pasted widget silently shadowing an existing one; it is not
  a "last write wins" registry.
- `create(name, props)` **throws** with a helpful message that lists every
  currently-registered name (`Unknown widget "${name}". Registered: ...`) if
  `name` isn't found — so a missing widget fails loud, at the call site,
  rather than returning `undefined`/empty output.

`core/registry.ts` has **zero imports from `widgets/**`** — the dependency
arrow only ever points one way: widgets depend on the registry, the registry
knows nothing about any specific widget. That's what makes it a stable
shared contract instead of something that has to be touched every time a
widget is added or changed.

### The widget layer: `app/src/widgets/<name>/<name>.ts`

Each widget (see `widgets/badge/badge.ts`, `widgets/spinner/spinner.ts`) is a
self-contained pair of concerns in one file:

1. A `<Name>Props` interface extending `WidgetProps` (e.g. `BadgeProps`,
   `SpinnerProps`) — the widget's own prop shape, imported from
   `../../core/registry.js`.
2. A pure `create<Name>(props): string` function — no DOM access, defaults
   applied via `??` (e.g. badge's `props.tone ?? "info"`, spinner's
   `props.size ?? "medium"`), returning a plain HTML string.
3. A top-level `register("<name>", create<Name>)` call — this is the widget's
   **only** side effect, and it's what makes `create("<name>", props)`
   resolve elsewhere without any consumer importing the widget module by
   name.

Because the factory is pure (string in, string out, no globals besides the
one-time `register()` call), each widget's colocated `*.test.ts` can assert
directly on the returned HTML string with no DOM/jsdom setup — see
`badge.test.ts` / `spinner.test.ts` asserting exact string equality.

### The wiring layer: `app/src/widgets/index.ts`

```ts
import "./badge/badge.js";
import "./spinner/spinner.js";

export { listWidgets, create } from "../core/registry.js";
```

This file is the **composition root** — the one place that knows the full
list of widgets that exist. The `import "./badge/badge.js";` lines are
side-effect-only imports: nothing is destructured from them, they exist
purely to run each module's top-level `register(...)` call. This is also why
skipping this step is the most common way to break a new widget: if a
widget's module is never imported here, its `register()` call never runs,
and `create("<name>", ...)` throws "Unknown widget" even though the widget
file itself is correct.

`widgets/index.ts` also re-exports `create`/`listWidgets` from
`core/registry.ts` — it's the layer everything outside `widgets/` is meant to
go through, rather than reaching into `core/registry.ts` directly.

### The bundle entry: `app/src/index.ts`

```ts
export { create, listWidgets } from "./widgets/index.js";
```

Just a thin re-export, but it's what `npm run build` (esbuild) bundles for
the Task C bundle-size exercise. The dependency chain esbuild walks is:
`index.ts` → `widgets/index.ts` → every widget module it imports →
`core/registry.ts`. Because the widget imports in `widgets/index.ts` are
eager (not dynamic `import()`), **every registered widget's code ships in
the bundle regardless of whether `create()` is ever called for it** — there
is no per-widget tree-shaking/lazy-loading in this architecture. That's the
relevant fact for anyone reasoning about bundle size: adding a widget always
adds its code to `dist/bundle.js`, even if a given consumer never creates it.

### Why this shape

- **Framework-free, testable-without-a-DOM**: factories return strings, not
  DOM nodes/JSX, so there's no rendering runtime dependency and tests are
  plain string assertions.
- **Decoupled discovery**: consumers call `create("badge", {...})` by string
  ID; they never need to know which file a widget lives in. This is only
  possible because registration is a module-load side effect, which is why
  the explicit imports in `widgets/index.ts` are load-bearing, not
  boilerplate.
- **One stable seam (`core/registry.ts`)**: because widgets never talk to
  each other and the registry never talks to widgets, new widgets are
  additive — they can't break existing ones as long as they don't reuse a
  registered name (which `register()`'s throw guards against).

### Where a change should go

- **New widget** → new `widgets/<name>/` folder + wiring import in
  `widgets/index.ts`. Never touches `core/registry.ts`. (This exact
  golden path is what the `creating-widget` skill encodes.)
- **Change to lookup/registration behavior** (e.g. different error text, an
  `unregister`, listing with metadata) → `core/registry.ts`, but the
  existing signatures of `register`/`create`/`listWidgets` must stay stable
  per the guardrail in `AGENTS.md` — add, don't break.
- **What the bundle exposes publicly** → `app/src/index.ts`.
- **Whether a widget's code ships in the bundle at all** → whether it's
  imported (directly or transitively) from `widgets/index.ts`; there's no
  other gate.

## Related

- `creating-widget` skill — the step-by-step for adding a new widget along
  this architecture's golden path.
- `analyzing-bundle-size` skill — measures the bundle-size consequence of the
  eager-import shape described above.
- `AGENTS.md` (repo root, "Guardrails") — states `core/registry.ts`'s public
  API must stay stable; this file explains *why* that constraint exists.
