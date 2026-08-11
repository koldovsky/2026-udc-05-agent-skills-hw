---
name: analyzing-bundle-size
description: Use this skill when asked to report the current bundle size or evaluate how a change affects the bundle size.
---

# Analyzing Bundle Size

## When to use this

Use this skill when the task asks for:

* the current bundle size;
* the size of `app/dist/bundle.js`;
* the impact of a code change on bundle size;
* a before/after bundle-size comparison.

Do not estimate or invent bundle-size numbers.

Always run:

```bash
node .agents/skills/analyzing-bundle-size/scripts/measure-bundle.mjs
```

and use the script output as the source of truth.
