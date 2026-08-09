---
name: architecture-deep-dive
description: Explain how this repo's widget-registry library (app/) is actually built — the registry contract in app/src/core/registry.ts, the module boundaries between core/ and widgets/, the load-order rules that make create() work, and where a new feature belongs. Use when asked to explain the architecture, review a design decision, or decide which layer a change goes in; for the mechanical steps of adding a widget use creating-widget instead.
---

# Architecture deep dive

## When to use this

- "Explain the architecture of this project" / "how does the registry work?"
- "Where should I implement X?" — deciding between `core/`, `widgets/`, and
  the entry points.
- Reviewing a PR that touches module boundaries, load order, or the registry's
  public API.
- **Not** for: the step-by-step of adding one more widget that follows the
  existing pattern — that's the `creating-widget` skill.

## Instructions

1. Read `references/architecture.md` — it holds the verified detail (exact
   signatures, load-order mechanics, boundary rules, pitfalls). Do not answer
   architecture questions from general knowledge of "plugin registries"; this
   one has specific properties (throws on duplicate names, no unregister, no
   lazy loading) that generic answers get wrong.
2. Ground every claim in the current code. The three files that define the
   architecture are `app/src/core/registry.ts`, `app/src/widgets/index.ts`,
   and `app/src/index.ts` — all short; read them rather than guessing.
3. When recommending where a change belongs, state the layer *and* the reason
   in terms of the boundary rules from the reference, e.g. "in `widgets/`,
   because `core/` must not know any widget's name".
4. If asked about something the reference does not cover (bundling details,
   test setup), say so and read the actual file (`app/scripts/build.mjs`,
   `app/package.json`) instead of extrapolating.

## Verify

- Every file path and function name you cite exists:
  `grep -n "export function" app/src/core/registry.ts`.
- Your explanation matches `materials/architecture-brief.md` (the project's
  stated intent) — if code and brief disagree, report the discrepancy rather
  than silently picking one.

## References

- `references/architecture.md` — the full deep dive: registry internals,
  module boundaries, load-order and registration timing, where new code goes,
  common pitfalls. Open it whenever the question is about *why*, not *what*.
