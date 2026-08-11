---
name: creating-widget
description: Add a new widget to the app/ widget-registry library. Use when asked to create, add, or scaffold a widget or component in this repo (e.g. "add a spinner widget", "add an alert widget").
---

# Creating a widget

## When to use this

- "Add a `spinner` widget", "create an `alert` component", "we need a `tooltip`".
- Porting an existing UI snippet into this library.
- Reviewing someone else's new widget and checking it follows the house pattern.

Do **not** use this for changing `app/src/core/registry.ts` — its public API
(`register`, `create`, `listWidgets`) is a protected shared contract. Widgets
adapt to the registry, never the other way round.

## Instructions

A widget is a **pure function returning an HTML string**, registered under its
own name at module load, so callers reach it by string ID —
`create("badge", { label: "New" })` — without importing the widget module.
`app/src/widgets/badge/` is the canonical example; read it before writing.

### 0. Pick the name

One name is used in three places and they must match exactly: the folder, the
file stem, and the registry key. Use kebab-case (`date-picker`), with the
factory in PascalCase (`createDatePicker`).

Confirm the name is free — `register()` throws
`Widget "<name>" is already registered` at **module load**, so a collision
fails every test in the suite, not just yours:

```bash
cd app && ls src/widgets/
```

### 1. `app/src/widgets/<name>/<name>.ts`

```ts
import { register, type WidgetProps } from "../../core/registry.js";

export interface <Name>Props extends WidgetProps {
  label: string;
  tone?: "info" | "warn" | "error";
}

export function create<Name>(props: <Name>Props): string {
  const tone = props.tone ?? "info";
  return `<span class="<name> <name>--${tone}">${props.label}</span>`;
}

register("<name>", create<Name>);
```

Non-obvious constraints, all load-bearing:

- **Relative imports end in `.js`, even though the files are `.ts`** —
  `"../../core/registry.js"`. This is required by the project's
  `moduleResolution: "Bundler"` + ESM setup; a bare `"../../core/registry"`
  will not resolve.
- The props interface **must** `extends WidgetProps` (`Record<string, unknown>`)
  — that constraint is what makes `register`'s generic accept the factory.
- Default optional props with `??`, not `||`, so a legitimate `""` or `0`
  survives.
- `register(...)` is the **last top-level statement**, after the factory
  declaration.
- Keep the factory **pure**: no DOM access, no I/O, no module-level mutable
  state. The `register()` call is the only permitted side effect.
- Named exports only — no `default export`.
- No `any`, no `@ts-ignore`. `strict` and `noUncheckedIndexedAccess` are both
  on, so index into arrays/records defensively.

### 2. `app/src/widgets/<name>/<name>.test.ts`

Colocated in the same folder, never in a separate `test/` tree:

```ts
import { describe, expect, it } from "vitest";
import { create<Name> } from "./<name>.js";

describe("create<Name>", () => {
  it("defaults to the info tone", () => {
    expect(create<Name>({ label: "New" })).toBe(
      '<span class="<name> <name>--info">New</span>',
    );
  });

  it("respects an explicit tone", () => {
    expect(create<Name>({ label: "Danger", tone: "error" })).toBe(
      '<span class="<name> <name>--error">Danger</span>',
    );
  });
});
```

Assert the **exact** HTML string with `toBe` — not `toContain`, not a snapshot.
Cover the default branch and at least one explicit variant of every optional
prop.

### 3. Wire it into `app/src/widgets/index.ts`

Add a side-effect import, keeping the list alphabetical:

```ts
import "./<name>/<name>.js";
```

**This step is the one that is silently skipped and it breaks the widget.**
Nothing else imports the module, so without this line `register()` never runs
and `create("<name>")` throws `Unknown widget "<name>"` at runtime — while the
widget's own unit test still passes, because it imports the factory directly.

Do **not** re-export the factory from `widgets/index.ts` or `app/src/index.ts`.
`badge` is not exported either; `create()` from the registry is the only
intended access path, and `index.ts` deliberately re-exports just
`create`/`listWidgets`.

### 4. Do not

- Add npm dependencies, or any UI framework — this library stays
  framework-free.
- Put widget code in `app/src/core/` — that folder holds the registry only.
- Invent a registration mechanism (a manifest, a barrel array, a decorator).
  `register()` at module load is the mechanism.

## Verify

```bash
cd app
npm test          # vitest — the new colocated test must pass, and so must every existing one
npm run typecheck # tsc --noEmit
```

Then confirm the three name sites and the wiring:

```bash
cd app
grep -n 'register("<name>"' src/widgets/<name>/<name>.ts   # registered under the right key
grep -n '<name>/<name>.js'  src/widgets/index.ts           # side-effect import present
grep -rn 'export default'   src/widgets/<name>/            # must return nothing
```

Finally, prove the widget resolves **through the registry**, not only as a
direct import — this is what catches a missing step 3. The check must live in a
file that imports the **barrel only**, never the factory, because importing
`./<name>.js` runs `register()` itself and masks the missing wiring. So put it
in `app/src/widgets/index.test.ts` (project-level, not colocated), not in the
widget's own test file:

```ts
import { expect, it } from "vitest";
import { create, listWidgets } from "./index.js";

it("<name> is reachable through the registry", () => {
  expect(listWidgets()).toContain("<name>");
  expect(create("<name>", { label: "Hi" })).toBe(
    '<span class="<name> <name>--info">Hi</span>',
  );
});
```

With step 3 missing this fails with `expected [] to include '<name>'`; adding
the same assertions to the colocated `<name>.test.ts` instead would pass, since
that file already imports the factory directly. Vitest isolates modules per
test file, so the extra file does not trip the duplicate-registration guard.

If you would rather not add a test file, the grep on `src/widgets/index.ts`
above is the minimum acceptable substitute — but it only proves the line exists,
not that the name matches.

Note: **no linter is configured** in this project — `npm run lint` does not
exist. Do not add one or claim to have run it.
