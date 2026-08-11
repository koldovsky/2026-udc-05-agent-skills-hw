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

<!-- The actual step-by-step expertise. Be concrete: real file paths, real
     function names, real constraints from materials/architecture-brief.md.
     Avoid vague advice a generic model would already produce unprompted —
     a skill should encode something PROJECT-SPECIFIC. -->
Use goldenpath steps for widget creation using name provided by user from /materials/architecture-brief.md

## Verify

<!-- How the agent (or you) confirms the skill was followed correctly, e.g.
     "cd app && npm test", "grep for register( in the new file". -->

Verify that new folder was created in widget folder and new *.ts file exist using grep command on file system 
Also run cd app && npm test to verify that app works
<!--
Optional, only if this skill has them (see the other two task templates):
## References
- references/<file>.md — <what it covers, when to open it>

## Scripts
- scripts/<file> — <what it does, how to invoke it>
-->
