---
name: creating-widget
description: Add a new widget to this repo's widget-registry library (app/) following its golden path — one folder per widget under app/src/widgets/, a pure factory returning an HTML string, a module-load register() call, a colocated vitest file, and a wiring import in app/src/widgets/index.ts. Use when asked to add, create, or scaffold a widget/component (badge, alert, spinner, …) in app/; not for changes to app/src/core/registry.ts itself.
---

# Creating a widget

## When to use this

- "Add an `alert` widget", "create a spinner component", "we need a tooltip widget".
- Porting an existing widget pattern, or reviewing whether a widget someone
  else added follows the project's structure.
- **Not** for: changing `register`/`create`/`listWidgets` in
  `app/src/core/registry.ts` (protected public API), or adding a UI framework
  (this library is deliberately framework-free).

## Instructions

Work inside `app/`. Use `app/src/widgets/badge/` as the canonical example —
every new widget mirrors it exactly. Substitute `<name>` (kebab-case) and
`<Name>` (PascalCase) below.

1. **Create the widget module** — `app/src/widgets/<name>/<name>.ts`:

   ```ts
   import { register, type WidgetProps } from "../../core/registry.js";

   export interface <Name>Props extends WidgetProps {
     // required props first, optional ones with `?`
     label: string;
     tone?: "info" | "warn" | "error";
   }

   export function create<Name>(props: <Name>Props): string {
     const tone = props.tone ?? "info";
     return `<span class="<name> <name>--${tone}">${props.label}</span>`;
   }

   register("<name>", create<Name>);
   ```

   Rules that are not negotiable here:
   - The factory is **pure**: props in, HTML string out. No DOM access, no
     fetch, no state. The only side effect in the module is the `register()`
     call at module load.
   - `register("<name>", create<Name>)` sits at the **bottom, top-level** of
     the module. The registry throws on a duplicate name — pick a name that
     `listWidgets()` does not already return.
   - **Named exports only** — no `export default`.
   - Imports of local TS files carry a `.js` extension (`"../../core/registry.js"`)
     — this is an ESM `"type": "module"` package.
   - TypeScript strict: no `any`, no `@ts-ignore`. Props interfaces extend
     `WidgetProps`.
   - Optional props get their default via `??` inside the factory, mirroring
     `badge`'s `tone` handling.

2. **Create the colocated test** — `app/src/widgets/<name>/<name>.test.ts`,
   mirroring `badge.test.ts`: one case for the default of each optional prop,
   one for an explicit value. Import the factory directly
   (`import { create<Name> } from "./<name>.js";`) and assert on the exact
   HTML string.

3. **Wire it up** — add `import "./<name>/<name>.js";` to
   `app/src/widgets/index.ts`, keeping the import list alphabetical. Without
   this line the module never loads, `register()` never runs, and
   `create("<name>", …)` throws `Unknown widget`.

4. **Do not touch** `app/src/core/registry.ts`, and do not add npm
   dependencies — a widget needs none.

## Verify

```bash
cd app
npm test          # vitest — the new colocated test must be green
npm run typecheck # tsc --noEmit — catches missing .js extensions and `any`
```

Then check the three things that silently go wrong most often:

```bash
grep -n 'register("' app/src/widgets/<name>/<name>.ts   # exactly one, matching the folder name
grep -n '<name>' app/src/widgets/index.ts               # the wiring import exists
grep -rn 'export default' app/src/widgets/<name>/       # must return nothing
```

A quick runtime sanity check that the widget is actually reachable by string ID:

```bash
cd app && npx vitest run src/widgets/<name>
```

Note: there is no linter configured in this project — say so rather than
inventing a `npm run lint`.

## References

- `materials/architecture-brief.md` — the project's source of truth for this
  golden path.
- `.agents/skills/architecture-deep-dive/references/architecture.md` — open
  when you need *why* the registry is shaped this way, not just *how* to add
  a widget.
