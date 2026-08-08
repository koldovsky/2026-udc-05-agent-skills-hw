---
name: creating-widget
description: Golden path for adding a new widget to the app/ widget-registry library — folder, pure factory + register(), colocated vitest test, widgets/index.ts wiring. Use when asked to add or create a new widget/component.
---

# Creating a widget

## When to use this

- "Add a `<name>` widget", "create a new component for X", "we need a widget
  that renders Y" — anything that introduces a **new** widget to
  `app/src/widgets/`.
- Not for editing an existing widget's markup or props, and not for changes to
  `app/src/core/registry.ts` (its public API is frozen).

## Instructions

A widget is a **pure function returning an HTML string**, registered under a
name so callers do `create("<name>", props)` without importing the module.
Follow the seeded `app/src/widgets/badge/` example exactly. Three files are
involved — skipping step 3 is the classic failure: the module never loads, so
`register()` never runs and `create("<name>")` throws `Unknown widget`.

Naming: widget name is kebab-case (`progress-bar`), the folder and file take
that same name, the factory is `create<PascalName>` (`createProgressBar`), the
props interface is `<PascalName>Props`.

The snippets below use `chip` as the worked example — substitute the real
widget name in every path, identifier and string.

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

- Props interface **extends `WidgetProps`** (`Record<string, unknown>`) — the
  registry's factory type requires it.
- Return a template literal; build the HTML by hand, no DOM APIs.
- The `register(...)` call is top-level, last line, outside the function.
- Required props stay required (`label: string`, like the seeded `badge`);
  optional ones get `?` and a `??` default inside the factory. If **every**
  prop is optional, give the parameter itself a default
  (`props: ChipProps = {}`) so `createChip()` is callable with no argument.
  That default is for direct/test calls only — `create("chip")` already
  substitutes `{}` and never passes `undefined`.

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

Colocated in the widget folder (no `__tests__/`). Assert the **exact** output
string; cover the default-props case and at least one explicit-props case. If
every prop is optional (the `props: ChipProps = {}` case above), add a third
test that calls the factory with **no argument** — that default only holds if
something exercises it.

### 3. Wire it into `app/src/widgets/index.ts`

```ts
import "./badge/badge.js";
import "./chip/chip.js";   // <- add this line
```

A side-effect import only — the new widget exports nothing from here. (The
file's existing `export { listWidgets, create } from "../core/registry.js";`
line is the registry's own re-export; leave it alone.)

### Project constraints

- **`.js` extension on every relative import** — the package is ESM
  (`"type": "module"`) and every file under `app/src/` writes imports that way.
  TS maps `./chip.js` back to `chip.ts`.
- Named exports only; no default export.
- Factories are pure: no DOM access, no module state, no side effects other
  than the load-time `register()`.
- Strict TypeScript: no `any`, no `@ts-ignore`.
- Do not change the signatures of `register` / `create` / `listWidgets` in
  `app/src/core/registry.ts`.
- Widget names are unique — `register` throws
  `Widget "<name>" is already registered` on a duplicate. Check
  `listWidgets()` or grep `register("` under `app/src/widgets/` first.
- No new npm dependencies, no UI framework.

## Verify

Run this as-is, with `NAME` set to the widget you just added — every command
is copy-pasteable:

```bash
cd app
export NAME=chip                    # export, not plain assignment — the runtime check below reads process.env
export PROPS='{"label":"Beta"}'     # the widget's REQUIRED props; '{}' if all of them are optional

npm test                                        # new + existing tests green
npm run typecheck                               # strict tsc --noEmit
grep -n "register(\"$NAME\"" "src/widgets/$NAME/$NAME.ts"  # factory self-registers
grep -n "$NAME/$NAME.js" src/widgets/index.ts   # module actually gets loaded
```

Static checks are not enough — wiring is only proven at runtime. Bundle the
library and load it:

```bash
npm run build
node -e "import('./dist/bundle.js').then(m => {
  console.log(m.listWidgets());
  console.log(m.create(process.env.NAME, JSON.parse(process.env.PROPS)));
})"
```

`listWidgets()` must contain the new name, and `create("<name>", { ... })` must
return the HTML string instead of throwing `Unknown widget "<name>"`. A missing
step 3 shows up exactly here and nowhere else.

Read the printed HTML, don't just check that it printed: passing `{}` for a
widget that has required props yields `undefined` inside the markup instead of
an error, which is why `PROPS` carries them.
