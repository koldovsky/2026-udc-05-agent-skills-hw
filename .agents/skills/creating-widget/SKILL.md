---
name: creating-widget
description: Use when asked to add a new widget/component to this repo's widget-registry library (app/), e.g. "add a new widget", "create a <name> component", "register a new widget" — encodes the exact folder layout, factory-function pattern, and registry wiring so a new widget matches the seeded `badge` widget.
---

# Creating a widget

<!--
Everything below this line only loads into context when the agent actually
invokes the skill — keep the frontmatter description tight (it's ALWAYS in
context for every skill you have installed), and put the real instructional
weight here.
-->

## When to use this

- The user asks to add/create a new widget or component to `app/`.
- The user asks "how do I register a widget" (i.e. wiring a new one in).
- The user wants to extend `app/src/widgets/` with a new UI piece.

Not for explaining how the registry works internally end-to-end — that's
`architecture-deep-dive` (see `app/AGENTS.md`).

## Instructions

This is the **golden path** from `materials/architecture-brief.md` —
`app/src/widgets/badge/` is the canonical reference implementation, follow it
exactly. Three steps, in order:

1. **Create `app/src/widgets/<name>/<name>.ts`** (kebab-case `<name>`) — a
   pure factory function + its `register()` call:
   - Define a `<Name>Props` interface extending `WidgetProps` (imported from
     `"../../core/registry.js"`, PascalCase `<Name>`).
   - Export a pure function `create<Name>(props): string` that returns an
     HTML string — no DOM access, no side effects other than the `register()`
     call below. Named export only, no default export, no `any`/`@ts-ignore`.
   - At module load (top level, outside the function), call
     `register("<name>", create<Name>)` — this is what makes the widget
     discoverable via `create("<name>", props)` elsewhere without importing
     the module directly.

   Mirror `app/src/widgets/badge/badge.ts`:
   ```ts
   import { register, type WidgetProps } from "../../core/registry.js";

   export interface MyWidgetProps extends WidgetProps {
     label: string;
   }

   export function createMyWidget(props: MyWidgetProps): string {
     return `<div class="my-widget">${props.label}</div>`;
   }

   register("my-widget", createMyWidget);
   ```

2. **Create the colocated `app/src/widgets/<name>/<name>.test.ts`** — vitest
   (`describe`/`it`/`expect`), covering the default case and any optional
   prop variants. Mirror `app/src/widgets/badge/badge.test.ts`.

3. **Add `import "./<name>/<name>.js";` to `app/src/widgets/index.ts`**, next
   to the existing `import "./badge/badge.js";` line — without this the
   widget's module never loads, so its `register()` call never runs and
   `create("<name>", ...)` fails with "Unknown widget".

Do not touch `app/src/core/registry.ts`'s public API
(`register`/`create`/`listWidgets`) — it's the shared, protected contract
every widget (including this new one) depends on.

## Verify

- `cd app && npm test` — new widget's tests pass, existing tests (incl.
  `badge`) stay green.
- `cd app && npm run typecheck` — no `any`/`@ts-ignore`, strict mode clean.
- `grep -n "register(" app/src/widgets/<name>/<name>.ts` — confirms the
  widget self-registers.
- `grep -n "<name>" app/src/widgets/index.ts` — confirms the new widget's
  module is imported so its `register()` call actually runs.
