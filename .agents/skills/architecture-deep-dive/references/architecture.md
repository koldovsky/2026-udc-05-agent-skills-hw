# Reference: the widget-registry architecture

## Overview

This file documents how `app/` actually works: the registry contract, the
one-way dependency between modules, how a `create()` call resolves, and the
sharp edges the code does not defend against. It lives outside `SKILL.md`
because it is long and only needed once an architecture question is actually
being answered.

Every claim below is cited to `file:line` and was verified against the code at
the time of writing. If a citation no longer matches, trust the code and say
the reference has drifted.

## Deep dive

### The registry contract

`app/src/core/registry.ts` is 24 lines and holds the whole contract. It imports
nothing — it is the root of the dependency graph.

Two type aliases:

```ts
export type WidgetProps = Record<string, unknown>;                              // :2
export type WidgetFactory<P extends WidgetProps = WidgetProps> = (props: P) => string;  // :3
```

State is a single module-level `Map`, so the registry is a **process-wide
singleton** with no instancing and no scoping:

```ts
const widgets = new Map<string, WidgetFactory>();   // :5
```

Three exported functions, and that is the entire public API:

| Function | Line | Signature |
|---|---|---|
| `register` | `:7` | `<P extends WidgetProps>(name: string, factory: WidgetFactory<P>) => void` |
| `create` | `:14` | `(name: string, props?: WidgetProps) => string` |
| `listWidgets` | `:22` | `() => string[]` |

Both failure paths throw plain `Error`s with these exact messages — worth
recognising, since they are what surfaces in a broken build:

- `:9` — `Widget "badge" is already registered`
- `:17` — `Unknown widget "nope". Registered: badge`
  (the tail is the live key list — with only `badge` registered today, that is
  all it prints; the message doubles as a diagnostic as widgets are added)

`create`'s `props` parameter defaults to `{}` (`:14`), which matters more than
it looks — see *Sharp edges*.

### How a call resolves

Registration happens as a **module-load side effect**, not through any
configuration file:

1. Something imports a widget module. For the bundle that is
   `app/src/widgets/index.ts:3` (`import "./badge/badge.js";`) — a bare
   side-effect import whose only job is to execute the module.
2. The module body runs top to bottom. Its last statement is
   `register("badge", createBadge)` (`app/src/widgets/badge/badge.ts:16`),
   which inserts into the `Map`.
3. A caller then asks for it by string, never by import:
   `create("badge", { label: "New" })` → lookup at `registry.ts:15` →
   invoke at `:19` → `createBadge` (`badge.ts:11`) → the HTML string
   `<span class="badge badge--info">New</span>`.

The consequence: **the import in step 1 is what makes the widget exist.** No
build step, manifest, or decorator scans the folder tree.

### Module boundaries

Dependencies run one way only:

```
src/index.ts  ──►  src/widgets/index.ts  ──►  src/widgets/<name>/<name>.ts  ──►  src/core/registry.ts
   (bundle entry)      (side-effect barrel)         (one folder per widget)         (imports nothing)
```

- `src/core/` holds the registry **only**. Nothing widget-specific belongs here,
  and it must never import from `widgets/` — that would close the cycle.
- `src/widgets/<name>/` is exactly two files: the factory and its colocated
  `<name>.test.ts` (`app/src/widgets/badge/` is the canonical pair).
- `src/widgets/index.ts` has two distinct jobs: run every widget's
  registration via side-effect imports (`:3`), and re-export the public surface
  (`:5`).
- `src/index.ts` is one line re-exporting `create`/`listWidgets` — the bundle
  entry point for `npm run build`.

**Widget factories are deliberately not exported past their own folder.**
`createBadge` appears in no barrel; `widgets/index.ts:5` re-exports only
`listWidgets` and `create`. So the registry is the single intended access path
for consumers, and a widget's module identity stays private.

### Why it is built this way

The string-ID indirection buys **decoupling**: a caller renders a widget without
importing it, so consumer code has no static dependency on the widget set, and
widgets can be added without touching any call site. That is the property the
registry exists to provide.

Two costs follow directly from it, and both are visible in the code:

- **Compile-time prop checking is given up at the call site.** `create`'s
  signature accepts any `WidgetProps`, because at registration `registry.ts:11`
  casts `factory as WidgetFactory`, erasing the specific `P`. The type
  parameter on `register` narrows what you may *register*, not what you may
  *pass*.
- **Self-registration forces the barrel to exist.** Since registration is a
  module side effect, something must import every widget module or it is
  unreachable. `widgets/index.ts` is that something, and keeping it current is
  a manual step.

### Sharp edges

All of the following were confirmed by running the code, not inferred.

**1. `create()` performs no prop validation whatsoever.** All three of these
type-check cleanly under `strict` (`npm run typecheck` exits 0) and produce
output at runtime:

```ts
create("badge")                                   // <span class="badge badge--info">undefined</span>
create("badge", {})                               // <span class="badge badge--info">undefined</span>
create("badge", { label: "x", tone: "not-a-tone" })  // <span class="badge badge--not-a-tone">x</span>
```

A missing required prop silently interpolates the literal string `undefined`,
and a `tone` outside the declared `"info" | "warn" | "error"` union
(`badge.ts:5`) flows straight into the class attribute. `BadgeProps` protects
`createBadge`'s direct callers; it protects nothing that arrives via `create`.
Validate at the boundary if a caller is untrusted.

**2. Props are interpolated into HTML unescaped.** `badge.ts:13` uses a plain
template literal, so markup in a prop is passed through verbatim:

```ts
create("badge", { label: "<img src=x onerror=alert(1)>" })
// <span class="badge badge--info"><img src=x onerror=alert(1)></span>
```

There is no escaping helper anywhere in `src/`. Any widget rendering
caller-supplied text inherits this; treat output as trusted-input-only, or
escape inside the factory.

**3. Duplicate names throw at module load, not at call time.** The guard at
`:8`–`:10` runs while the module graph is being evaluated, so one name
collision fails **every** test file that imports the barrel, not just the
offending one. The error names the widget, so read the message rather than
bisecting.

**4. A missing barrel import fails only at runtime.** Omit the
`import "./<name>/<name>.js";` line and `create("<name>")` throws
`Unknown widget`, while the widget's own colocated test still passes — because
that test imports the factory directly, which registers it as a side effect.
Confirmed: commenting out `widgets/index.ts:3` leaves `badge.test.ts` green. A
check only catches this from a file that imports the **barrel alone**.

**5. `listWidgets()` returns registration order, not sorted order.** It is
`[...widgets.keys()]` (`:23`) over a `Map`, so it reflects insertion sequence,
which is the import order in `widgets/index.ts`. Registering `zzz` before `aaa`
yields `["badge", "zzz", "aaa"]`. Never assume it is alphabetical.

**6. There is no `unregister` or `reset`.** The `Map` lives for the process, so
a test cannot clear it. Isolation depends entirely on vitest evaluating modules
per test file; sharing a registry across test files in one module graph would
collide.

### Where new code belongs

| Change | Where | Note |
|---|---|---|
| A new widget | `src/widgets/<name>/` + a barrel import | Use the `creating-widget` skill — it has the full procedure |
| New behaviour on an existing widget | that widget's `<name>.ts` | Extend its own `Props` interface |
| Behaviour shared by all widgets | `src/core/registry.ts` | Public API of `register`/`create`/`listWidgets` is frozen — additive exports only |
| Prop validation or escaping | inside the factory, or a new `src/core/` helper | Nothing exists today; see sharp edges 1 and 2 |
| Build or bundle changes | `app/scripts/build.mjs` + `src/index.ts` | esbuild, minified ESM → `dist/bundle.js` |
| Anything needing a framework | nowhere | `app/AGENTS.md` forbids it; this library stays framework-free |

## Related

- **`creating-widget`** skill — the prescriptive procedure for adding a widget.
  This reference explains *why*; that skill covers *how*. Do not duplicate it
  here.
- `materials/architecture-brief.md` — the intended design, i.e. the spec this
  reference was checked against.
- `app/AGENTS.md` — commands, conventions, and guardrails.
- Commands: `npm test` (vitest), `npm run typecheck` (tsc --noEmit),
  `npm run build` (esbuild). **No linter is configured** — `npm run lint` does
  not exist; say so rather than inventing one.
