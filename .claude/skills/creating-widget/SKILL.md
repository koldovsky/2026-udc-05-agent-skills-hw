---
name: creating-widget
description: How to add a new widget to this widget-registry library (app/). Use when asked to add/create a new widget or UI component (e.g. "add a spinner widget", "create an alert component") — encodes the project's golden path: folder layout, pure factory, register() call, colocated vitest test, and wiring into widgets/index.ts. Not needed for changes to existing widgets' logic or to the registry core.
model: claude-haiku-4-5
---

# Creating a new widget

## Recommended model

This is a **mechanical, fully-specified task** — the skill supplies the entire
golden path, so no architectural judgment is needed. Route it to the cheapest
capable tier:

1. **Preferred:** Claude Haiku (`claude-haiku-4-5`) — fast and cost-effective;
   following this skill's template is well within its capability.
2. **Fallback:** Claude Sonnet (`claude-sonnet-5`, or `claude-sonnet-4-6`) if
   Haiku is unavailable in your tool.
3. Otherwise any inexpensive model your tool offers.

Do not burn an Opus/Fable-tier model on this — the expertise lives in the
skill, not the model. (This skill's `model:` frontmatter key mirrors this preference as a machine-readable hint; tools that
don't support it ignore the key — apply the ladder manually when delegating.)

## When to use this

- The user asks to add a **new widget/component** to the library (e.g. "add a
  `spinner` widget", "create an `alert` widget").
- You are porting or scaffolding a widget and need the correct file layout.

Do NOT use this for changing `app/src/core/registry.ts` — its public API
(`register`, `create`, `listWidgets`) is a protected contract and must not
change.

## Instructions

Follow the golden path — the seeded `app/src/widgets/badge/` is the canonical
example; mirror it exactly.

1. **Create `app/src/widgets/<name>/<name>.ts`** (kebab-case folder + file):
   - A **pure** factory function `create<Name>(props): string` that returns an
     HTML string. No DOM access, no side effects other than step 2's
     `register()` call.
   - A props interface `<Name>Props extends WidgetProps` (import `WidgetProps`
     from `../../core/registry.js` — note the `.js` extension in the import,
     this is an ESM TypeScript project).
   - Optional props get defaults via `??` (see `badge.ts`: `const tone =
     props.tone ?? "info";`).
   - Call `register("<name>", create<Name>)` at the **top level of the
     module** (module-load-time registration).
   - **Named exports only** — no default exports. No `any`, no `@ts-ignore`
     (TypeScript strict).

2. **Create the colocated test `app/src/widgets/<name>/<name>.test.ts`**
   (vitest, mirror `badge.test.ts`): at minimum one test for the default of
   each optional prop and one for an explicit value, asserting the exact HTML
   string output of the factory.

3. **Wire it in:** add `import "./<name>/<name>.js";` to
   `app/src/widgets/index.ts` — without this the `register()` call never runs
   and `create("<name>", ...)` throws at runtime.

4. **Add a registration test case.** The colocated test imports the factory
   *directly*, so it stays green even if you forget step 3 — nothing in the
   suite would catch an unregistered widget. Close that hole: add a case for
   your widget to `app/src/widgets/registration.test.ts` (create the file if
   it doesn't exist yet) that goes **through the registry**, not the factory:

   ```ts
   import { describe, expect, it } from "vitest";
   import { create, listWidgets } from "./index.js";

   describe("widget registration", () => {
     it("registers <name> so it is reachable by name", () => {
       expect(listWidgets()).toContain("<name>");
       expect(create("<name>", { /* minimal required props */ })).toBe(
         "<expected html string>",
       );
     });
   });
   ```

   Do NOT import `node:fs`/`node:path` here to auto-scan folders —
   `@types/node` is not a devDependency of `app/`, so that fails
   `npm run typecheck` (and adding the dependency violates the repo's
   no-new-deps guardrail). Explicit per-widget cases only.

Template (replace `alert`/`Alert` with your widget's name):

```ts
// app/src/widgets/alert/alert.ts
import { register, type WidgetProps } from "../../core/registry.js";

export interface AlertProps extends WidgetProps {
  message: string;
  tone?: "info" | "warn" | "error";
}

export function createAlert(props: AlertProps): string {
  const tone = props.tone ?? "info";
  return `<div class="alert alert--${tone}">${props.message}</div>`;
}

register("alert", createAlert);
```

## Verify

- `cd app && npm test` — all tests green, including your new colocated test.
- `cd app && npm run typecheck` — no TS errors.
- `grep -n "register(" app/src/widgets/<name>/<name>.ts` — exactly one
  top-level `register("<name>", ...)` call.
- `grep -n "<name>" app/src/widgets/index.ts` — the widget module is imported
  so registration runs.
- `app/src/widgets/registration.test.ts` has a case for the new widget — this
  is the only test that fails if the `widgets/index.ts` import is forgotten.
- No changes to `app/src/core/registry.ts`.
- Optional cross-check: `node
  .agents/skills/analyzing-bundle-size/scripts/measure-bundle.mjs` — the
  bundle must GROW after adding a widget; an unchanged size means the
  `widgets/index.ts` import is missing (the bundle is a registration canary).