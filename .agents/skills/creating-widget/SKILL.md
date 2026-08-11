---
name: creating-widget
description: Encodes the golden path for adding a new widget to this repo's framework-free widget-registry library — a pure factory function, a self-registration call, a colocated vitest test, and an import wired into the widgets barrel. Use this whenever the user asks to add, create, build, or scaffold a new widget or component for this library (e.g. "add a tooltip widget", "create a spinner component", "I need a new badge-like element"), even if they don't mention the registry, `register()`, or the file layout explicitly — any request to introduce a new self-contained UI piece into `app/src/widgets/` should trigger this.
---

# Creating a widget

<!--
Everything below this line only loads into context when the agent actually
invokes the skill — keep the frontmatter description tight (it's ALWAYS in
context for every skill you have installed), and put the real instructional
weight here.
-->

## When to use this

- The user asks to add, create, scaffold, or implement a new widget/component
  in this library (`app/src/`), by any phrasing — "add a X widget", "create a
  component that does Y", "I need a new badge/tooltip/spinner/etc."
- The user asks you to follow the project's pattern for widgets, or asks how
  a new widget should be structured.
- Not applicable to changes inside `app/src/core/registry.ts` itself — that
  file is the shared contract every widget depends on, and its public API
  (`register`, `create`, `listWidgets`) must stay stable. If the ask is about
  changing the registry rather than adding a widget, this skill doesn't apply.

## Instructions

This library is intentionally tiny and has exactly one accepted shape for a
widget — deviating from it (default exports, DOM access, extra files, side
effects at import time beyond the `register()` call) breaks the contract
every other widget and the bundle entry point rely on. Follow `app/src/widgets/badge/`
as the canonical reference implementation while you do this.

1. **Create `app/src/widgets/<name>/<name>.ts`** — the widget's own folder,
   kebab-case `<name>`. This file holds exactly two things:
   - A pure factory function `create<Name>(props): string` that returns an
     HTML string. It must be pure: no DOM access, no globals, no side effects
     — just string-building from `props`. Use a named export (never
     `default`), define a `<Name>Props` interface extending `WidgetProps`
     from `../../core/registry.js` for its props, and avoid `any` /
     `@ts-ignore` (this project is strict TypeScript). Mirror
     `app/src/widgets/badge/badge.ts`:
     ```ts
     import { register, type WidgetProps } from "../../core/registry.js";

     export interface <Name>Props extends WidgetProps {
       // widget-specific props here
     }

     export function create<Name>(props: <Name>Props): string {
       // pure string-building only
       return `<div class="<name>">...</div>`;
     }

     register("<name>", create<Name>);
     ```
   - A top-level `register("<name>", create<Name>)` call, run once at module
     load. This is how the widget becomes reachable by string ID via
     `create("<name>", props)` without anyone importing the widget module
     directly. Registering the same name twice throws (see
     `registry.ts`), so double-check `<name>` isn't already registered.

2. **Create the colocated `app/src/widgets/<name>/<name>.test.ts`** — vitest,
   same folder as the widget, following `app/src/widgets/badge/badge.test.ts`:
   import the factory (not `register`/`create`) and assert directly on its
   HTML string output for the default case and any prop variations (e.g. an
   optional prop's default value, and an explicit override).

3. **Wire it into `app/src/widgets/index.ts`** — add
   `import "./<name>/<name>.js";` alongside the existing `import "./badge/badge.js";`.
   This line's only job is to run the module's top-level `register()` call;
   nothing needs to be imported by name. Note the `.js` extension in the
   import path even though the source file is `.ts` — this project's TS
   config resolves ESM-style, so every intra-project import uses `.js`
   (see the existing imports in `badge.ts` and `index.ts` for the pattern).

Do not touch `app/src/core/registry.ts` — its `register`/`create`/`listWidgets`
signatures are the shared contract every widget (old and new) depends on.

## Verify

- `cd app && npm test` — the new `<name>.test.ts` should run and pass
  alongside the existing suite (vitest picks up every colocated `*.test.ts`
  automatically).
- `cd app && npm run typecheck` — confirms no `any`/strict-mode violations
  were introduced.
- `grep -n "register(" app/src/widgets/<name>/<name>.ts` — should show
  exactly one `register("<name>", create<Name>)` call at module scope.
- `grep -n "<name>" app/src/widgets/index.ts` — should show the new
  `import "./<name>/<name>.js";` line.
