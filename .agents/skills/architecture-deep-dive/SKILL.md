---
name: architecture-deep-dive
description: Explain the widget-registry library architecture and implementation boundaries. Use when asked how app/src is organized, how registry/widgets interact, where to implement a feature, or why the project uses self-registering pure widget factories.
---

# Architecture Deep Dive

## Instructions

For architecture explanations, implementation-placement questions, or reviews
that depend on module boundaries, read `references/architecture.md` before
answering. Ground answers in the current files under `app/src/`; do not invent
frameworks, APIs, registry behavior, or build steps.

Keep responses project-specific:

- Treat `app/src/core/registry.ts` as the protected shared contract.
- Explain widgets as pure HTML-string factories that self-register at module
  load.
- Point feature work to the smallest owning module: registry contract,
  individual widget folder, `widgets/index.ts` registration import root, or
  `src/index.ts` bundle entry point.
- Say explicitly when lint is not available; this sample app verifies with
  Vitest, TypeScript, and esbuild.

## References

- `references/architecture.md` — detailed module map, data flow, boundaries,
  conventions, and common pitfalls for `app/src`.
