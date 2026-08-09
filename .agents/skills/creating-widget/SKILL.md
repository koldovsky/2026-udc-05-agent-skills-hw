---
name: creating-widget
description: Golden path for adding a NEW widget to the app/ widget-registry library — folder, pure factory + register(), colocated vitest test, widgets/index.ts wiring. Use only when a widget that does not exist yet is being created; not for edits to an existing widget's props, markup or tests.
---

# Creating a widget

## When to use this

**Scope check — before reading further.** This skill applies only when
`app/src/widgets/<name>/` **does not exist yet**. If it exists, the request is
an edit: stop here, close this file, work from that widget's own two files.

- **Applies:** "add a `<name>` widget", "create a new component for X", "we
  need a widget that renders Y" — anything introducing a **new** widget to
  `app/src/widgets/`.
- **Does not apply:** changing an existing widget's props, markup, tone/variant
  unions or tests; renaming a widget; any change to `app/src/core/registry.ts`
  (its public API is frozen).

## Instructions

A widget is a pure function returning an HTML string, registered under a name
so callers do `create("<name>", props)` without importing the module. Follow
the seeded `app/src/widgets/badge/`. Three files — skipping step 3 is the
classic failure: the module never loads, so `register()` never runs and
`create("<name>")` throws `Unknown widget`.

Naming: kebab-case (`progress-bar`) for both folder and file, factory
`create<PascalName>`, props interface `<PascalName>Props`. Snippets below use
`chip` — substitute the real name in every path, identifier and string.

### 1. `app/src/widgets/chip/chip.ts`

```ts
import { register, type WidgetProps } from "../../core/registry.js";

export interface ChipProps extends WidgetProps {
  label: string;
  size?: "sm" | "lg";
}

export function createChip(props: ChipProps): string {
  const size = props.size ?? "sm";
  return `<span class="chip chip--${size}">${props.label}</span>`;
}

register("chip", createChip);
```

- Props interface **extends `WidgetProps`** — the registry's factory type
  requires it.
- Return a template literal; build the HTML by hand, no DOM APIs.
- `register(...)` is top-level, last line, outside the function.
- Required props stay required (`label: string`, like `badge`); optional ones
  get `?` and a `??` default. If **every** prop is optional, default the
  parameter too (`props: ChipProps = {}`) — for direct/test calls, since
  `create("chip")` already substitutes `{}`.

### 2. `app/src/widgets/chip/chip.test.ts`

```ts
import { describe, expect, it } from "vitest";
import { createChip } from "./chip.js";

describe("createChip", () => {
  it("defaults to the sm size", () => {
    expect(createChip({ label: "Beta" })).toBe('<span class="chip chip--sm">Beta</span>');
  });

  it("respects an explicit size", () => {
    expect(createChip({ label: "Beta", size: "lg" })).toBe(
      '<span class="chip chip--lg">Beta</span>',
    );
  });
});
```

Colocated (no `__tests__/`). Assert the **exact** output string: default-props
case, one explicit-props case, and — if every prop is optional — a third test
calling the factory with **no argument**, since that default only holds if
something exercises it.

### 3. Wire it into `app/src/widgets/index.ts`

```ts
import "./badge/badge.js";
import "./chip/chip.js";   // <- add this line
```

A side-effect import only; the widget exports nothing from here. Leave the
file's existing `export { listWidgets, create } from "../core/registry.js";`
line alone.

### Constraints on top of `app/AGENTS.md`

Its conventions (named exports, no `any`, pure factories, no new deps, frozen
registry API) apply as written. Two are specific to adding a widget:

- **`.js` extension on every relative import** — a house rule, not a compiler
  requirement: `tsconfig.json` sets `moduleResolution: "Bundler"`, which accepts
  extensionless imports too, but every file under `app/src/` writes `.js` and
  the code must stay consistent. TS maps `./chip.js` back to `chip.ts`.
- **Widget names are unique** — `register` throws
  `Widget "<name>" is already registered`. Grep `register("` under
  `app/src/widgets/` first.

## Verify

Run as-is, with `NAME` set to the widget just added:

```bash
cd app
export NAME=chip                    # export, not plain assignment — the runtime check below reads process.env
export PROPS='{"label":"Beta"}'     # the widget's REQUIRED props; '{}' if all of them are optional

npm test                                        # new + existing tests green
npm run typecheck                               # strict tsc --noEmit
grep -n "register(\"$NAME\"" "src/widgets/$NAME/$NAME.ts"  # factory self-registers
grep -n "$NAME/$NAME.js" src/widgets/index.ts   # module actually gets loaded
```

Static checks are not enough — wiring is only proven at runtime:

```bash
npm run build
node -e "import('./dist/bundle.js').then(m => {
  console.log(m.listWidgets());
  console.log(m.create(process.env.NAME, JSON.parse(process.env.PROPS)));
})"
```

`listWidgets()` must contain the new name and `create(...)` must return the HTML
instead of throwing `Unknown widget "<name>"` — a missing step 3 shows up here
and nowhere else. Read the printed HTML, don't just check that it printed:
passing `{}` for a widget with required props yields `undefined` inside the
markup instead of an error, which is why `PROPS` carries them.
