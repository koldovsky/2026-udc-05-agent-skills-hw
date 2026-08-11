---
name: creating-widget
description: Use this when the user asks to add a new widget or component to the widget-registry library, following the project’s golden path for a new widget under app/src/widgets/<name>/.
---

# Creating a Widget

Use this skill when the request is to add a new widget to the library so it can be created through the shared registry API.

## When to use this

Use this skill when the user asks to:
- add a new widget/component to the library;
- create a new factory that should register under a name and be usable via create("name", props);
- implement a widget in the same pattern as the existing badge example.

Do not use this skill when the task is about changing the registry API itself, changing the build system, or refactoring unrelated files.

## Instructions

Follow the golden path from materials/architecture-brief.md exactly.

1. Read the architecture brief and the existing example in app/src/widgets/badge/ before writing anything.
2. Create a new widget folder at app/src/widgets/<name>/.
3. Implement app/src/widgets/<name>/<name>.ts as a pure factory module:
   - import register and WidgetProps from ../../core/registry.js;
   - export a props interface named with PascalCase, for example CreateNameProps;
   - export a pure function named create<Name>(props: CreateNameProps): string that returns an HTML string;
   - register the widget at module load with register("<name>", create<Name>);
   - keep the implementation side-effect free except for the registration call.
4. Create the colocated test file app/src/widgets/<name>/<name>.test.ts using vitest.
   - Import the factory from ./<name>.js.
   - Add at least one test for the default behavior and one for a non-default case.
5. Update app/src/widgets/index.ts to import the new module so its register() call runs:
   - add import "./<name>/<name>.js";
6. Preserve the project conventions from the brief:
   - strict TypeScript;
   - named exports only;
   - kebab-case file names;
   - no DOM access and no extra side effects beyond registration.

Use the badge widget as the canonical pattern for structure and naming.

## Verify

Confirm the widget was added correctly before finishing:
- run cd app && npm test
- check that the new module contains a registration call with grep register app/src/widgets/<name>/<name>.ts
- check that app/src/widgets/index.ts imports the new module with grep "import \"./<name>/<name>.js\";" app/src/widgets/index.ts
- if needed, run cd app && npm run typecheck
