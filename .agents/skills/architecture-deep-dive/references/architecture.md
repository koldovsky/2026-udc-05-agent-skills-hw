# Reference: widget-registry architecture (`app/`)

## Overview

`app/` is a tiny, framework-free TypeScript library implementing a **widget
registry**: widgets are pure functions that return HTML strings and
self-register under a string name, so callers can render them by ID
(`create("badge", { label: "New" })`) without importing the widget module
directly. This file is the tier-2 depth behind the `architecture-deep-dive`
skill; every claim below is verified against the code in `app/src/`.

## Module map

```
app/src/
├── core/registry.ts     # the shared contract (registry)
├── widgets/
│   ├── badge/
│   │   ├── badge.ts     # pure factory + register("badge", ...)
│   │   └── badge.test.ts# colocated vitest tests
│   └── index.ts         # imports every widget module; re-exports API
└── index.ts             # bundle entry point (npm run build → dist/bundle.js)
```

### `core/registry.ts` — the shared contract

The registry is a module-private `Map<string, WidgetFactory>` plus three
exported functions. **These signatures are stable — never change them:**

```ts
export type WidgetProps = Record<string, unknown>;
export type WidgetFactory<P extends WidgetProps = WidgetProps> = (props: P) => string;

export function register<P extends WidgetProps>(name: string, factory: WidgetFactory<P>): void;
export function create(name: string, props: WidgetProps = {}): string;
export function listWidgets(): string[];
```

Behaviour worth knowing:

- `register()` **throws** on duplicate names: `Widget "<name>" is already
  registered`. So a widget module must be imported only once, and each widget
  registers exactly one name.
- `create()` **throws** on unknown names and helpfully lists what IS
  registered: `Unknown widget "<name>". Registered: badge, ...`. If you see
  this error for a widget that exists on disk, the module import is missing
  from `widgets/index.ts` (see below).
- `listWidgets()` returns the registered names — useful in tests to assert a
  widget got wired in.

### `widgets/<name>/` — one folder per widget

Each widget folder contains exactly two files (see `widgets/badge/`):

- `<name>.ts` — a props interface extending `WidgetProps`, a **pure** factory
  `create<Name>(props): string` returning an HTML string, and a top-level
  `register("<name>", create<Name>)` call. Example from `badge.ts`:

  ```ts
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

- `<name>.test.ts` — colocated vitest tests asserting the exact HTML output
  (default tone + explicit tone in badge's case).

### `widgets/index.ts` — the registration root

```ts
import "./badge/badge.js";
export { listWidgets, create } from "../core/registry.js";
```

Its job is to **import every widget module for its side effect** — the
`register()` call only runs when the module is loaded. Forgetting to add a new
widget's import here is the classic failure mode: the code compiles, the
widget's own tests pass (they import the factory directly), but
`create("<name>")` throws at runtime because registration never happened.

### `src/index.ts` — bundle entry

Re-exports `create`/`listWidgets` from `widgets/index.ts`. `npm run build`
(esbuild, see `app/scripts/build.mjs`) bundles this file into
`dist/bundle.js` (minified ESM) — because the entry pulls in `widgets/index.ts`,
**every registered widget ends up in the bundle**, which is why adding a
widget is the unit of bundle-size growth (the `analyzing-bundle-size` skill
measures this).

## Data flow

1. Consumer imports the library → `src/index.ts` → `widgets/index.ts` loads
   every widget module → each module's top-level `register()` populates the
   registry Map.
2. Consumer calls `create("badge", { label: "New" })` → registry looks up the
   factory → factory returns the HTML string. No DOM, no framework — the
   caller decides what to do with the string.

## Why it is built this way

- **String-ID decoupling:** callers depend only on `core/registry.ts`, never
  on individual widget modules — widgets can be added without touching caller
  code.
- **Purity:** factories are deterministic `props → string` functions, which
  makes them trivially unit-testable (compare exact strings) and safe to run
  anywhere (no DOM access).
- **Colocation:** one folder per widget with its test keeps each widget
  self-contained; the only shared surface is the registry contract.

## Conventions (enforced expectations)

- TypeScript strict — no `any`, no `@ts-ignore`.
- Named exports only; no default exports.
- Kebab-case file/folder names; PascalCase types/interfaces.
- Imports use the `.js` extension (`../../core/registry.js`) — ESM TypeScript.
- No new npm dependencies or UI frameworks without a documented reason.
- Lint is **not configured** in this sample — don't invent a lint command;
  the real checks are `npm test` (vitest) and `npm run typecheck` (tsc).

## Common pitfalls

| Symptom | Cause |
|---|---|
| `Unknown widget "x". Registered: ...` | Missing `import "./x/x.js";` in `widgets/index.ts` |
| `Widget "x" is already registered` | Widget module imported twice, or duplicate name |
| Widget renders nothing in tests | Test imported the factory but asserted against the wrong exact string — factories return exact HTML strings, compare them fully |

## Related

- `.agents/skills/creating-widget/SKILL.md` — step-by-step golden path for
  adding a widget.
- `.agents/skills/analyzing-bundle-size/SKILL.md` — measuring the bundle
  impact of changes.
- `materials/architecture-brief.md` — the original design brief this
  reference is grounded in.