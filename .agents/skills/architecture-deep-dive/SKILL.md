---
name: architecture-deep-dive
description: Explain the architecture and implementation boundaries of this widget-registry project. Use when the user asks where to implement features, how registration works, or how modules interact.
---

# Architecture Deep Dive

## When to use this

- User asks to explain project architecture.
- User asks where a new feature should be implemented.
- User asks how widgets are discovered and created by name.

## Instructions

1. Start from real files only:
   - `app/src/core/registry.ts`
   - `app/src/widgets/index.ts`
   - `app/src/widgets/**`
   - `app/src/index.ts`
2. Explain responsibilities by module boundary:
   - Registry contract and lookup behavior in `registry.ts`.
   - Self-registration pattern in each widget module.
   - Why `widgets/index.ts` imports widget modules for side-effect registration.
3. For feature placement guidance, map request to the golden path:
   - New widget logic in `app/src/widgets/<name>/<name>.ts`
   - Tests in `app/src/widgets/<name>/<name>.test.ts`
   - Import wiring in `app/src/widgets/index.ts`
4. Do not invent APIs or signatures that are not present in code.

## Verify

- Confirm claims match function signatures in `app/src/core/registry.ts`.
- Confirm every referenced widget pattern exists in `app/src/widgets/badge/`.

## References

- `references/architecture.md` - Detailed architecture narrative, data flow, and common pitfalls.

