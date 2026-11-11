# Reference: architecture of the app/ widget registry

## Overview

This file records how `app/` is actually wired, based on its six source and
script files: what each module exports, how a widget ends up callable by
name, how the bundle is produced, and where the code has sharp edges. It is
kept out of `SKILL.md` so the detail only loads when an architecture question
or a non-trivial change needs it. Line-level facts here should be re-checked
against the files if the code has moved on.

## Deep dive

### Module map

The whole library is these files:

| File | Exports | Imports | Imported by |
|---|---|---|---|
| `app/src/core/registry.ts` | `type WidgetProps`, `type WidgetFactory`, `register`, `create`, `listWidgets` | nothing | `widgets/badge/badge.ts`, `widgets/index.ts` |
| `app/src/widgets/badge/badge.ts` | `interface BadgeProps`, `createBadge` | `register`, `type WidgetProps` from `../../core/registry.js` | `widgets/index.ts` (side effect only), `badge.test.ts` |
| `app/src/widgets/badge/badge.test.ts` | nothing | `describe`, `expect`, `it` from `vitest`; `createBadge` from `./badge.js` | run by `npm test` (`vitest run`) |
| `app/src/widgets/index.ts` | re-exports `listWidgets`, `create` from `../core/registry.js` | `./badge/badge.js` (bare side-effect import) | `src/index.ts` |
| `app/src/index.ts` | re-exports `create`, `listWidgets` from `./widgets/index.js` | `./widgets/index.js` | `scripts/build.mjs` (as `entryPoints`) |
| `app/scripts/build.mjs` | nothing (top-level `await build(...)`) | `build` from `esbuild`, `statSync` from `node:fs` | `npm run build` (`node scripts/build.mjs`) |

The public surface of the bundle is only `create` and `listWidgets`.
`register`, `WidgetProps`, `WidgetFactory`, `BadgeProps`, and `createBadge` are
not re-exported from `src/index.ts`. A consumer of `dist/bundle.js` therefore
cannot add widgets at runtime; every widget must be compiled in through
`widgets/index.ts`.

`package.json` has no `dependencies`, only `devDependencies` (`typescript
^5.6.0`, `vitest ^2.1.0`, `esbuild ^0.24.0`). No file in `app/src/` imports a
third-party package except the test file's `vitest` import.

### Registry internals (`app/src/core/registry.ts`)

Types:

- `export type WidgetProps = Record<string, unknown>;`
- `export type WidgetFactory<P extends WidgetProps = WidgetProps> = (props: P) => string;`

State is a single module-level, non-exported constant:
`const widgets = new Map<string, WidgetFactory>();`. Nothing outside this file
can read or modify it except through the three functions below. Because it
lives at module scope, there is one registry per loaded copy of the module.

Functions:

- `register<P extends WidgetProps>(name: string, factory: WidgetFactory<P>): void`
  - If `widgets.has(name)`, it throws
    `` new Error(`Widget "${name}" is already registered`) ``. There is no
    overwrite path and no return value to signal success.
  - Otherwise it stores `widgets.set(name, factory as WidgetFactory)`.
- `create(name: string, props: WidgetProps = {}): string`
  - Looks up `widgets.get(name)`. If missing, it throws
    `` new Error(`Unknown widget "${name}". Registered: ${[...widgets.keys()].join(", ")}`) ``.
    With an empty registry the message ends in `Registered: ` followed by
    nothing.
  - Otherwise it returns `factory(props)`. When the caller omits `props`, the
    factory receives `{}`.
- `listWidgets(): string[]` returns `[...widgets.keys()]`, a fresh array in
  insertion (registration) order. Mutating the returned array does not affect
  the registry.

What the `factory as WidgetFactory` cast means:

- `tsconfig.json` sets `"strict": true`. Under strict function-type checking a
  `(props: BadgeProps) => string` is not assignable to
  `(props: WidgetProps) => string`, because `WidgetProps` does not guarantee
  the required `label`. The cast tells the compiler to accept it anyway, which
  erases `P` at the storage boundary.
- As a result, `create()` checks props only against
  `Record<string, unknown>`. `create("badge", { tone: "loud" })` and
  `create("badge")` both typecheck. At runtime `createBadge` then gets an
  object without `label`, and with `tone: "loud"` it returns
  `<span class="badge badge--loud">undefined</span>`.
- The registry does no runtime validation either. Typed props exist only when
  calling a factory directly, for example `createBadge({ label: "New" })`, as
  `badge.test.ts` does.

### Data flow: from import to `create()`

1. Something imports `app/src/index.ts`, either the bundle consumer or
   `scripts/build.mjs` through `entryPoints: ["src/index.ts"]`.
2. `src/index.ts` re-exports from `./widgets/index.js`, which loads
   `widgets/index.ts`.
3. `widgets/index.ts` runs `import "./badge/badge.js";`. That evaluates
   `badge.ts`, which imports the registry and, as its last statement, calls
   `register("badge", createBadge);`.
4. `widgets/index.ts` then re-exports `create` and `listWidgets` from the same
   registry module, so callers see the populated `Map`.
5. `create("badge", { label: "New" })` looks up `"badge"` and returns
   `<span class="badge badge--info">New</span>`.

Registration is a side effect of module evaluation. There is no discovery
step, config list, or init function.

If the `import "./<name>/<name>.js";` line is missing from
`widgets/index.ts`:

- The widget module is never evaluated through the entry point, so its
  `register()` never runs and it is not reachable from `src/index.ts`.
- `listWidgets()` does not contain the name, and `create("<name>")` throws
  `Unknown widget "<name>". Registered: badge` (listing whatever is
  registered).
- The widget's own test still passes, because the test imports its module
  directly (`import { createBadge } from "./badge.js";`) and never goes
  through `widgets/index.ts`. Green tests do not prove the widget is wired in.

### Build and type setup

`app/scripts/build.mjs` calls esbuild's `build()` with:

- `entryPoints: ["src/index.ts"]`
- `bundle: true`
- `minify: true`
- `format: "esm"`
- `outfile: "dist/bundle.js"`
- `platform: "neutral"`

It then reads the file size with `statSync("dist/bundle.js")` and prints
`` `dist/bundle.js — ${size} bytes` ``. The paths are relative, so the script
expects `app/` as the working directory; the documented way to run it is
`cd app && npm run build`. The script uses top-level `await`, which works
because it is an `.mjs` file and `package.json` sets `"type": "module"`.

`app/tsconfig.json` flags that matter here:

- `"target": "ES2022"`, `"module": "ESNext"`, `"moduleResolution": "Bundler"`.
- `"strict": true`, which is why the cast in `register()` is needed.
- `"noUncheckedIndexedAccess": true`: indexed reads on arrays and records
  include `undefined`, so new code must handle that case. The registry's
  `if (!factory)` guard after `Map.get` follows the same habit.
- `"types": ["vitest/globals"]`, although `badge.test.ts` still imports
  `describe`, `expect`, and `it` explicitly from `vitest`.
- `"include": ["src"]`: `npm run typecheck` (`tsc --noEmit`) checks only
  `src/`. `scripts/build.mjs` is not typechecked, and `tsc` never emits files;
  esbuild alone produces output.

Relative imports always end in `.js` (`"../../core/registry.js"`,
`"./badge.js"`, `"./widgets/index.js"`) even though the files on disk are
`.ts`. The package is ESM (`"type": "module"`), and specifiers are written as
the emitted ESM file names. TypeScript resolves each `.js` specifier to the
matching `.ts` source. Keep the `.js` suffix in new imports to stay
consistent.

### Where to implement a change

| Change | Files to touch | Risk |
|---|---|---|
| New widget | New `app/src/widgets/<name>/<name>.ts` and `<name>.test.ts`; one import line in `app/src/widgets/index.ts` | Low. A name that is already registered throws at load and breaks importing the whole library. A forgotten import line leaves the widget unregistered while its test stays green. |
| Change one widget's markup | That widget's `<name>.ts` and its `<name>.test.ts` (exact `toBe` strings) | Low and local. Callers that match on the old HTML or class names break silently, because only the widget's own test checks output. |
| Change registry behaviour (overwrite, unregister, validation, error text) | `app/src/core/registry.ts`; add a registry test, since none exists today | High. Every widget and both public exports depend on it. The signatures of `register`, `create`, and `listWidgets` must not change; add behaviour without changing them. |
| Change public exports | `app/src/widgets/index.ts` and `app/src/index.ts` | Medium. It changes what bundle consumers can call, and exporting `register` would open runtime registration. |
| Build change (format, minify, platform, output path) | `app/scripts/build.mjs` | Medium. It changes `dist/bundle.js` and the printed size line, which bundle-size tooling reads. The script is outside `tsc`'s `include`, so typecheck will not catch mistakes there. |

### Pitfalls visible in the code

- Duplicate names throw. `register()` throws
  `Widget "<name>" is already registered` instead of overwriting. Because
  registration happens at import time, the error surfaces when the library is
  first imported, not when the widget is used.
- A missing import in `widgets/index.ts` makes the widget unreachable while
  its test still passes (see "Data flow").
- `create()` gives no prop type safety because of the cast: wrong or missing
  props compile and render values such as `undefined` into the HTML.
- `createBadge` interpolates `props.label` and `tone` into HTML without
  escaping. `createBadge({ label: "<b>x</b>" })` emits the raw tags, and via
  `create()` any string can reach the `class` attribute. New widgets copied
  from badge inherit this.
- There is no unregister or reset. The `Map` is private and no function
  removes entries, so a registration lasts for the life of the module
  instance, including across tests that share it.
- `registry.ts` has no test file. Its error messages and default `{}` props
  are covered by nothing in the current suite.
- The `Unknown widget` message lists every registered name, so it grows with
  the registry and is the quickest way to see what was actually loaded.

## Related

- `.agents/skills/creating-widget/SKILL.md`: the step-by-step golden path for
  adding a widget. Use it instead of the table above for routine widgets.
- `app/AGENTS.md`: stack, commands, conventions, and guardrails for `app/`.
- `.agents/skills/analyzing-bundle-size/`: the agreed location of the
  bundle-size skill that wraps `npm run build`.
- `materials/architecture-brief.md`: the intended design, useful for checking
  intent. The code files cited above win when they disagree.
