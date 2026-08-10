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

Agent Skills for this library live in `.agents/skills/`. Load the relevant
one before doing the matching task:

- [`creating-widget`](../.agents/skills/creating-widget/SKILL.md) — golden
  path for adding a new widget: `<name>.ts` (pure factory + `register()`),
  colocated `<name>.test.ts`, wiring into `src/widgets/index.ts`. Load when
  asked to add/create a new widget or component.
- `architecture-deep-dive` *(not yet added — Task B)* — will document the
  registry architecture in more depth via a `references/` file. Load when
  asked to explain how the widget registry works internally.
- `analyzing-bundle-size` *(not yet added — Task C)* — will wrap
  `npm run build` with a `scripts/` bundle-size analyzer. Load when asked to
  check or reduce the bundle size.
