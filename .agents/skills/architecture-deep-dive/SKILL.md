---
name: architecture-deep-dive
description: Use this when the user asks to explain the widget-registry library's architecture, how the registry and widgets relate, or where exactly a change or new feature should be implemented.
---

# Architecture Deep Dive

## When to use this

- the user asks to explain the architecture ("поясни архітектуру цього проєкту", "how does this project work");
- the user asks where a change/new feature should live ("де мені реалізувати X", "which file do I touch for Y");
- the user asks about the registry contract or why widgets are structured the way they are.

Not for adding a new widget (use `creating-widget`) and not for bundle-size questions (use `analyzing-bundle-size`).

## Instructions

Read `references/architecture.md` for the full deep dive — module boundaries,
the `registry.ts` contract, and the widget folder pattern — before answering.
It is kept out of this file on purpose so it only loads into context when
actually needed.

## References
- references/architecture.md — the architecture deep dive: `registry.ts` contract, widget folder pattern, module boundaries.
