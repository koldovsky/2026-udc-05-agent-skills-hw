---
name: architecture-deep-dive
description: How the app/ widget-registry library is structured and why — the registry contract (register/create/listWidgets), module boundaries, and where a given change belongs. Use when asked to explain the architecture, onboard onto the codebase, decide where to implement a new feature, or judge whether a change belongs in core/ or widgets/.
---

# Architecture deep dive

`app/` is a framework-free **widget-registry library**. One module owns the
contract (`app/src/core/registry.ts`); everything else is a leaf that depends
on it. That single dependency direction is the whole design, and it's what
makes "where does this change go?" answerable.

## When to use this

- "Explain this project's architecture" / onboarding questions.
- "Where should I implement X?" — deciding between `core/` and `widgets/`.
- Reviewing a change that touches `core/registry.ts` or the module graph.
- Before changing anything in `core/` — its public API is protected.

For the mechanical steps of adding a widget, use the `creating-widget` skill
instead; this skill explains the *why* behind that pattern.

## Instructions

1. **Read `references/architecture.md`** — the full breakdown lives there
   (registry internals, the four layers, dependency rules, why widgets are
   pure, extension scenarios, pitfalls). Do not answer architecture questions
   from general knowledge; this codebase is small and specific.
2. Ground every claim in the real files — `app/src/core/registry.ts`,
   `app/src/widgets/**`, `app/src/index.ts`. Quote actual signatures rather
   than paraphrasing them.
3. When placing a new feature, apply the rule from the reference: does it
   change the contract *every* widget depends on (→ `core/`, expensive, needs
   justification), or is it one more leaf (→ `widgets/<name>/`, cheap)?

## Verify

- Any signature you cite matches `app/src/core/registry.ts` verbatim —
  `register(name, factory): void`, `create(name, props?): string`,
  `listWidgets(): string[]`.
- `cd app && npm test` and `npm run typecheck` stay green after any change
  made on this skill's advice.
- If the advice was to touch `core/`, double-check the public API of
  `register` / `create` / `listWidgets` is unchanged — it is a protected
  contract per `app/AGENTS.md`.

## References

- `references/architecture.md` — the deep dive: registry internals, layer
  boundaries, dependency rules, extension scenarios, and known pitfalls.
  Open it for any non-trivial architecture question.
