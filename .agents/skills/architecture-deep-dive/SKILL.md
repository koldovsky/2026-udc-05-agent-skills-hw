---
name: architecture-deep-dive
description: Explains the architecture of the framework-free widget-registry library in app/ — the registry contract in src/core/registry.ts, the widget module layer, the barrel/entry-point chain, and where a new feature belongs. Use when asked "how does this project work", "explain the architecture", "where should I put X", or when reviewing a change that crosses the core/widgets boundary. Not for step-by-step widget scaffolding (use creating-widget).
---

# Architecture deep dive

## When to use this

- "Explain the architecture of this project", "how does the widget registry
  work", "поясни архітектуру".
- "Where should I implement `<feature>`?" — deciding between `src/core/`,
  `src/widgets/<name>/`, and the barrel files.
- Reviewing or reasoning about a change that touches the `core` ↔ `widgets`
  boundary, the registration lifecycle, or the bundle entry chain.
- Onboarding: understanding why widgets are pure string factories rather than
  components.

Do **not** load this just to add a routine widget — `creating-widget` has the
concrete recipe. Use this skill when the *reasoning* matters, not the steps.

## Instructions

1. **Read `references/architecture.md`** before answering. It is the verified
   deep dive (module boundaries, the registration lifecycle, data flow,
   design rationale, pitfalls) and is kept in sync with the real code.
2. Ground every claim in the actual source. The whole library is ~70 lines:
   `app/src/core/registry.ts`, `app/src/widgets/index.ts`,
   `app/src/index.ts`, `app/src/widgets/badge/badge.ts`. Open them and quote
   real signatures — never describe an API that isn't there.
3. Answer with the **layer model** (entry point → widgets barrel → widget
   modules → core registry) and, for placement questions, name the exact file
   path the change belongs in plus what else must be updated in the same
   change (e.g. a new widget also needs the barrel import).
4. Respect the invariants when recommending anything:
   - `register` / `create` / `listWidgets` are the stable public contract —
     do not propose signature changes.
   - No UI framework, no new npm dependencies without a documented reason.
   - Widget factories stay pure; the only module side effect is `register()`.
5. If a question exceeds what's in the code and the reference (e.g. SSR,
   hydration, styling strategy), say the project doesn't address it rather
   than inventing architecture.

## Verify

- Every file path and function signature you cite exists:
  `grep -n "export function" app/src/core/registry.ts`
  → `register`, `create`, `listWidgets` only.
- The layer chain still holds:
  `cat app/src/index.ts app/src/widgets/index.ts` — entry re-exports from the
  widgets barrel, which imports each widget module and re-exports
  `create`/`listWidgets` from core.
- No widget imports another widget:
  `grep -rn "widgets/" app/src/widgets/*/` returns nothing.
- Nothing was broken by an accompanying change: `cd app && npm test` and
  `npm run typecheck`.

## References

- `references/architecture.md` — module boundaries, the registration
  lifecycle, data flow, design rationale, and pitfalls. Open it whenever the
  question is about *how* or *why* the project is structured this way, or
  where a new feature belongs.

