---
name: creating-widget
description: Use when asked to add a new widget/component to the app/ widget-registry library (e.g. "add a spinner widget", "create an alert widget"). Encodes the golden path — file layout, the pure-factory + register() pattern, colocated test, and the widgets/index.ts wiring — from materials/architecture-brief.md.
---

# Creating a widget

## When to use this

- Asked to add a new widget/component, e.g. "add a `spinner` widget".
- Asked how widgets are structured, or to follow the existing pattern for something new.

## Instructions

Copy the pattern of `app/src/widgets/badge/` exactly. For a new widget `<name>` (kebab-case):

**1. `app/src/widgets/<name>/<name>.ts`** — a pure factory that registers itself:

**2. `app/src/widgets/<name>/<name>.test.ts`** — vitest, colocated. Test the
defaults and at least one explicit-option case, like `badge.test.ts`.

**3. Wire it in** — add `import "./<name>/<name>.js";` to
`app/src/widgets/index.ts`, next to the `badge` import. Without this the
widget never registers.

**Don't:** change the signatures of `register`/`create`/`listWidgets` in
`app/src/core/registry.ts` (protected shared contract), use `any`/`@ts-ignore`,
or add a default export.

## Verify

- `cd app && npm test` and `npm run typecheck` — both clean.
- `grep register( app/src/widgets/<name>/<name>.ts` — widget self-registers.
- `grep <name> app/src/widgets/index.ts` — widget is imported.
