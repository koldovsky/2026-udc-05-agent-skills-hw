# Reference: widget-registry architecture

> Loaded by `architecture-deep-dive/SKILL.md` only when the skill triggers
> (progressive disclosure, tier 2) — kept deliberately more detailed than
> SKILL.md needs, so it can answer follow-up questions without re-reading
> the source.

## Overview

`app/` is a small, framework-free TypeScript library with exactly two
architectural layers: a generic **registry** (`app/src/core/registry.ts`)
that knows nothing about specific widgets, and a set of **widget modules**
(`app/src/widgets/<name>/`) that know nothing about each other. Everything
else (`app/src/widgets/index.ts`, `app/src/index.ts`) exists to wire those
two layers together for a bundler. This file explains the contract each
layer relies on and why the split exists, so you can tell where a given
change belongs without guessing.

## Deep dive

### The registry contract (`app/src/core/registry.ts`)

The entire module is 25 lines and exports four things:

```ts
export type WidgetProps = Record<string, unknown>;
export type WidgetFactory<P extends WidgetProps = WidgetProps> = (props: P) => string;

const widgets = new Map<string, WidgetFactory>();

export function register<P extends WidgetProps>(name: string, factory: WidgetFactory<P>): void
export function create(name: string, props: WidgetProps = {}): string
export function listWidgets(): string[]
```

- `widgets` is a private `Map<string, WidgetFactory>`, module-scoped — there
  is exactly one registry instance per process, not a class you instantiate.
- `register(name, factory)` throws `Widget "${name}" is already registered`
  if `name` is already in the map. This is the mechanism that catches
  duplicate widget names (e.g. copy-pasting a widget folder and forgetting
  to rename it) — a thrown error at import time, not a silent overwrite.
- `create(name, props = {})` looks the factory up by string key and calls
  it. If `name` isn't registered, it throws `Unknown widget "${name}".
  Registered: <comma-joined list>` — the error message enumerates what *is*
  registered, which only works because every widget module has already run
  its `register()` call by the time `create` is invoked (see "Import order"
  below).
- `listWidgets()` returns `[...widgets.keys()]` — a snapshot array, not a
  live view of the map.

`WidgetFactory<P>` is generic over the props type, but `register` erases
that generic when storing into the `Map<string, WidgetFactory>` (note the
`factory as WidgetFactory` cast on the store side). That's a deliberate
trade: individual widgets get a strongly-typed `<Name>Props` interface for
their own factory function, but the registry itself is untyped-by-design
past that boundary — `create()` can't statically know which props shape a
given string `name` expects, because the whole point of `create` is to
accept the widget name as a runtime string. This is the reason `create`'s
`props` parameter is the wide `WidgetProps`, not a union of every widget's
prop type.

`register`, `create`, and `listWidgets` are called out in `AGENTS.md` and
`app/AGENTS.md` as the **protected public API** — their signatures must not
change, because every widget module and every consumer of the library goes
through them. If a task asks to change how registration or lookup works
(e.g. "widgets should be looked up case-insensitively"), that's a
registry-level change and needs explicit sign-off, not something a
widget-level skill should do unprompted.

### Widget modules (`app/src/widgets/<name>/`)

Each widget is a folder with exactly two files: `<name>.ts` and
`<name>.test.ts`. There are two seeded so far — `badge` and `spinner` — and
both follow the identical shape. `badge.ts` in full:

```ts
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

Three properties matter here:

1. **The factory is pure.** `createBadge` (and `createSpinner`) only reads
   `props` and returns a string — no DOM access, no `document`, no I/O, no
   mutation of anything outside the call. This is what lets the whole
   library run in Node (tests, bundling) with no DOM shimming, and it's why
   `WidgetFactory` is typed as `(props: P) => string` rather than something
   that touches an element.
2. **Registration is a side effect at module load, not inside the
   factory.** `register("badge", createBadge)` runs once, at the top level,
   the moment `badge.ts` is imported — it is not called from inside
   `createBadge`. This means *importing* a widget module is what makes it
   reachable via `create("badge", ...)`; calling `createBadge` directly
   (which the test file does) never touches the registry at all.
3. **Widget modules don't import each other.** `badge.ts` and `spinner.ts`
   each import only from `../../core/registry.js`. Nothing in `app/src/widgets/`
   references another widget. The registry is the only shared surface
   between widgets — this is what makes "add a widget" a strictly additive
   change that can't break an existing one (short of a name collision,
   which `register` already guards against).

### The barrel and import order (`app/src/widgets/index.ts`)

```ts
import "./badge/badge.js";
import "./spinner/spinner.js";

export { listWidgets, create } from "../core/registry.js";
```

These two imports are side-effect-only (no bindings pulled in) — their only
job is to force `badge.ts` and `spinner.ts` to execute, which runs their
`register()` calls. This file is the **one place** that needs to know a
given widget exists; nothing in `core/registry.ts` or in another widget
module references `badge` or `spinner` by name. Adding a widget means
adding one import line here — this is also why the golden path (see
`creating-widget`) ends with "wire it into `widgets/index.ts`": skip that
step and the widget's `register()` call never runs, so `create("<name>",
...)` throws `Unknown widget`.

`widgets/index.ts` then re-exports `create`/`listWidgets` from the
registry, so a consumer of the widgets barrel gets both "every widget is
registered" and "here's how to look one up" from a single import.

Note the trade-off this creates: because every widget is imported
unconditionally for its side effect, a bundler can't tree-shake out an
unused widget — pulling in `app/src/widgets/index.ts` pulls in all of them.
That's the direct reason bundle size (Task C's `analyzing-bundle-size`
skill) is worth tracking as widgets are added; it's not a hypothetical
concern.

### The bundle entry point (`app/src/index.ts`)

```ts
export { create, listWidgets } from "./widgets/index.js";
```

One line, re-exporting from the widgets barrel. This is the file
`npm run build` (esbuild, per `app/package.json`) treats as the bundle
root — importing it is what pulls in the registry, every widget module, and
therefore every `register()` call, into `dist/bundle.js`.

### Why the `.js` extensions in `.ts` source files

Every intra-project import (`../../core/registry.js`, `./badge/badge.js`,
`./widgets/index.js`) uses a `.js` extension even though the actual source
files are `.ts`. This isn't a typo repeated four times — `app/tsconfig.json`
sets `"module": "ESNext"` and `"moduleResolution": "Bundler"`, which expects
ESM-style specifiers that resolve the way they will at runtime after
compilation (where `.ts` becomes `.js`). New widget files should follow the
same convention rather than importing `../../core/registry.ts` or
extensionless `../../core/registry`.

### Where a change belongs

| Ask | File |
|---|---|
| Add a new widget | `app/src/widgets/<name>/<name>.ts` + `<name>.test.ts`, then wire it into `app/src/widgets/index.ts` — see the `creating-widget` skill |
| Change how lookup/registration works (e.g. case-insensitive names, listing with metadata) | `app/src/core/registry.ts` — but its `register`/`create`/`listWidgets` signatures are protected; confirm scope before changing them |
| Change what the bundle exports | `app/src/index.ts` |
| Measure the impact of a change on bundle size | not a source change — see the `analyzing-bundle-size` skill and `npm run build` in `app/` |

## Related

- `creating-widget` skill — the step-by-step for adding a widget that
  follows the pattern described above.
- `analyzing-bundle-size` skill — measures the tree-shaking trade-off noted
  in the barrel section.
- `materials/architecture-brief.md` — the original design brief this
  reference was verified against.
