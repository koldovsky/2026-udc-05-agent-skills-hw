---
name: architecture-deep-dive
description: Use when asked to explain how the widget-registry library (app/) is architected internally, or to decide where a new feature/change should actually live — e.g. "explain this project's architecture", "how does the registry work", "where should I put X", "what depends on registry.ts". Loads the full deep dive from references/architecture.md rather than guessing.
---

# Architecture deep dive

<!--
Everything below this line only loads into context when the agent actually
invokes the skill — keep the frontmatter description tight (it's ALWAYS in
context for every skill you have installed), and put the real instructional
weight here.
-->

## When to use this

- The user asks to explain the widget-registry architecture (`app/`) —
  module boundaries, data flow, why widgets are structured this way.
- The user asks "where should this live" / "where do I implement X" for a
  new feature or change, and the answer depends on understanding
  `registry.ts` vs `widgets/**` vs `index.ts` boundaries.
- The user asks what depends on `app/src/core/registry.ts` or what its
  public API contract is.

Not for the step-by-step of adding a new widget — that's `creating-widget`.
Not for bundle-size questions — that's `analyzing-bundle-size`.

## Instructions

Do not answer from general knowledge or guess at the structure — this
project's actual architecture lives in
[`references/architecture.md`](references/architecture.md). Load that file
and base the explanation on it, citing the real files/functions it
references (`app/src/core/registry.ts`, `app/src/widgets/**`,
`app/src/index.ts`).

## Verify

- The explanation cites real file paths and function names from
  `references/architecture.md` (`register`, `create`, `listWidgets`), not
  invented ones.
- If asked "where should X go", the answer respects the protected contract:
  `register`/`create`/`listWidgets` signatures in `registry.ts` don't change.

## References

- `references/architecture.md` — the deep dive: module boundaries, data
  flow, and the reasoning behind the registry design. Load it whenever this
  skill triggers.
