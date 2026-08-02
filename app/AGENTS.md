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

- **`creating-widget`** (`.agents/skills/creating-widget/SKILL.md`) — golden
  path for adding a new widget: pure factory in
  `app/src/widgets/<name>/<name>.ts` + colocated `<name>.test.ts` + import in
  `app/src/widgets/index.ts`. Load when asked to add/create a widget or
  component.
- **`architecture-deep-dive`** (`.agents/skills/architecture-deep-dive/SKILL.md`)
  — points to `references/architecture.md` for the registry/widget module
  boundary and why it's shaped that way. Load when asked to explain the
  architecture or where a change belongs.
- **`analyzing-bundle-size`** (`.agents/skills/analyzing-bundle-size/SKILL.md`)
  — runs `scripts/measure-bundle-size.mjs` to build and read the real
  `app/dist/bundle.js` size. Load when asked about bundle size/weight or the
  size impact of a change.
