---
name: architecture-deep-dive
description: Use whenever the user asks to explain, understand, or navigate this project's architecture — e.g. "explain the architecture of this project", "how does the widget registry work", "where should I implement X", or "what's the module boundary between the registry and widgets". Also reach for it before any change that isn't a plain new-widget addition (creating-widget already covers that golden path), since getting the registry/widget boundary wrong breaks every widget silently. Load references/architecture.md for the actual depth — don't answer from general knowledge.
---

# Architecture Deep Dive

This project is a small widget-registry library, but its rules (pure
factories, self-registration, a stable registry contract) are easy to violate
without noticing until a test or the bundle fails. This skill points to the
one place those rules are written down and verified against the real code.

## When to use this

- The user asks to explain or understand the project's architecture.
- The user asks where a new feature or fix belongs (which module owns it).
- The user is about to touch `app/src/core/registry.ts` or the boundary
  between it and `app/src/widgets/**` — read the reference first, since that
  file is a shared contract every widget depends on.
- Not for the widget-creation golden path itself — see the `creating-widget`
  skill for that.

## Instructions

Read `references/architecture.md` and answer from it — it documents the
actual `register`/`create`/`listWidgets` contract, the module boundaries, and
the "why" behind the widget folder structure, all checked against the current
`app/src/core/registry.ts` and `app/src/widgets/**`. Don't improvise a
generic architecture explanation; the value of this skill is that the answer
matches the real code, not a plausible-sounding one.

## Verify

- The explanation should cite real file paths and real function signatures
  from `app/src/core/registry.ts` / `app/src/widgets/**`, not invented ones.
- `grep -n "export function" app/src/core/registry.ts` — cross-check any
  claimed API surface against this.

## References

- `references/architecture.md` — the full deep dive: registry contract,
  module boundaries, widget folder convention, why it's shaped this way.
