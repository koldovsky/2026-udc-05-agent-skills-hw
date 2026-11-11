---
name: architecture-deep-dive
description: Explains the architecture of this repo's app/ widget-registry library — how the registry, widget self-registration, and the esbuild build fit together, and where a feature or change should be implemented before a non-trivial change. Not for routine "add a widget" scaffolding (use creating-widget) or bundle-size measurement.
---

# Architecture deep dive

## When to use this

- The user asks how `app/` works: the registry, how widgets get registered,
  or how the entry point and build connect.
- The user asks where a feature or change belongs before a non-trivial change,
  such as changing registry behaviour, the public exports, or the build.
- The user is debugging a registry error or a widget that cannot be created.

Skip it for adding a widget by the standard pattern (creating-widget covers
that) and for measuring or reducing bundle size.

## Instructions

1. Open `references/architecture.md` before answering. Do not answer from
   memory or from general knowledge of plugin registries.
2. Answer with the real file paths, function names, signatures, and error
   message texts from the reference.
3. For "where should this go" questions, use its change table, name the files
   to touch, and state the risk.
4. If the code may have changed since the reference was written, re-read the
   cited files under `app/src/` and `app/scripts/` and trust the code.
5. Never propose changing the signatures of `register`, `create`, `listWidgets`.

## References

- `references/architecture.md`: module map, registry internals and errors,
  import chain, build/TS setup, a "where to implement a change" table, pitfalls.
