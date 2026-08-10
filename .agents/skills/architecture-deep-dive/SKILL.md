---
name: architecture-deep-dive
description: Use when the user asks to explain the project architecture, understand module boundaries, or decide where to implement a new feature in the widget-registry library. Loads a verified reference with real file paths and function signatures.
---

# Architecture Deep Dive

## When to use this

- "Explain the architecture of this project"
- "How does the widget registry work?"
- "Where should I implement X?"
- "What does registry.ts do?"
- "How are widgets discovered / loaded?"

## Instructions

Open the reference file for the full deep dive. Key facts to front-load:

- The registry lives in `app/src/core/registry.ts` — do **not** modify its public API
- Every widget is a **pure function** in its own folder under `app/src/widgets/<name>/`
- Widgets self-register at module load via `register()` — no central manifest needed
- `app/src/widgets/index.ts` is the sole production/runtime orchestration point that imports widget modules (triggers registration at bundle time). Tests may import their own widget module directly for unit testing.

## References

- `references/architecture.md` — full module breakdown, real function signatures, data flow, pitfalls
