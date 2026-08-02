---
name: creating-widget
description: Use whenever the user asks to add, create, or register a new widget or UI component in this project's widget-registry library (app/) — even if they only name the widget ("add a spinner widget") and give no structural detail. Encodes the project's exact golden path so the agent doesn't invent a different file layout, factory signature, or registration mechanism.
---

# Creating a Widget

This library has one required way to add a widget: a pure factory function
that self-registers under a string name. Every widget in `app/src/widgets/`
follows this shape, and the tests, the bundler, and `create()` all depend on
it being followed exactly — deviating (e.g. a default export, a class, DOM
access in the factory) breaks the registry contract even if the code "works."

## When to use this

- The user asks to add a new widget (e.g. "add a `spinner` widget", "create
  an `alert` component for the widget library").
- The user asks to extend `app/src/widgets/` with new UI output, with or
  without specifying file structure.
- Not for changes to `app/src/core/registry.ts` itself — that file is a
  protected shared contract; its `register`/`create`/`listWidgets` signatures
  must not change.

## Instructions

For a widget named `<name>` (kebab-case, e.g. `alert`, `spinner`):

1. **Create `app/src/widgets/<name>/<name>.ts`.** It must contain exactly:
   - A `<Name>Props` interface extending `WidgetProps` (imported from
     `../../core/registry.js`) with whatever fields the widget needs.
   - A pure named-export function `create<Name>(props: <Name>Props): string`
     that returns an HTML string. No DOM access, no side effects other than
     the `register()` call below — the factory must be safe to call
     repeatedly with no external state.
   - A top-level `register("<name>", create<Name>);` call, executed at
     module load. This is what makes `create("<name>", props)` work from
     outside — without it the widget silently doesn't exist to the registry.

   Model it on the seeded example, `app/src/widgets/badge/badge.ts`:
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

2. **Create the colocated `app/src/widgets/<name>/<name>.test.ts`** (vitest).
   Cover the default-props case and at least one explicit-props case, the
   same way `app/src/widgets/badge/badge.test.ts` covers the default tone
   and an explicit tone. Import the factory directly
   (`import { create<Name> } from "./<name>.js";`) — don't go through the
   registry in the test, so the test still fails clearly if the factory
   itself is wrong, independent of registration.

3. **Add `import "./<name>/<name>.js";` to `app/src/widgets/index.ts`.**
   This is easy to forget and the failure is silent: the widget file can be
   perfectly correct and its own test can pass, but `create("<name>", ...)`
   will still throw "not registered" for every other caller (including the
   bundle entry point) until this import exists, because `register()` only
   runs when the module is actually loaded.

4. **Follow existing conventions:** TypeScript strict (no `any`, no
   `@ts-ignore`), named exports only (no default export), kebab-case
   filenames, PascalCase for the `Props` interface.

## Verify

- `cd app && npm test` — must stay green; this exercises both the new
  widget's own test file and anything else relying on the registry.
- `cd app && npm run typecheck` — catches a missing `WidgetProps` extension
  or an untyped factory.
- `grep -n "register(" app/src/widgets/<name>/<name>.ts` — should show
  exactly one `register("<name>", create<Name>)` call; its absence is the
  most common silent failure mode for this pattern.
- `grep -n "<name>/<name>.js" app/src/widgets/index.ts` — confirms the
  import was added, not just the widget file.
