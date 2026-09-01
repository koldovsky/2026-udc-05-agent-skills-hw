# Reference: widget-registry architecture (`app/`)

## Overview

This file is the verified deep dive behind the `architecture-deep-dive` skill:
the exact module boundaries of `app/`, the widget registration lifecycle, the
data flow from `create("badge", …)` to an HTML string, and the reasoning
behind the design. It lives outside `SKILL.md` because it is only needed when
someone asks *how* or *why* the project is shaped this way — the skill's
frontmatter stays cheap, this depth loads on demand.

Every signature and path below was checked against the current source
(`app/src/core/registry.ts`, `app/src/widgets/**`, `app/src/index.ts`,
`app/scripts/build.mjs`, `app/tsconfig.json`, `app/package.json`).

## Deep dive

### Layer model

```
app/src/index.ts              ← bundle entry point (esbuild)
        │  re-exports create, listWidgets
        ▼
app/src/widgets/index.ts      ← widgets barrel: side-effect imports + re-export
        │  import "./badge/badge.js";  (one line per widget)
        ▼
app/src/widgets/<name>/<name>.ts   ← widget module: pure factory + register()
        │  import { register, type WidgetProps } from "../../core/registry.js";
        ▼
app/src/core/registry.ts      ← the shared contract (no dependencies at all)
```

Dependencies point **one way only**: widgets depend on core, the barrel
depends on widgets, the entry point depends on the barrel. Core imports
nothing; no widget imports another widget. That acyclic shape is what lets a
widget be added or deleted as a self-contained folder plus one barrel line.

### `app/src/core/registry.ts` — the contract

25 lines, no imports, three exported functions and two exported types:

```ts
export type WidgetProps = Record<string, unknown>;
export type WidgetFactory<P extends WidgetProps = WidgetProps> = (props: P) => string;

const widgets = new Map<string, WidgetFactory>();

export function register<P extends WidgetProps>(name: string, factory: WidgetFactory<P>): void;
export function create(name: string, props: WidgetProps = {}): string;
export function listWidgets(): string[];
```

Behavioural details that matter:

- **`widgets` is module-private state** — a `Map<string, WidgetFactory>` held
  in the module scope. There is no `unregister`, no `clear`, no reset hook.
  Under ESM the module is evaluated once per module graph, so the map is a
  process-wide singleton for the app; under vitest each test *file* gets its
  own module graph, so registrations do not leak between test files.
- **`register` is fail-fast on duplicates**: `if (widgets.has(name)) throw new
  Error(\`Widget "${name}" is already registered\`)`. Name collisions surface
  at module-load time, not as a silent overwrite. This is why importing a
  widget module twice through two different specifiers would be a bug — the
  barrel is the single import site.
- **`create` is fail-loud on unknowns**: it throws
  `Unknown widget "<name>". Registered: <comma-separated list>` — the error
  message enumerates `[...widgets.keys()]`, which makes a "forgot the barrel
  import" mistake immediately diagnosable.
- **Type erasure at the boundary**: `register` accepts a narrowly typed
  `WidgetFactory<P>` and stores it via `factory as WidgetFactory`. The
  per-widget prop type is enforced at the *call site of the factory*, not at
  the `create(name, props)` call site — `create` takes a loose `WidgetProps`
  and cannot type-check props for a string ID. Consequence: `create("badge",
  {})` compiles but throws/renders `undefined` at runtime. Direct
  `createBadge({ label: "New" })` is the type-safe path; `create()` is the
  dynamic, string-keyed path. This trade-off is deliberate — it's the price of
  creating widgets by name without importing their modules.

### `app/src/widgets/<name>/<name>.ts` — the widget module

Canonical example, `app/src/widgets/badge/badge.ts` (17 lines):

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

Invariants encoded here:

- The props interface **extends `WidgetProps`** so it satisfies the
  `WidgetFactory<P extends WidgetProps>` constraint (an interface with only
  declared members is not otherwise assignable to an index-signature type).
- The factory is **pure**: props in, string out. No `document`, no `window`,
  no fetch, no mutable module state. That is what makes tests plain
  string-equality assertions and keeps the library usable in Node, in a
  worker, or during SSR.
- Exactly **one top-level side effect**: the `register(...)` call at the
  bottom of the file. Registration happens as a consequence of the module
  being imported — there is no explicit bootstrap/`init()` step anywhere.
- **CSS classes are BEM-ish and derived from the widget name**
  (`badge badge--<tone>`), not from a styling framework; the library ships no
  CSS, only class names for the consumer to style.
- Named exports only; no default exports anywhere in `src/`.

### `app/src/widgets/index.ts` and `app/src/index.ts` — the barrels

```ts
// app/src/widgets/index.ts
import "./badge/badge.js";
export { listWidgets, create } from "../core/registry.js";
```

```ts
// app/src/index.ts
export { create, listWidgets } from "./widgets/index.js";
```

The widgets barrel has two jobs, and both are load-bearing:

1. **Side-effect import per widget** — `import "./badge/badge.js";` with no
   bindings. Its only purpose is to execute the module so its `register()`
   runs. Omit this line and the widget compiles, its unit test still passes
   (the test imports the module directly), but `create("<name>")` throws
   `Unknown widget` and the widget is tree-shaken out of the bundle entirely.
   This is the single most common failure mode in this repo.
2. **Re-export of the registry's read/use API** (`create`, `listWidgets`) —
   note `register` is deliberately *not* re-exported to consumers: widgets
   register themselves, callers only create.

`src/index.ts` is a thin public facade over the barrel and is the entry point
named in `app/scripts/build.mjs` (`entryPoints: ["src/index.ts"]`).

### Runtime data flow

`create("badge", { label: "New" })` resolves as:

1. Consumer imports `app/src/index.ts` → triggers `app/src/widgets/index.ts`
   → triggers `app/src/widgets/badge/badge.ts`.
2. At badge module evaluation, `register("badge", createBadge)` puts the
   factory in the registry `Map`. All registration is complete before any
   consumer code runs — module evaluation precedes the importer's body.
3. `create("badge", props)` looks the name up, throws if missing, otherwise
   calls `factory(props)`.
4. `createBadge` returns `'<span class="badge badge--info">New</span>'`. The
   library returns a **string**; nothing in `app/` ever touches the DOM.

### Build & tooling boundary

- `app/package.json` is `"type": "module"`, private, with dev-only deps
  (typescript, vitest, esbuild) and scripts `test` (`vitest run`),
  `test:watch`, `typecheck` (`tsc --noEmit`), `build`
  (`node scripts/build.mjs`). **No linter is configured** — do not invent one.
- `app/scripts/build.mjs` runs esbuild: `src/index.ts` → `dist/bundle.js`,
  `bundle: true, minify: true, format: "esm", platform: "neutral"`, then
  prints the byte size via `statSync`. `platform: "neutral"` reinforces the
  no-DOM/no-Node-builtins rule; `dist/` is a build artifact, never edited.
- `app/tsconfig.json`: `strict: true` plus `noUncheckedIndexedAccess`, target
  ES2022, `moduleResolution: "Bundler"`, `include: ["src"]`. Because
  resolution is `Bundler`, the `.js` suffix on relative imports is not
  strictly required by the compiler — but every file in `src/` uses it, so
  keep it for consistency and for ESM-runtime portability.
- Tests are colocated `*.test.ts` next to the widget (`badge.test.ts` asserts
  exact HTML output with `toBe`, one case for defaults, one for explicit
  props). There is no separate `tests/` directory and no test for
  `registry.ts` itself.

### Where a new change belongs

| Change | Goes in | Also update |
|---|---|---|
| New widget | `src/widgets/<name>/<name>.ts` + `<name>.test.ts` | one `import` line in `src/widgets/index.ts` |
| New prop on an existing widget | that widget's `<name>Props` interface + factory | its colocated test |
| New shared helper used by 2+ widgets | new module under `src/core/` | nothing — import it from the widgets |
| Anything changing `register`/`create`/`listWidgets` signatures | **don't** — protected public API | — |
| New public export for consumers | `src/index.ts` (via the widgets barrel) | — |

### Common pitfalls

1. **Missing barrel import** — widget "works" in its own test but
   `create("<name>")` throws `Unknown widget` and it never reaches the bundle.
2. **Duplicate name** — `register` throws at import time; the whole barrel
   fails to load, so *every* widget appears broken. Check
   `ls app/src/widgets/` before choosing a name.
3. **Props interface not extending `WidgetProps`** — a `tsc` error at the
   `register()` call, not at the factory definition, which misleads.
4. **Reaching for the DOM** (`document.createElement`) — breaks purity,
   breaks `platform: "neutral"`, breaks the string-equality tests.
5. **Expecting `create()` to type-check props** — it cannot; it takes
   `WidgetProps`. Use the direct factory export when type safety matters.
6. **Adding a framework or runtime dependency** — the library is
   framework-free by design and has zero runtime dependencies; a new one
   changes the bundle-size story measured in Task C.

## Related

- `.agents/skills/creating-widget/SKILL.md` — the step-by-step recipe for
  adding a widget that follows these invariants.
- `.agents/skills/analyzing-bundle-size/SKILL.md` — measures the
  `src/index.ts` → `dist/bundle.js` chain described above.
- `app/AGENTS.md` — the short baseline (stack, commands, guardrails).
- `materials/architecture-brief.md` — the intent brief this reference was
  checked against.

