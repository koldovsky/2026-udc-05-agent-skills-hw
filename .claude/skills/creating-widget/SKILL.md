---
name: creating-widget
description: Adding a new widget to the widget-registry library in app/. Use for any request to add, create, or scaffold a widget or component here — even when it never says "widget", or looks like a one-file change (it isn't). Not for editing an existing widget, or for changes to the registry itself.
---

# Creating a widget

## When to use this

Any request to add, create, or scaffold a widget. Not for editing an existing
widget's markup or props (just edit its two files), and not for anything touching
`app/src/core/registry.ts` — a protected shared contract.

### When the request doesn't fit

Widgets are synchronous, pure, string-returning functions. Some requests imply
more than that, and the honest move is to name the limit rather than bend the
pattern around one widget:

- **Interactivity** ("a dropdown that opens on click") — there is no element to
  bind to and no lifecycle. An `onClick` prop is the tempting move and the wrong
  one: it typechecks, never fires, and `create()` won't reject it at the call
  site either. The library has no answer for this yet, so it's a design question
  for the human. (If something must ship, static markup with a `data-*` hook for
  a caller to bind is least invasive — but say that you invented it, because no
  seeded widget works that way.)
- **Async data** — the factory can't await. Take the resolved data as props.
- **State across renders or instances** — module-level state breaks purity and
  leaks between tests. Take current state as props and return the markup for it.

If a request genuinely needs one of these, say so and ask, rather than
introducing a second convention that only one widget follows.

## Instructions

Callers never import a widget — they ask the registry by ID:
`create("badge", { label: "New" })`.

That indirection is what makes this worth a skill. A widget nobody imported is
invisible: it compiles, its own tests pass, and `create("alert")` still throws
`Unknown widget`, because `register()` never ran. The steps below are ordered so
that can't happen to you.

`app/src/widgets/badge/` is the canonical example — read it first. The pattern
comes from `materials/architecture-brief.md`.

### The files

For a widget named `alert`:

| File                                  | Action                              |
|---------------------------------------|-------------------------------------|
| `app/src/widgets/alert/alert.ts`      | create — factory + `register()`     |
| `app/src/widgets/index.ts`            | edit — add the side-effect import   |
| `app/src/widgets/alert/alert.test.ts` | create — colocated vitest           |
| `app/src/index.ts`                    | leave alone — re-exports the barrel |

### Naming

Pick the ID first; the rest follows. For a date picker:

- Folder and files, kebab-case — `app/src/widgets/date-picker/date-picker.ts`
- Registry ID is the folder name — `register("date-picker", ...)`
- Factory `createDatePicker`, props interface `DatePickerProps`

A duplicate ID throws `Widget "<name>" is already registered` at import time,
taking down the whole bundle rather than one widget. Check what's taken:

```bash
grep -rn 'register("' app/src/widgets/
```

### 1. Write the factory — `app/src/widgets/<name>/<name>.ts`

```ts
import { escapeHtml } from "../../core/escape-html.js";
import { register, type WidgetProps } from "../../core/registry.js";

export interface AlertProps extends WidgetProps {
  message: string;                     // required props first
  tone?: "info" | "warn" | "error";    // optional props get a default in the factory
}

export function createAlert(props: AlertProps): string {
  // Union props are narrowed at runtime, not just in types.
  const tone = props.tone === "warn" || props.tone === "error" ? props.tone : "info";
  return `<div class="alert alert--${tone}">${escapeHtml(props.message)}</div>`;
}

register("alert", createAlert);
```

- **Write `extends WidgetProps` on the props interface.** `register` is generic
  over `P extends WidgetProps` (`Record<string, unknown>`), and a TypeScript
  interface gets no implicit index signature, so without the clause your factory
  doesn't match `WidgetFactory`. The error points the wrong way — it reads as if
  the *caller* forgot a prop:

  ```text
  error TS2345: Argument of type '(props: AlertProps) => string' is not
  assignable to parameter of type 'WidgetFactory<WidgetProps>'.
    Property 'message' is missing in type 'WidgetProps' but required in
    type 'AlertProps'.
  ```

  Don't start making `message` optional — add the `extends` clause. A `type`
  alias also compiles, but then this widget is the odd one out; stay with the
  interface.
- **Purity is what the tests rely on.** That single `register(...)` call is the
  file's only side effect, which is what lets tests assert exact strings. It buys
  nothing from the bundler: the call sits at module scope, so the side-effect
  import in `widgets/index.ts` is load-bearing and every registered widget ships
  whether or not anyone calls it.
- **`register(...)` sits at module scope, at the bottom** — not inside a function,
  since it has to run on import.
- **Imports end in `.js`** even though the source is `.ts`. `moduleResolution:
  "Bundler"` doesn't require it, but every existing import writes it — match them.
- Design props for the widget you're building. `tone` is badge's prop, shown here
  only to demonstrate the optional-with-default shape.
- **Build the markup by hand.** Requests like "a spinner" or "a date picker" are
  the ones that tempt an `npm install`; this library ships no dependencies, and
  animation or styling belongs in the consuming app's CSS.
- **Escape every prop you interpolate**, with `escapeHtml` from
  `app/src/core/escape-html.js` — never `${props.something}` raw. Widgets return
  HTML that consumers assign to `innerHTML`, and `create()` takes
  `Record<string, unknown>`, so a JS caller reaches your factory with any value.
  Unescaped, `message: '<img src=x onerror=...>'` executes.
- **Narrow union props at runtime too** — compare against the literals
  (`props.tone === "warn" || props.tone === "error" ? props.tone : "info"`)
  rather than `props.tone ?? "info"`. Types don't survive the trip through
  `create()`, and an attribute-valued prop can otherwise close the attribute.

### 2. Make it reachable — `app/src/widgets/index.ts`

```ts
import "./badge/badge.js";
import "./spinner/spinner.js";
import "./alert/alert.js";

export { listWidgets, create } from "../core/registry.js";
```

Do this now, while the factory is still in front of you — not after the tests
pass. This is the step that gets dropped, and it gets dropped because a widget
with green tests feels finished, so nothing prompts you to come back for it.

Add the line with the other imports, above the export; appending to the end of
the file works but strands imports below the export. No bindings — the import
exists purely so `register()` runs. Leave the existing export alone. This file is
the dependency root reached from `app/src/index.ts`, so a widget missing here is
absent from the bundle too.

### 3. Write the test — `app/src/widgets/<name>/<name>.test.ts`

Colocated, modelled on `app/src/widgets/badge/badge.test.ts`. Import the factory
directly, and not only for tidiness: `create` is declared
`create(name: string, props: WidgetProps = {})`, so it accepts any object at all.
`create("alert", { messge: "typo" })` typechecks clean and renders
`<div class="alert alert--info"></div>` — an empty alert, since the missing prop
is `undefined` and `escapeHtml` coerces it to `""`. Nothing errors, and nothing
shows. Your props interface guards the factory, not the caller — so a test routed
through `create()` throws away the only type checking this design gives you.

```ts
import { describe, expect, it } from "vitest";
import { createAlert } from "./alert.js";

describe("createAlert", () => {
  it("defaults to the info tone", () => {
    expect(createAlert({ message: "Saved" })).toBe(
      '<div class="alert alert--info">Saved</div>',
    );
  });

  it("respects an explicit tone", () => {
    expect(createAlert({ message: "Gone", tone: "error" })).toBe(
      '<div class="alert alert--error">Gone</div>',
    );
  });
});
```

Cover each optional prop's default plus one explicit value, and assert the
**whole** string with `toBe(...)` — these factories return strings, so a
substring match keeps passing while the markup around it rots.

Resist adding a `listWidgets()`/`create()` assertion here. It looks like it
guards step 2, but it can't: this file imports `./alert.js` directly, so
`register("alert", ...)` has already run by the time any assertion executes. It
passes whether or not step 2 happened — a green check that certifies nothing.
Verify does this properly.

## Verify

Two commands, and they fail at different things — running only the first is how
a broken widget looks finished:

```bash
cd app && npm test && npm run typecheck
```

`npm test` proves the markup. It cannot prove the widget typechecks: with
`extends WidgetProps` missing, every test still passes green while `tsc` errors,
so `typecheck` is not optional here. There is **no lint step** in this project —
say so rather than inventing one.

Neither command proves step 2, because every test imports its widget directly.
Check the wiring by reading the file (substituting the real name):

```bash
ls app/src/widgets/alert/                                  # exactly 2 files
grep -n 'register("alert"' app/src/widgets/alert/alert.ts  # one match
grep -nF 'alert/alert.js' app/src/widgets/index.ts         # one match — the real check
```

For proof rather than inspection, ask the built bundle what it actually
registered. Widgets are reachable from `app/src/index.ts` only through the
barrel, so this list is missing the new name exactly when step 2 was skipped:

```bash
cd app && npm run build && node -e "import('./dist/bundle.js').then(m => console.log(m.listWidgets()))"
```

Prints `[ 'badge', 'alert' ]` when the wiring is right, `[ 'badge' ]` when it
isn't. Nothing can fake this one — it runs the same module graph the published
bundle has.

Last, check that no prop reaches the markup unescaped. Neither `npm test` nor
`tsc` catches this — a widget that interpolates raw props is green on both:

```bash
grep -nE '\$\{[^}]*\}' app/src/widgets/alert/alert.ts
```

Every hit must be either `escapeHtml(...)` or a value **you** narrowed to
literals in this file, such as `tone` or `size`. The pattern deliberately matches
*all* interpolations, not just `${props.…}`: a destructured `const { label } =
props` produces a bare `${label}` that is exactly as unsafe, and a `props.`-only
pattern would report the file clean.

One limit worth knowing: this reads a template literal. Markup assembled by
concatenation (`"<span>" + label + "</span>"`) produces no `${…}` at all, so the
grep stays silent on it. Keep the single-template-literal shape every seeded
widget uses; if you ever concatenate, check each operand by hand.
