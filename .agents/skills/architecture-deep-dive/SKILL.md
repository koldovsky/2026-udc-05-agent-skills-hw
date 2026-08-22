---
name: architecture-deep-dive
description: Explains the architecture of the widget-registry library in app/ — the registry contract, module boundaries, widget conventions, and where new code belongs. Use when asked to explain how this project works, why it is structured this way, or where to implement a new feature. For the concrete steps of adding a widget, use the creating-widget skill instead.
---

# Architecture deep dive

## When to use this

- "Explain the architecture of this project" / "how does this library work?"
- "Where should I implement X?" — deciding which module a change belongs in.
- Reviewing a change for architectural fit (module boundaries, purity rules).

## Instructions

1. Open `references/architecture.md` (in this skill's folder) — it contains
   the verified deep dive: the registry contract, per-module responsibilities,
   the data flow from `register()` to `create()`, and the reasoning behind the
   conventions. Base your explanation on it, not on generic knowledge.
2. Cross-check anything load-bearing against the actual code —
   `app/src/core/registry.ts` and `app/src/widgets/**` — and quote real
   signatures, not invented ones.
3. Key constraints to always state when relevant:
   - `register`/`create`/`listWidgets` in `core/registry.ts` are a **stable
     public contract** — do not change their signatures.
   - Widgets are pure functions returning HTML strings; the only permitted
     side effect is the module-load-time `register()` call.
   - The library is framework-free; do not suggest adding React/Vue/etc.

## Verify

- Every file path and function signature you mention exists in `app/src/`
  (check with Read/grep before asserting).
- Your explanation covers: the registry (`core/registry.ts`), widget modules
  (`widgets/<name>/`), the aggregation point (`widgets/index.ts`), and the
  bundle entry (`src/index.ts`).

## References

- `references/architecture.md` — the full deep dive: module map, data flow,
  design rationale, and common pitfalls. Open it whenever this skill is used.