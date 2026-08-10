# AGENTS.md

## Stack

TypeScript 5, Node 22, Vitest, esbuild — plain library, no framework.

## Commands

- Install: `npm install`
- Test: `npm test`
- Typecheck: `npm run typecheck`
- Build (bundle): `npm run build` → `dist/bundle.js`
- Lint: not configured

## Architecture

A tiny widget registry (`src/core/registry.ts`): `register(name, factory)` /
`create(name, props)`. Each widget is a **pure function** returning an HTML
string, colocated under `src/widgets/<name>/` with its own `*.test.ts`, and
self-registers via a top-level `register(...)` call in its module. The bundle
entry point is `src/index.ts`.

## Conventions

- Named exports only (no default exports).
- No `any`, no `@ts-ignore`.
- One widget = one folder: `src/widgets/<name>/<name>.ts` + `<name>.test.ts`.
- Widget factories are pure — no DOM access, no side effects beyond
  `register()` at module load.

## Guardrails

- Do not add a UI framework (React/Vue/etc.) — this library stays framework-free.
- Do not add new npm dependencies without a documented reason.
- `src/core/registry.ts` is the shared contract every widget depends on —
  changes there affect all widgets; keep its public API (`register`, `create`,
  `listWidgets`) stable.

## Skills

This project uses agent skills to encode specialized knowledge for adding widgets and understanding the architecture:

- **[creating-widget](../.agents/skills/creating-widget/SKILL.md)** — Teaches the golden path for creating a new widget. Use when building a widget to follow the established patterns: pure factory function, TypeScript strict, colocated tests, and self-registration.

- **[architecture-deep-dive](../.agents/skills/architecture-deep-dive/SKILL.md)** — Deep architectural reference for the widget-registry. Use for understanding registry mechanics, type system design, bundle structure, and design constraints. Includes detailed [references/architecture.md](../.agents/skills/architecture-deep-dive/references/architecture.md).

- **[analyzing-bundle-size](../.agents/skills/analyzing-bundle-size/SKILL.md)** — Bundle analysis and optimization techniques. Use when measuring the impact of widgets on bundle size. Includes [scripts/analyze-bundle.mjs](../.agents/skills/analyzing-bundle-size/scripts/analyze-bundle.mjs) for parsing bundle composition.
