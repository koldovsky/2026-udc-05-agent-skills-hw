# Reference: widget-registry architecture (`app/`)

## Overview

`app/` is a framework-free TypeScript library that turns widgets into
string-addressable factories: callers do `create("badge", { label: "New" })`
without ever importing `badge.ts`. This file documents how that indirection is
implemented, what it costs, and which rules keep it working — the depth that
would bloat `SKILL.md`. Every signature below was read from the current code
(`app/src/core/registry.ts`, `app/src/widgets/**`, `app/src/index.ts`).

## Deep dive

### The contract: `app/src/core/registry.ts`

The whole "framework" is one module with one `Map` and three exported
functions:

```ts
export type WidgetProps = Record<string, unknown>;
export type WidgetFactory<P extends WidgetProps = WidgetProps> = (props: P) => string;

const widgets = new Map<string, WidgetFactory>();

export function register<P extends WidgetProps>(name: string, factory: WidgetFactory<P>): void
export function create(name: string, props: WidgetProps = {}): string
export function listWidgets(): string[]
```

Properties that matter and that a generic "plugin registry" answer gets wrong:

- **`register` throws on a duplicate name** — `Widget "<name>" is already
  registered`. Registration is therefore *not* idempotent: importing a widget
  module twice under two different specifiers (e.g. `./badge/badge.js` and
  `./badge/badge.ts`) would crash at load time, not silently overwrite.
- **There is no `unregister` and no reset hook.** The `Map` lives for the
  lifetime of the module instance. Tests must not rely on clearing it; the
  seeded tests avoid the issue entirely by importing the factory directly
  (`import { createBadge } from "./badge.js"`) instead of going through
  `create()`.
- **`create` throws for unknown names**, and the message enumerates what *is*
  registered: `Unknown widget "x". Registered: badge`. That error string is
  the fastest diagnostic for the most common bug in this repo — a widget file
  that exists but was never imported (see "Load order" below).
- **The generic on `register` is erased at the boundary**: the factory is
  stored as `WidgetFactory` via `factory as WidgetFactory`. So `create` is
  typed `(name: string, props: WidgetProps = {}) => string` — per-widget prop
  types are enforced when you call the factory directly, **not** when you go
  through `create()`. A typo in a prop name passed to `create()` is a runtime
  concern, which is why colocated tests assert on the exact HTML string.
- `WidgetProps = Record<string, unknown>` is why every widget's props
  interface must `extends WidgetProps` — an interface with only declared
  members is not assignable to an index-signature type otherwise.

### Module boundaries

```
app/src/index.ts            → re-exports { create, listWidgets }   (bundle entry point)
app/src/widgets/index.ts    → imports every widget for side effects, re-exports the registry API
app/src/widgets/<name>/     → <name>.ts (factory + register call) + <name>.test.ts
app/src/core/registry.ts    → the shared contract; imports nothing
```

The dependency direction is strictly one-way: `widgets/ → core/`. `core/`
never imports a widget and contains no widget name — that is what makes the
registry reusable and what makes "where does this go?" answerable:

- Logic that all widgets need (registration, lookup, error messages) → `core/`.
- Anything that knows a specific widget's markup, props, or tone vocabulary →
  `widgets/<name>/`. Note that the `"info" | "warn" | "error"` tone union is
  declared per-widget in `badge.ts`, *not* shared in `core/` — deliberately:
  `core/` stays free of presentational vocabulary. A second widget with tones
  duplicates the union rather than importing it from `badge`.
- Changes to `register`/`create`/`listWidgets` signatures are off-limits
  (`AGENTS.md` guardrail) — every widget depends on them.

### Load order: why the wiring import is load-bearing

Registration happens as a **side effect of module evaluation** — the
`register("badge", createBadge)` statement at the bottom of `badge.ts` runs
when something imports that module. Nothing scans the filesystem. So the chain
is:

```
consumer → app/src/index.ts → app/src/widgets/index.ts → import "./badge/badge.js" → register("badge", …)
```

`app/src/widgets/index.ts` exists purely to be that side-effect root:

```ts
import "./badge/badge.js";
export { listWidgets, create } from "../core/registry.js";
```

Consequences:

- Forgetting the `import "./<name>/<name>.js";` line is the classic failure:
  the file compiles, the test that imports the factory directly still passes,
  and only `create("<name>", …)` fails — at runtime, with `Unknown widget`.
- The `.js` extension on a `.ts` source path is required, not a typo:
  `app/package.json` is `"type": "module"`, so this is ESM specifier
  resolution (TypeScript's `moduleResolution` for ESM expects the emitted
  path).
- Because every widget is imported eagerly from one root, **the bundle
  contains every registered widget** — there is no tree-shaking benefit to
  unused widgets. That is the direct link to the bundle-size skill: each new
  widget grows `dist/bundle.js`, which is why measuring it is worth a script
  (`.agents/skills/analyzing-bundle-size/`).

### Build and test surfaces

- `app/scripts/build.mjs` runs esbuild over `src/index.ts` → `dist/bundle.js`,
  `bundle: true, minify: true, format: "esm", platform: "neutral"`, then prints
  the byte size via `statSync`. `platform: "neutral"` is consistent with the
  library being environment-agnostic — no Node built-ins, no DOM.
- Tests are colocated `*.test.ts` run by vitest (`npm test`). There is no
  separate `tests/` tree and **no linter configured** — `npm run typecheck`
  (`tsc --noEmit`) is the static-analysis surface.

### Common pitfalls

| Symptom | Cause |
|---|---|
| `Unknown widget "x". Registered: badge` | missing `import "./x/x.js";` in `app/src/widgets/index.ts` |
| `Widget "x" is already registered` (at load) | the module got imported under two specifiers, or `register` was called twice |
| `tsc` error on the props interface | props interface doesn't `extends WidgetProps` |
| Module not found at runtime | `.js` extension omitted from a relative import |
| Wrong props accepted silently | called through `create()`, which erases the per-widget generic |

## Related

- `materials/architecture-brief.md` — the intended design, stated by the
  project author; this reference is its verification against the code.
- `.agents/skills/creating-widget/SKILL.md` — the mechanical golden path that
  follows from these boundaries.
- `.agents/skills/analyzing-bundle-size/SKILL.md` — measures the cost of the
  eager-import design described above.
