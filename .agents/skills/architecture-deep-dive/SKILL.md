---
name: architecture-deep-dive
description: >-
  Explains the app/ widget-registry architecture (registry contract, widget
  module boundaries, entry points) using the project reference doc. Use when
  the user asks to explain the architecture, where to put a new feature, how
  the registry works, or how widgets relate to core/.
---

# Architecture deep-dive

## When to use this

- User asks to explain this project's architecture or module layout
- User asks where to implement a new feature (core vs widgets vs index)
- User asks how `register` / `create` / `listWidgets` fit together
- Do **not** use for scaffolding a new widget end-to-end — that is
  `creating-widget`

## Instructions

1. Read [`references/architecture.md`](references/architecture.md) before
   answering — it is the source of depth for this skill.
2. Base every claim on that reference and the real files it cites
   (`app/src/core/registry.ts`, `app/src/widgets/**`, `app/src/index.ts`).
   Do not invent APIs.
3. Keep the answer specific to this library (widget registry + pure HTML
   factories), not a generic "clean architecture" essay.

## References

- [`references/architecture.md`](references/architecture.md) — registry API,
  module boundaries, why widgets are laid out this way; open whenever this
  skill is invoked.

## Verify

- Answer matches facts in `references/architecture.md` (real paths and
  signatures)
- No invented registry methods beyond `register` / `create` / `listWidgets`
