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

Reusable agent skills for this repo live in `.agents/skills/` at the repo
root (one level above this file). Read the matching `SKILL.md` before doing
the corresponding kind of work:

- `creating-widget` (`.agents/skills/creating-widget/SKILL.md`) — the golden
  path for adding a **new widget**: folder layout, pure factory + `register()`
  call, colocated vitest test, a registry-level case in
  `src/widgets/registration.test.ts` (the only test that catches a forgotten
  `widgets/index.ts` import), and wiring into `src/widgets/index.ts`. Load it
  whenever asked to add a new widget/component.
- `architecture-deep-dive` (`.agents/skills/architecture-deep-dive/SKILL.md`)
  — explains the registry architecture, module boundaries, and where new
  features belong; the depth lives in its `references/architecture.md`. Load
  it when asked to explain the architecture or decide where to implement
  something.
- `analyzing-bundle-size` (`.agents/skills/analyzing-bundle-size/SKILL.md`) —
  measures the real bundle size via `scripts/measure-bundle.mjs` (runs
  `npm run build` and reads `dist/bundle.js`). Load it when asked about
  bundle size or the size impact of a change — never guess the number.
