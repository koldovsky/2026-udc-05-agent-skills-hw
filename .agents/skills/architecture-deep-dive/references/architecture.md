# Reference: widget-registry architecture

## Overview

This explains how `app/src/core/registry.ts` and `app/src/widgets/**` fit
together, and the reasoning behind the module boundaries — the depth that
would otherwise bloat `SKILL.md`. Read this when explaining the architecture
or deciding where a change belongs; skip it if you only need to add a widget
following the existing pattern (see `creating-widget` instead).

## Deep dive

### The registry contract (`app/src/core/registry.ts`)

The entire "framework" is ~25 lines built around one module-private `Map`:

```ts
export type WidgetProps = Record<string, unknown>;
export type WidgetFactory<P extends WidgetProps = WidgetProps> = (props: P) => string;

const widgets = new Map<string, WidgetFactory>();

export function register<P extends WidgetProps>(name: string, factory: WidgetFactory<P>): void
export function create(name: string, props: WidgetProps = {}): string
export function listWidgets(): string[]
```

- `register(name, factory)` throws `Widget "${name}" is already registered`
  if the name is taken. There is **no unregister/replace** — registration is
  one-shot and permanent for the life of the process. This matters if you're
  ever tempted to add hot-reload or test-isolation logic: today, registering
  the same widget twice in one process (e.g. two test files importing the
  same module in a way that re-executes it) is a hard error by design, not a
  bug to silently paper over.
- `create(name, props = {})` throws `Unknown widget "${name}". Registered: ${...}`
  if the name isn't found, listing every currently-registered name — this is
  the only place widget names are validated at runtime.
- `listWidgets()` returns `[...widgets.keys()]`, a snapshot array, not a live
  view.
- **Type safety stops at the registry boundary.** `register` is generic over
  `P extends WidgetProps`, so `createBadge(props: BadgeProps)` is fully typed
  when called directly. But internally the factory is stored as
  `factory as WidgetFactory` (widened to `WidgetFactory<WidgetProps>`), and
  `create()`'s `props` parameter is plain `WidgetProps` (`Record<string,
  unknown>`). So `create("badge", { label: "New" })` type-checks even if
  `label` were missing or wrong-typed — `create()` is intentionally
  stringly-typed at the call boundary; per-widget type safety only exists if
  you import and call the widget's own factory function directly.

### Module boundaries

| Module | Role |
|---|---|
| `app/src/core/registry.ts` | The shared contract. Owns the `Map`, exposes `register`/`create`/`listWidgets`. Nothing else touches the `Map` directly. |
| `app/src/widgets/<name>/<name>.ts` | One widget's implementation: a pure `create<Name>(props): string` function plus a top-level `register("<name>", create<Name>)` call. Two widgets exist today: `badge` (`createBadge`) and `spinner` (`createSpinner`). |
| `app/src/widgets/<name>/<name>.test.ts` | Colocated vitest tests, importing the factory directly (not through `create()`), so tests exercise typed props. |
| `app/src/widgets/index.ts` | The **dependency root**: side-effect-imports every widget module (`import "./badge/badge.js"`, `import "./spinner/spinner.js"`) purely to force each module's top-level `register()` call to run, then re-exports `create`/`listWidgets` from the registry. This is the one file that must be touched when a widget is added, and the only place that "knows" the full widget list. |
| `app/src/index.ts` | The public bundle entry point (what `npm run build` bundles). Re-exports only `create` and `listWidgets` from `./widgets/index.js` — **`register` is not re-exported from the bundle entry**, so a consumer of the built `dist/bundle.js` can call `create("badge", …)` but cannot register a brand-new widget from outside the library; new widgets must be added inside `app/src/widgets/`. |
| `app/scripts/build.mjs` | Not part of the runtime module graph — an esbuild script (`npm run build`) that bundles `src/index.ts` → `dist/bundle.js` (minified, ESM, `platform: "neutral"`) and prints its byte size. This is what the `analyzing-bundle-size` skill wraps. |

Dependency direction is strictly one-way:
`widgets/<name>/<name>.ts → core/registry.ts` (each widget imports the
registry) and `widgets/index.ts → widgets/<name>/<name>.ts` (the aggregator
imports each widget). The registry never imports a widget — it has zero
knowledge of what widgets exist, which is what makes it a real registry
rather than a switch statement.

### Why widgets are structured this way

- **Self-registration via side-effect import** (`register(...)` runs at
  module load, triggered by `widgets/index.ts` importing the module for its
  effect) means adding a widget never requires editing `registry.ts` or any
  central switch/if-chain. The only "central" edit is the one-line import in
  `widgets/index.ts` — everything else is additive and colocated.
- **Factories are pure functions returning strings, with no DOM access.**
  There's no `document`, no class, no lifecycle. This keeps the library
  framework-free (per `app/AGENTS.md`'s guardrail against adding React/Vue)
  and trivially testable: a test is just `expect(createX(props)).toBe(html)`,
  no DOM environment needed, no mounting/unmounting.
- **One folder per widget, two files each** (`<name>.ts` + `<name>.test.ts`)
  keeps a widget's implementation and its tests physically adjacent, so the
  registry and the widget catalog can grow without any file ever needing to
  enumerate "all widgets" except `widgets/index.ts`'s import list.
- **`create()` being stringly-typed by name is deliberate**, not an
  oversight: it's what lets a caller build a widget from a dynamic string ID
  (e.g. `create(someRuntimeName, props)`) without importing every possible
  widget module. The cost is that mistakes in `props` for a given `name` are
  only caught at runtime inside the factory, not at the `create()` call site.

## Related

- `creating-widget` skill — the golden path for adding a new widget folder;
  defers to this file for *why* the pattern looks the way it does, not *how*
  to follow it.
- `analyzing-bundle-size` skill — covers `app/scripts/build.mjs` and
  `dist/bundle.js` output; this file only covers the module graph that gets
  bundled, not the bundling step itself.
- `app/AGENTS.md` — the stable public API guardrail (`register`, `create`,
  `listWidgets`) referenced above lives there.
