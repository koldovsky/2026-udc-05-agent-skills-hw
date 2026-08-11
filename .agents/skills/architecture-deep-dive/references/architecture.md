# Reference: the widget-registry architecture

## Overview

This file documents how `app/` actually works, verified against the source at
the time of writing. It is separate from `SKILL.md` because most tasks only
need the short version ("widgets go in `widgets/<name>/`"); this depth is only
worth loading when someone asks *why* the library is shaped this way, or needs
to decide where a change belongs.

Files covered: `app/src/core/registry.ts`, `app/src/widgets/index.ts`,
`app/src/widgets/badge/`, `app/src/index.ts`, `app/scripts/build.mjs`.

## Deep dive

### The layers

Four layers, each depending only on the one below it:

```
app/src/index.ts            bundle entry — re-exports create, listWidgets
        ↓
app/src/widgets/index.ts    barrel — side-effect imports + public re-export
        ↓
app/src/widgets/<name>/     leaves — one folder per widget, self-registering
        ↓
app/src/core/registry.ts    the contract — owns the Map, depends on nothing
```

`registry.ts` imports nothing. Widgets import the registry. The barrel imports
widgets. The entry point imports the barrel. There are no cycles and no
sideways imports between widgets — a widget never imports another widget.

### The registry contract

The entire shared state is one module-level `Map`:

```ts
const widgets = new Map<string, WidgetFactory>();
```

Three exported functions, and two exported types (`WidgetProps`,
`WidgetFactory`):

```ts
export type WidgetProps = Record<string, unknown>;
export type WidgetFactory<P extends WidgetProps = WidgetProps> = (props: P) => string;

export function register<P extends WidgetProps>(name: string, factory: WidgetFactory<P>): void
export function create(name: string, props: WidgetProps = {}): string
export function listWidgets(): string[]
```

Behaviour that matters when writing or debugging widgets:

- **`register` is fail-fast on duplicates.** It throws
  `Widget "<name>" is already registered` if the name is taken. So a widget
  module must be imported once (the barrel handles that) and must not be
  registered under a name another widget already claimed.
- **`register` is the only writer.** Nothing else mutates the map; there is no
  unregister, no overwrite, no reset. Registration is permanent for the life
  of the module graph.
- **`create` throws a helpful error on unknown names**, listing what *is*
  registered: `Unknown widget "x". Registered: badge`. If you see this error
  with your new widget missing from the list, the cause is almost always a
  missing side-effect import in `widgets/index.ts` — not a bug in the widget.
- **`create` defaults `props` to `{}`**, so `create("badge")` is legal at the
  type level; whether it produces sensible HTML is the factory's business.
- **The generic on `register` is variance-loose by design.** It accepts a
  `WidgetFactory<P>` for a specific `P`, then stores it as `WidgetFactory`
  via `factory as WidgetFactory` — the one cast in the file. That is what lets
  each widget declare a precise props interface while the map stays
  homogeneous. The trade-off: prop mismatches are *not* caught at the
  `create()` call site, since `create` takes the loose `WidgetProps`.
- **`listWidgets` returns a fresh array** (`[...widgets.keys()]`) — callers
  can't mutate registry state through it. Order is Map insertion order, which
  is the import order in `widgets/index.ts`, not alphabetical.

Its public API (`register`, `create`, `listWidgets`) is a **protected
contract**: every widget depends on it, so signature changes are breaking
changes across the whole library. Per `app/AGENTS.md`, don't change them.

### Why widgets are pure functions returning strings

A widget factory is `(props) => string`. No DOM, no framework, no component
instance, no lifecycle. Consequences worth understanding:

- **Testability is trivial** — assert on the exact returned string, no
  renderer or jsdom needed. See `app/src/widgets/badge/badge.test.ts`:
  `expect(createBadge({ label: "New" })).toBe('<span class="badge badge--info">New</span>')`.
- **It works anywhere** — server, build step, or browser, because the output
  is just a string. This is why the library stays framework-free by rule.
- **The only permitted side effect is the module-load `register(...)` call.**
  Purity elsewhere is what makes registration-by-import safe: importing a
  widget module can't do anything except add an entry to the map.

The seeded `badge` widget is the canonical shape — a props interface extending
`WidgetProps`, a `create<Name>` named export, `??` for optional defaults, and
a single `register("badge", createBadge)` at the bottom.

### Registration-by-import: the load-bearing subtlety

Widgets are discovered by **string name at runtime**, not by import at the
call site. That decoupling is the point of the registry — `create("badge", …)`
works without the caller knowing where `badge` lives.

The cost is that a widget only exists if its module was *executed*. That's the
job of the side-effect imports in `app/src/widgets/index.ts`:

```ts
import "./badge/badge.js";

export { listWidgets, create } from "../core/registry.js";
```

Bare `import "./x/x.js";` with no bindings — its only purpose is running the
module for its `register()` call. Miss this line and the widget is invisible:
it type-checks, its own colocated test passes (that test imports the factory
directly), and `create("<name>")` still throws at runtime. This is the single
most common way to get a new widget wrong, and it is why the golden path has
three steps rather than two.

Note the import specifiers end in `.js` while the sources are `.ts` — the
package is `"type": "module"` (ESM), so TypeScript wants the emitted path.

### The bundle path

`app/src/index.ts` is a two-line re-export of `create` and `listWidgets` from
the barrel. It is the esbuild entry point (`app/scripts/build.mjs`), bundling
`src/index.ts` → `dist/bundle.js`, minified, ESM, `platform: "neutral"`, then
printing the byte size.

Because the barrel side-effect-imports every widget, **every registered widget
is in the bundle** — the registry map is reachable from the entry, so nothing
tree-shakes away. Practical consequence: bundle size grows with each widget
added, which is what the `analyzing-bundle-size` skill measures.

### Where does a change belong?

- **New widget** → `app/src/widgets/<name>/` + barrel import. Cheap, additive,
  affects nothing else. Use the `creating-widget` skill.
- **Changing one widget's markup/props** → that widget's folder only. If you
  find yourself editing another widget, the change is misplaced.
- **Something every widget needs** (a new lifecycle hook, prop validation,
  unregister) → `core/registry.ts`, which is expensive: it's the protected
  contract. Prefer adding to it (a new exported function) over changing
  existing signatures.
- **Shared helper used by several widgets but not part of the contract** →
  a new module under `core/` that widgets import directly; do not route it
  through the registry, and do not have one widget import another.
- **New tooling/commands** → `app/scripts/` + a `package.json` script, the way
  `build.mjs` is wired.

### Pitfalls

1. **Forgetting the barrel import** — the failure described above. Symptom:
   `Unknown widget "x". Registered: …` with `x` absent from the list.
2. **Double registration** — importing a widget module from two places, or
   reusing a name, throws `already registered` at import time.
3. **Expecting type safety from `create()`** — it takes `WidgetProps`, so a
   typo'd prop is not a compile error. The factory's own interface is where
   types are enforced; test the exact output string.
4. **Assuming `listWidgets()` is sorted** — it's import order. Sort it
   yourself if you need determinism for display.
5. **Reaching for a lint command** — none is configured in this project
   (`app/package.json` has `test`, `test:watch`, `typecheck`, `build`). Say so
   rather than inventing one.
6. **Adding a framework or a dependency** — explicitly out of bounds per
   `app/AGENTS.md`; the string-returning design exists to avoid both.

## Related

- `.agents/skills/creating-widget/SKILL.md` — the mechanical golden path.
- `.agents/skills/analyzing-bundle-size/SKILL.md` — measuring what the bundle
  path above produces.
- `materials/architecture-brief.md` — the intent this reference verifies
  against the real code.
- `app/AGENTS.md` — conventions and guardrails in short form.
