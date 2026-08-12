---
name: Create widget
description: Run this skill only if it was explicitly requested by text equivalent to "create a widget" or "create new widget"
---

# Skill Create widget

<!--
Everything below this line only loads into context when the agent actually
invokes the skill — keep the frontmatter description tight (it's ALWAYS in
context for every skill you have installed), and put the real instructional
weight here.
-->
Run this skill only if it was explicitly requested by text equivalent to "create a widget" or "create new widget"

## When to use this

<!-- Concrete trigger scenarios. "When the user asks to X" beats "when relevant". -->
When the user asks to create a new widget

## Instructions

Follow the **golden path** in `/materials/architecture-brief.md` (lines 31–36). Use `app/src/widgets/badge/` as the canonical example for all three steps: factory file, test file, and wiring into `app/src/widgets/index.ts`.

## Verify

1. **Factory file exists** at `app/src/widgets/<name>/<name>.ts` with:
   - Pure function `create<Name>()` defined
   - `register("<name>", create<Name>)` call present

   ```bash
   grep -l "register(" app/src/widgets/<name>/<name>.ts
   ```

2. **Props interface exists** (check the factory file has a props type extending `WidgetProps`):

   ```bash
   grep "extends WidgetProps" app/src/widgets/<name>/<name>.ts
   ```

3. **Test file exists** at `app/src/widgets/<name>/<name>.test.ts`:

   ```bash
   test -f app/src/widgets/<name>/<name>.test.ts && echo "Test file exists"
   ```

4. **Widget is wired into bundle** — import exists in `app/src/widgets/index.ts`:

   ```bash
   grep "import.*<name>/<name>.js" app/src/widgets/index.ts
   ```

5. **Tests pass and bundle builds**:

   ```bash
   cd app && npm test && npm run build
   ```
<!--
Optional, only if this skill has them (see the other two task templates):
## References
- references/<file>.md — <what it covers, when to open it>

## Scripts
- scripts/<file> — <what it does, how to invoke it>
-->
