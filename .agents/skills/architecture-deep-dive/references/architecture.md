# Reference: the widget-registry architecture

## Overview

`app/` is a framework-free library where a widget is a pure function returning an
HTML string, and callers reach widgets by string ID instead of importing them.
This file documents what that indirection buys, what it costs, and where each
guarantee actually holds — the depth that would bloat `SKILL.md`.

Everything below was checked against the code in this repo; signatures and error
strings are copied, not recalled. When the code and this file disagree, the code
wins and this file is stale.

## Deep dive

### The four layers

| File | Role | Imports from |
|---|---|---|
| `app/src/core/registry.ts` | the contract: `register` / `create` / `listWidgets` | nothing |
| `app/src/widgets/<name>/<name>.ts` | one pure factory + its `register()` call | `core/registry.js` |
| `app/src/widgets/index.ts` | composition root — imports every widget for side effects | each widget, `core/registry.js` |
| `app/src/index.ts` | bundle entry point | `widgets/index.js` |

The dependency arrow runs one way: `core/` imports nothing and knows no widget
names. Widgets know the registry. Only `widgets/index.ts` knows the full set of
widgets. That is why `core/registry.ts` is safe to depend on and expensive to
change — it is the one module with no escape hatch above it.

### The registry contract

The whole contract is one small module (`app/src/core/registry.ts`):

```ts
export type WidgetProps = Record<string, unknown>;
export type WidgetFactory<P extends WidgetProps = WidgetProps> = (props: P) => string;

const widgets = new Map<string, WidgetFactory>();
```

and three exported functions over that `Map` (signatures only — bodies are in
the file):

```text
register<P extends WidgetProps>(name: string, factory: WidgetFactory<P>): void
create(name: string, props: WidgetProps = {}): string
listWidgets(): string[]
```

Three facts follow from those lines:

- **State is one module-level `Map`.** Not a class, not an injected container.
  Whoever holds the same module instance holds the same registry.
- **`register` rejects duplicates** — `throw new Error('Widget "${name}" is
  already registered')`. Since `register()` runs at module scope, a duplicate ID
  throws while the module graph is loading, so the import of one bad widget takes
  down the entire bundle rather than one feature.
- **`create` fails loudly and helpfully** — `Unknown widget "nope". Registered:
  badge, spinner, alert`. Confirmed by running the built bundle. When an agent
  reports that error, the list in it is the real registry state, not a guess.

### Registration is import-time

Nothing calls `register()` explicitly. The sequence when a consumer imports the
library:

1. `app/src/index.ts` re-exports from `./widgets/index.js`.
2. `app/src/widgets/index.ts` runs its side-effect imports — `import
   "./badge/badge.js";`, `import "./spinner/spinner.js";`, `import
   "./alert/alert.js";` — with no bindings, because the import exists only to
   execute the module.
3. Each widget module body runs top to bottom, ending in `register("badge",
   createBadge)`.
4. The `Map` is now populated in import order; `listWidgets()` returns
   `["badge", "spinner", "alert"]`, and `create()` works for those three.

The failure mode this creates is the defining hazard of the design: a widget with
a correct factory, green tests, and no line in `widgets/index.ts` **does not
exist at runtime**. Step 3 never runs for it. `create("tooltip")` throws
`Unknown widget`, and nothing in `npm test` or `npm run typecheck` notices,
because both operate on files rather than on the assembled graph. Only the built
bundle's `listWidgets()` reveals it.

### Where type safety lives — and where it doesn't

This is the least intuitive part of the design, and the source of most confusion.

`register` is generic over `P extends WidgetProps`, and the `Map` stores the
erased `WidgetFactory`, which forces a cast inside `register`:

```ts
widgets.set(name, factory as WidgetFactory);
```

The types are therefore checked **at the factory definition**, not at the call
site:

- **Checked:** the factory's own props interface. A factory whose props don't
  extend `WidgetProps` is rejected — an `interface` gets no implicit index
  signature, so it fails to match `WidgetFactory` and produces a TS2345 that
  reads as if the *caller* forgot a property. The fix is `extends WidgetProps` on
  the interface, which is why every seeded widget has it.
- **Not checked:** anything passed through `create`. Its signature is
  `create(name: string, props: WidgetProps = {})` — `Record<string, unknown>`
  accepts every object. `create("badge", { labl: "typo" })` compiles cleanly and
  renders `<span class="badge badge--info"></span>` — an empty badge, verified
  against the built bundle. The missing prop is silently `undefined`, and
  `escapeHtml` coerces it to `""`, so the typo produces no error and no visible
  text. The widget name is a bare `string` too, so a misspelled ID is a runtime
  throw, never a compile error.

The practical consequence: tests must import the factory directly
(`import { createBadge } from "./badge.js"`) to get any type checking at all. A
test routed through `create()` discards the only guarantee the design offers.

### Why widgets are pure factories

`(props) => string`, with `register()` as the single permitted side effect. The
constraint is deliberate and it is what the rest of the setup depends on:

- Tests assert the **entire** output with `toBe(...)` — see
  `app/src/widgets/badge/badge.test.ts`. That is only possible because the same
  props always produce the same string. No DOM, no jsdom, no snapshot files.
- No lifecycle exists to hang behaviour on, so there is nothing to leak between
  callers or between tests.
- The library ships zero runtime dependencies and no stylesheet. Widgets emit
  class names (`badge badge--info`, `spinner spinner--lg`); styling and animation
  belong to the consuming app.

What the design has no answer for: interactivity (no element to bind to), async
(the factory cannot await — take resolved data as props), and cross-render state
(module-level state would break purity). These are genuine gaps, not oversights
to route around in a single widget.

### Consequences worth knowing

- **The public surface is two functions.** The built bundle exports exactly
  `create` and `listWidgets` — verified with `Object.keys()` on
  `dist/bundle.js`. `register` is deliberately absent, so consumers cannot add
  widgets from outside; registration is an internal, build-time concern.
- **Every registered widget ships.** Side-effect imports are load-bearing, so the
  bundler cannot tree-shake an unused widget — if it's imported in
  `widgets/index.ts`, it's in `dist/bundle.js` whether or not anyone calls it.
  Bundle size grows with the registry, which is what the `analyzing-bundle-size`
  skill measures.
- **Each test file gets a fresh registry.** Verified by probe: a test file that
  imports only `core/registry.js` sees `listWidgets() === []`, while one that
  also imports `./badge/badge.js` sees `["badge"]`. Vitest isolates module state
  per file, so registrations never leak across test files — and a test can only
  observe what it imported itself. This is why an in-test `listWidgets()`
  assertion cannot verify the `widgets/index.ts` wiring.
- **`strict` plus `noUncheckedIndexedAccess`** are on in `app/tsconfig.json`.
  Indexed reads come back possibly-`undefined`; handle it rather than asserting
  it away. No `any`, no `@ts-ignore`.
- **There is no lint step.** `package.json` has `test`, `test:watch`,
  `typecheck`, and `build` only. Say so rather than inventing one.

### Where new code goes

| Change | Location | Note |
|---|---|---|
| A new widget | `app/src/widgets/<name>/` + one import line | follow `creating-widget` |
| A prop or markup change | that widget's two files | nothing else is affected |
| Shared helper used by several widgets | a new module under `app/src/core/` | keep it dependency-free |
| A change to `register`/`create`/`listWidgets` | `app/src/core/registry.ts` | **protected** — every widget depends on it; raise it before editing |
| Anything needing state, async, or events | nowhere yet | the architecture has no place for it; a design decision for the human |

## Related

- `materials/architecture-brief.md` — the intended design, the source of truth
  this file was checked against.
- `app/AGENTS.md` — the short version: commands, conventions, guardrails.
- `creating-widget` (`.agents/skills/` — mirrored in `.claude/skills/`) — the
  procedure this file explains the reasoning behind.
- `app/src/widgets/badge/` — the canonical widget; two files, read them both.
