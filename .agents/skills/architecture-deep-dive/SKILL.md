---
name: architecture-deep-dive
description: Explains the architecture of the app/ widget-registry library — the registry contract, module boundaries, and where new code belongs. Use when asked how this project is structured, why it works the way it does, or where to implement a new feature.
---

# Architecture deep dive

## When to use this

- "Explain the architecture of this project", "how does this work", onboarding.
- "Where should I put X?", "which file owns this behaviour?"
- "Why is it done this way?" — the design, not the mechanics.
- Reviewing whether a change respects the module boundaries.

## Instructions

**Read** `references/architecture.md` before answering, and answer from it with
`file:line` citations.** Never answer from general knowledge — a vague "there's a
registry and widgets self-register" is the failure mode this skill exists to
prevent. If the code contradicts a citation, trust the code and say the reference
has drifted.

## References

- `references/architecture.md` — exact signatures of `register` / `create` /
  `listWidgets`, how a `create()` call resolves, the one-way dependency graph,
  the decoupling-vs-type-safety trade-off, six verified sharp edges, and a table
  of where each kind of change belongs.

## Verify

Claims cite paths that `Read`/`grep` confirm, and name no API beyond `register`,
`create`, `listWidgets`, `WidgetProps`, `WidgetFactory`.
