# Reference: widget-registry architecture

## Overview

This library has exactly two kinds of module: the registry (one file, a
shared contract) and widgets (one folder each, all following the same
shape). Almost every architectural question about this codebase reduces to
"which side of that boundary does this belong on" — this file explains both
sides and how they connect, verified against the current code rather than
described in the abstract.

## Deep dive

### The registry: `app/src/core/registry.ts`

This is the entire module (24 lines; the leading comment is omitted below) —
worth reading in full rather than summarizing, since it's short enough that
summarizing loses information:

```ts
export type WidgetProps = Record<string, unknown>;
export type WidgetFactory<P extends WidgetProps = WidgetProps> = (props: P) => string;

const widgets = new Map<string, WidgetFactory>();

export function register<P extends WidgetProps>(name: string, factory: WidgetFactory<P>): void {
  if (widgets.has(name)) {
    throw new Error(`Widget "${name}" is already registered`);
  }
  widgets.set(name, factory as WidgetFactory);
}

export function create(name: string, props: WidgetProps = {}): string {
  const factory = widgets.get(name);
  if (!factory) {
    throw new Error(`Unknown widget "${name}". Registered: ${[...widgets.keys()].join(", ")}`);
  }
  return factory(props);
}

export function listWidgets(): string[] {
  return [...widgets.keys()];
}
```

Three function exports — together with the exported `WidgetProps` type
(imported by every widget module alongside `register`) — that is the entire
public API. `WidgetFactory` is also exported but stays internal to
`registry.ts`; no widget module imports it. Each widget instead exports its
own `create<Name>` function (`createAlert`, `createBadge`, `createSpinner`)
for direct import — used by that widget's own colocated test — while the
package-level API callers reach for is `create()`:

- **`register(name, factory)`** — stores a factory under a string name in a
  module-level `Map`. Throws if `name` is already taken — registration is
  one-shot, not upsert. There's no `unregister`; the map lives for the
  process lifetime.
- **`create(name, props)`** — looks up the factory and calls it. Throws
  (listing what *is* registered, which matters for debugging) if `name`
  isn't found. This is the only way callers reach a widget — there's no
  direct-import path that also works "properly," since a widget that's
  never `register()`-ed exists as code but not as a creatable widget.
- **`listWidgets()`** — returns the registered names. Used by callers who
  want to enumerate rather than know a name up front.

The `widgets` Map itself is not exported — it's module-private state.
That's the actual reason widgets *must* call `register()` at module load
(see below): there is no other way to get a factory into the map.

**Do not change these three signatures.** Every widget module and
`app/src/widgets/index.ts` depends on this exact shape; a signature change
here is a breaking change for the whole library, not a local edit.

### Widgets: `app/src/widgets/<name>/`

Each widget is a folder with exactly two files. `app/src/widgets/badge/` is
the canonical example:

```ts
// badge.ts
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

Why this exact shape, not something looser:

- **The factory is pure** (`(props) => string`, no DOM, no I/O). That's what
  lets `create()` be safe to call repeatedly and from anywhere — a factory
  with side effects would make `create()`'s behavior depend on call order or
  environment, which nothing in the registry accounts for.
- **`register(...)` runs at module load**, as a bare top-level call, not
  inside an exported "init" function. This is a deliberate trade: it means
  importing the module is the same act as registering it, so
  `app/src/widgets/index.ts` (see below) only has to *import* every widget,
  not separately call some setup function per widget. The cost is that this
  is a side-effecting import — if a widget module is never imported, its
  `register()` never runs, and `create("<name>", ...)` fails with "Unknown
  widget" even though the file with the correct code exists on disk. This is
  the single most common way this pattern breaks (see `app/src/widgets/index.ts`
  below).
- **Colocated `<name>.test.ts`** (e.g. `badge.test.ts`, `spinner.test.ts`)
  imports the factory directly (`import { createBadge } from "./badge.js"`),
  not through `create()`. That means a widget's own test still fails
  correctly if the factory logic is wrong, independent of whether
  registration happened to work.

### The assembly point: `app/src/widgets/index.ts`

Deliberately described rather than quoted, since its contents change with
every widget added — read the file itself for the current list. Its shape is
invariant: one side-effect import line per widget, `import
"./<name>/<name>.js";` (kept alphabetical in practice, though nothing depends
on the order), followed by the single re-export line

```ts
export { listWidgets, create } from "../core/registry.js";
```

This file's only job is to import every widget module for its side effect
(`register()`) and re-export the two registry functions callers need. It is
the one place that has to know about every widget by name — adding a widget
means adding one line here (`import "./<name>/<name>.js";`), and forgetting
it is silent: the new widget's own file and test can be fully correct, and
`npm test` can still be green if the new test only calls the factory
directly, while `create("<name>", ...)` throws for every other caller.

### The bundle entry point: `app/src/index.ts`

```ts
export { create, listWidgets } from "./widgets/index.js";
```

One line, re-exporting from `app/src/widgets/index.ts`. This is what
`npm run build` (esbuild) treats as the dependency root — so a widget that
isn't imported by `app/src/widgets/index.ts` is also invisible to the bundle,
not just to `create()` at runtime. Task C's bundle-size skill measures the
output of building from this file.

### Module boundary, summarized

- `app/src/core/registry.ts` owns *how* creation and lookup work. Nothing
  outside it touches the `widgets` Map.
- `app/src/widgets/<name>/*` own *what* a specific widget renders. Nothing
  in a widget module should reimplement registry bookkeeping.
- `app/src/widgets/index.ts` owns *which* widgets exist in the running
  program — it's the only file that imports widget modules by name.
- `app/src/index.ts` owns *what the published bundle contains* — currently
  just `create` and `listWidgets`, re-exported unchanged.

## Related

- `materials/architecture-brief.md` — the original source-of-truth brief
  this reference was checked against; this file goes deeper on the "why,"
  the brief is the shorter authoritative summary.
- `.agents/skills/creating-widget/SKILL.md` — the golden path for adding a
  new widget; read this reference first if the question is "why does the
  golden path look like that," read `creating-widget` if the question is
  "what do I do to add one."
