---
name: architecture-deep-dive
description: >-
  Explains the widget-registry architecture (registry.ts contract, module
  boundaries, why widgets self-register). Use when the user asks to explain
  the architecture, how the library is structured, or where to implement a
  new feature in app/src/.
---

## When to use this

- User asks to explain / describe the architecture of this project or `app/`.
- User asks where a new feature should live (core vs widgets vs entry point).
- User asks how `register` / `create` / `listWidgets` relate, or why widgets are folder-per-name.

Do **not** use this for implementing a new widget end-to-end (use `creating-widget`) or measuring bundle size (use `analyzing-bundle-size`).

## Instructions

1. Keep answers grounded in this repo — cite real paths under `app/src/`.
2. **Read** [references/architecture.md](references/architecture.md) before answering; that file has the verified depth (API, boundaries, data flow, pitfalls).
3. Summarize from the reference; do not invent APIs beyond `app/src/core/registry.ts` and `app/src/widgets/**`.
4. If the user then wants to *add* a widget, hand off to the `creating-widget` skill.

## Verify

- Answer mentions real exports: `WidgetProps`, `WidgetFactory`, `register`, `create`, `listWidgets`.
- Answer distinguishes `core/registry.ts` (no concrete widgets) from `widgets/<name>/` (self-registering factories).
- Claims match [references/architecture.md](references/architecture.md) and the current source.

## References

- [references/architecture.md](references/architecture.md) — registry API, module boundaries, why widgets are structured this way, data flow, pitfalls. Open whenever this skill is used.
