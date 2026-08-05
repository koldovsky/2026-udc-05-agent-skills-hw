---
name: creating-widget
description: When the user asks to add a new widget to the library.
---

# Creating Widget

Add a new widget to the library following the golden path.

## When to use this

When the user asks to add a new widget to the library. For example, "add a new widget called `spinner`".

## Instructions

1. Create `app/src/widgets/<name>/<name>.ts` — a pure function
   `create<Name>(props): string` returning an HTML string, calling
   `register("<name>", create<Name>)` at module load.
2. Create the colocated `app/src/widgets/<name>/<name>.test.ts`.
3. Add `import "./<name>/<name>.js";` to `app/src/widgets/index.ts`.

### Do not modify the existing code

Do not modify the existing code (`app/src/core/registry.ts`, `app/src/widgets/**`, `app/src/widgets/index.ts`, `app/src/index.ts`). Only create the new widget.

## Verify

- Widget factories are **pure**: no DOM access, no side effects beyond the
  module-load-time `register()` call.
- Files: kebab-case; types/interfaces PascalCase.
- Tests are colocated `*.test.ts` using vitest; `cd app && npm test`.
- grep for 'register(' in the new file `app/src/widgets/<name>/<name>.ts` to verify the skill was followed correctly.

