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

Agent Skills live in `.agents/skills/` at the repo root:

- `.agents/skills/creating-widget/`: the golden path for adding a new widget (factory module with `register()`, colocated vitest test, and an import in `src/widgets/index.ts`).
- `.agents/skills/architecture-deep-dive/`: explains how the registry, widget self-registration, and the esbuild build fit together, and where a change should go (depth in `references/architecture.md`).
- `.agents/skills/analyzing-bundle-size/`: measures the real size of `dist/bundle.js` by running `npm run build` via `scripts/measure-bundle.mjs` — never estimate; measure before and after a change to compare.
