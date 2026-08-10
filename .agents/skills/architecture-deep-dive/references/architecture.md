# Reference: the widget-registry architecture

## Overview

This file is the depth behind the `architecture-deep-dive` skill: what each
module is allowed to know, what the registry actually guarantees, and where the
guarantees stop. It is separate from `SKILL.md` because none of it is needed to
*decide* whether the skill applies — only to answer once it does (progressive
disclosure, tier 2).

Every claim below was checked against the code at `app/src/**` and against
runtime output, not inferred from the brief. Each one has a command that
re-proves it in the [fact-check ledger](#fact-check-ledger). Line references are
to the files as they stand; if a line has moved, the `grep` in the ledger is
the authority.

Where `materials/architecture-brief.md` (the *intent*) and the code differ, this
file records the **code** and flags the gap.

## The dependency direction

Four layers, one-way edges:

```
app/src/index.ts                 export { create, listWidgets } from "./widgets/index.js"   (:2)
  └── app/src/widgets/index.ts   import "./badge/badge.js"; import "./spinner/spinner.js"   (:3-4)
      │                          export { listWidgets, create } from "../core/registry.js"  (:6)
      ├── app/src/widgets/<name>/<name>.ts   import { register, type WidgetProps }
      │                                      from "../../core/registry.js"                  (:1)
      └── app/src/core/registry.ts           no project imports at all
```

Three rules follow, and they are the ones to check in review:

- **`core/registry.ts` imports nothing from the project.** It cannot name a
  widget, which is precisely why `create` takes a `string` key instead of a
  factory: the registry is the dependency *sink*, so a widget can be added
  without editing it. A `import … from "../widgets/…"` line in `core/` is the
  architecture-breaking change to look for.
- **Widgets never import each other.** Each widget's only project-level import
  is the registry. Shared markup between two widgets therefore has no legal
  home in `widgets/<name>/` — see [Where new code goes](#where-new-code-goes).
- **`widgets/index.ts` is the composition root.** It is the only file that
  knows the full widget set, and it does so through side-effect imports, not
  named ones — nothing is re-exported from the widget modules.

`src/index.ts` adds nothing but the bundle entry point: it re-exports the two
functions that `widgets/index.ts` already re-exports from the registry. The
built bundle's surface is `create` and `listWidgets` only — **`register` is not
reachable from the bundle**, so a consumer of `dist/bundle.js` can create
widgets but cannot add one. Registration is an internal, build-time concern.

## The registry contract

`app/src/core/registry.ts`, all 24 lines of it:

```ts
export type WidgetProps = Record<string, unknown>;                                    // :2
export type WidgetFactory<P extends WidgetProps = WidgetProps> = (props: P) => string; // :3
const widgets = new Map<string, WidgetFactory>();                                      // :5
```

- **The store is one module-level `Map`** (`:5`). There is one instance per
  module graph — ESM evaluates `registry.js` once, and every importer shares
  that `Map`. Two copies of the library in one process (e.g. bundled *and*
  imported from source) mean two independent registries; that is the only way
  to get "the widget registered but `create` says unknown".
- **`register(name, factory)`** (`:7-12`) throws
  `Widget "<name>" is already registered` on a duplicate name. There is no
  `unregister`, no override, no `has`. Registration is **one-shot** and
  irreversible for the life of the module graph — a test cannot swap a widget
  out, and a name collision is a hard failure, not a last-one-wins.
- **`create(name, props = {})`** (`:14-20`) looks the name up and throws
  `Unknown widget "<name>". Registered: <every registered name>` when it misses
  (today `badge, spinner`) — the error lists the registry contents, which makes
  it a diagnostic: if the name
  you expect is missing from that list, the module never loaded (see the next
  section).
- **`listWidgets()`** (`:22-24`) returns `[...widgets.keys()]` — a fresh array,
  not a live view. Mutating the result does not touch the registry. Its order
  is `Map` insertion order, i.e. **the import order in
  `app/src/widgets/index.ts`**, not alphabetical; treat it as a stable
  reflection of that file, and do not encode assumptions about sorting.

## Registration is a module-load side effect

Each widget module ends with a top-level call — `register("badge", createBadge)`
(`badge.ts:16`), `register("spinner", createSpinner)` (`spinner.ts:14`) — that
runs when the module is *evaluated*, not when the factory is called.

Nothing evaluates a widget module except the side-effect imports in
`app/src/widgets/index.ts:3-4`. So:

> a widget that is not imported in `widgets/index.ts` does not exist at runtime,
> however correct its own file is.

This is the failure mode worth naming explicitly, because **every static check
passes while it is broken**:

| Check | Result with the import line missing |
|---|---|
| `tsc --noEmit` | clean — the file is valid TypeScript |
| `npm test` | green — the colocated test imports the factory *directly* |
| `create("<name>")` at runtime | throws `Unknown widget "<name>"` |

Only loading the built bundle and calling `listWidgets()` / `create()` catches
it, which is why the `creating-widget` skill's `## Verify` ends with a runtime
`import('./dist/bundle.js')` rather than with the test suite.

The mirror-image failure: importing the same widget module twice from two
places is harmless (ESM evaluates once), but *two modules registering the same
name* throws at import time and takes the whole graph down — not just that
widget.

## Where type safety ends

`register` is generic, and then immediately erases the generic:

```ts
export function register<P extends WidgetProps>(name: string, factory: WidgetFactory<P>): void {
  …
  widgets.set(name, factory as WidgetFactory);   // :11 — P is cast away here
}
export function create(name: string, props: WidgetProps = {}): string {   // :14
```

Because the `Map` is `Map<string, WidgetFactory>` and `WidgetProps` is
`Record<string, unknown>`, the props type survives only as far as the
`register` call site. Checked with `tsc --strict`, this is what compiles:

```ts
create("badge", { label: 42, totallyWrong: true });  // ✅ compiles — no prop checking
create("badge");                                     // ✅ compiles — required label missing
create("no-such-widget");                            // ✅ compiles — name is just a string
createBadge({ label: 42 });                          // ❌ TS2322: Type 'number' is not assignable to type 'string'
```

Only the last one — the **direct import** — is type-checked. That is the trade
the string-keyed registry buys: callers get decoupling from widget modules and
give up compile-time prop validation. Consequences to state when answering:

- The `<Name>Props` interface is a contract with **direct importers** — chiefly
  the colocated tests (`badge.test.ts:2` imports `createBadge` itself). Through
  `create()`, it is documentation.
- Missing required props do not throw; they interpolate. `create("badge")`
  returns `<span class="badge badge--info">undefined</span>` — a silent
  rendering bug, not an error. Tests that only assert "it returned a string"
  will not see it.
- Widening the boundary (a name→props type map, overloads on `create`) means
  changing the registry's public signatures, which are frozen by
  `AGENTS.md`. Propose it as a deliberate change, do not slip it in.

## The output contract

A widget factory is a **pure function returning an HTML string**, built by
template literal:

```ts
export function createBadge(props: BadgeProps): string {          // badge.ts:11
  const tone = props.tone ?? "info";
  return `<span class="badge badge--${tone}">${props.label}</span>`;   // :13
}
```

What that implies, verified against both seeded widgets:

- **No DOM APIs, no I/O, no state.** The only side effect in a widget module is
  the module-load `register()` call. This is what makes exact-string assertions
  (`toBe('<span class="badge badge--info">New</span>')`) the house test style —
  purity is what makes them stable.
- **Props are interpolated unescaped.** `create("badge", { label: "<img src=x
  onerror=alert(1)>" })` returns that markup verbatim inside the `<span>`.
  Escaping is therefore the **caller's** responsibility, and any widget that
  renders user-controlled text is an injection boundary. Say so when placing a
  feature that takes free text; if escaping is ever added, it belongs in
  `core/` as a shared helper, applied by widgets — not reimplemented per widget.
- **Optional-only props default the parameter too** (`createSpinner(props:
  SpinnerProps = {})`, `spinner.ts:8`) so a direct call with no argument is
  legal; `create()` already substitutes `{}` (`registry.ts:14`). A widget with
  a required prop (`badge`) does not do this.
- **Attribute values come from unions, not free strings** — `tone?: "info" |
  "warn" | "error"`, `size?: "sm" | "md" | "lg"` — with `??` supplying the
  default. That keeps the class-name space closed and the tests exhaustive.

## Where new code goes

| The change | Where it belongs | Note |
|---|---|---|
| A new widget | `app/src/widgets/<name>/<name>.ts` + `<name>.test.ts` + one import line in `widgets/index.ts` | hand off to the `creating-widget` skill for the exact steps |
| A new prop / variant on an existing widget | that widget's two files, nothing else | no registry change: props are `Record<string, unknown>` at the boundary |
| Markup or logic shared by several widgets | a new module under `app/src/core/` | widgets must not import each other; keep it pure and framework-free |
| Escaping, formatting, i18n helpers | `app/src/core/`, applied inside each factory | one implementation, not per widget |
| Anything changing `register` / `create` / `listWidgets` signatures | **frozen** — `AGENTS.md` guardrail | additive, separately-exported helpers are the escape hatch; propose explicitly |
| Bundling / build behaviour | `app/scripts/build.mjs` (esbuild, `platform: "neutral"`, minified, ESM) | see `analyzing-bundle-size` for measuring the result |
| A new public export for consumers | `app/src/index.ts` | it is the bundle entry; today it exports only `create` and `listWidgets` |

Rule of thumb: if the answer requires `core/` to know a widget's name, the
design is wrong — invert it so the widget registers itself.

## The bundle consequence

Side-effect registration and tree-shaking are in direct conflict, and here
registration wins. Because `widgets/index.ts` imports every widget module *for
its side effect*, the bundler cannot prove any of them unused — the `register`
call is observable behaviour. Every widget in that file ships, whether or not
anything ever calls `create` with its name.

Measured with esbuild (minified, ESM, the project's own build settings):

| Entry | `dist` size |
|---|---|
| registry + `badge` only | 411 bytes |
| registry + `badge` + `spinner` (the repo's actual entry) | 567 bytes |

So `spinner` costs 156 bytes in every consumer's bundle even if nobody creates
a spinner. That is the price of `create("name")` decoupling, and it is linear
in the widget count — the number the `analyzing-bundle-size` skill measures.

If a widget ever needs to be optional, the lever is `widgets/index.ts` (the
composition root), not the registry: a consumer-specific entry point that
imports a subset. Nothing else in the architecture needs to change.

## Pitfalls

- **The forgotten import line.** Covered above; invisible to `tsc` and to the
  test suite, visible only at runtime. First thing to check on any
  `Unknown widget`.
- **Folder renamed, string not.** The registry key is the literal in
  `register("<name>", …)`, unrelated to the folder or the function name.
  Renaming `widgets/badge/` without touching the string leaves `create("badge")`
  working and `create("chip")` failing.
- **Assuming `create()` validates.** It validates the *name*, never the props.
- **Duplicate names crash at import time**, before any test body runs — the
  whole module graph fails, which looks like a broken build rather than a
  broken widget.
- **`.js` on relative imports** is a house rule, not a compiler requirement:
  `tsconfig.json` sets `moduleResolution: "Bundler"`, which would accept
  extensionless imports; every file under `app/src/` writes `.js` anyway. Stay
  consistent.
- **`noUncheckedIndexedAccess: true`** is on: *index* access (`arr[0]`,
  `record[key]`) yields `T | undefined` even when the key looks certain. The
  registry does not depend on that flag — `widgets.get(name)` is `Map.get`,
  which returns `WidgetFactory | undefined` under any config, and the
  `if (!factory)` guard (`:16-18`) is what narrows it. The flag matters for new
  `core/` code that indexes arrays or plain objects: handle the `undefined`
  rather than asserting it away with `!`.
- **No lint step exists.** `npm test`, `npm run typecheck`, `npm run build` are
  the whole toolchain — say that rather than inventing a lint command.

## Fact-check ledger

Run from the repo root. Each row re-proves one claim above; if a row's output
differs, the code changed and this file is stale — fix it.

Expectations are written against the **widget set as it stands**, not as a fixed
list: adding a widget legitimately changes what `listWidgets()` returns, and a
row is only failing if the *shape* of the answer changed. Where a literal list
appears it is marked "today".

| Claim | Command | Expected |
|---|---|---|
| The registry imports nothing from the project | `grep -c "^import" app/src/core/registry.ts` | `0` |
| Widgets import only the registry | `find app/src/widgets -name '*.ts' -not -name '*.test.ts' -not -name 'index.ts' -exec grep -Hn '^import' {} +` | exactly one line per widget module, each ending `core/registry.js` (tests are excluded on purpose — they import their factory directly, see [Where type safety ends](#where-type-safety-ends)) |
| `widgets/index.ts` is the composition root | `grep -n "import" app/src/widgets/index.ts` | one side-effect line per widget directory, plus the single re-export from `core/registry.js` |
| Built surface is `create` + `listWidgets` only | `cd app && npm run build && node -e "import('./dist/bundle.js').then(m=>console.log(Object.keys(m)))"` | `[ 'create', 'listWidgets' ]` — `register` absent |
| `listWidgets()` follows import order | `grep '^import "' app/src/widgets/index.ts` then `cd app && node -e "import('./dist/bundle.js').then(m=>console.log(m.listWidgets()))"` | the two lists agree, name for name and in the same order (today `[ 'badge', 'spinner' ]`) |
| `listWidgets()` returns a copy | `cd app && node -e "import('./dist/bundle.js').then(m=>{const a=m.listWidgets();a.push('ghost');console.log(m.listWidgets().includes('ghost'))})"` | `false` |
| Unknown name throws and lists the registry | `cd app && node -e "import('./dist/bundle.js').then(m=>{try{m.create('nope')}catch(e){console.log(e.message)}})"` | `Unknown widget "nope". Registered: …` — the list is whatever is registered (today `badge, spinner`) |
| Duplicate name throws at registration | read `app/src/core/registry.ts:8-10`, or bundle a scratch entry calling `register("x", …)` twice | `Error: Widget "x" is already registered` |
| Props are unchecked through `create()` | add `create("badge", { label: 42 })` to a scratch `.ts` file, run `npx tsc --noEmit --strict` on it | no error |
| Direct factory calls *are* checked | same file, `createBadge({ label: 42 })` | `TS2322: Type 'number' is not assignable to type 'string'` |
| Missing required props render `undefined` | `cd app && node -e "import('./dist/bundle.js').then(m=>console.log(m.create('badge')))"` | `<span class="badge badge--info">undefined</span>` |
| Props are interpolated unescaped | `cd app && node -e "import('./dist/bundle.js').then(m=>console.log(m.create('badge',{label:'<b>x</b>'})))"` | `<span class="badge badge--info"><b>x</b></span>` |
| Registered widgets are not tree-shaken | `cd app && npm run build && node -e "Promise.all([import('./dist/bundle.js'),import('node:fs')]).then(([m,fs])=>console.log(m.listWidgets().every(n=>fs.readFileSync('dist/bundle.js','utf8').includes(n))))"` | `true` — every registered name survives into the bundle, whether or not anything creates it |

Use scratch files outside `app/src/` for the two `tsc` rows — `tsconfig.json`
has `"include": ["src"]`, and a stray file inside it would join the real
typecheck.

## Related

- `.agents/skills/creating-widget/SKILL.md` — the executable golden path this
  file explains the reasons for. Explanations here, steps there.
- `.agents/skills/analyzing-bundle-size/SKILL.md` (Task C) — measures the cost
  described in [The bundle consequence](#the-bundle-consequence).
- `app/AGENTS.md` — the short, always-loaded version: stack, commands,
  conventions, guardrails.
- `materials/architecture-brief.md` — the intended design. It is accurate but
  thinner than the code: it names `register`/`create` in prose while the module
  also exports `listWidgets` (and the types `WidgetProps` / `WidgetFactory`),
  and it does not cover the type-erasure boundary, the escaping contract, or
  the tree-shaking cost. Where the two disagree, the code is authoritative.
