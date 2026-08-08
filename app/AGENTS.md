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

Project skills live in `.agents/skills/<name>/SKILL.md` (repo root). Load one
when its trigger matches:

- `creating-widget` — the golden path for adding a **new** widget to
  `src/widgets/`: folder layout, pure factory + `register()`, colocated vitest
  test, `src/widgets/index.ts` wiring. Load when asked to add or create a
  widget/component. (`src/widgets/spinner/` was produced by this skill —
  see `docs/task-a-verification.md`.)

Not written yet — do **not** try to load these; they have no directory under
`.agents/skills/` until the task that creates them lands:

- `architecture-deep-dive` (Task B) — how the registry and widget modules fit
  together, with the depth in `references/architecture.md`.
- `analyzing-bundle-size` (Task C) — runs `npm run build` and reads the real
  byte size of `dist/bundle.js` via its `scripts/`.
