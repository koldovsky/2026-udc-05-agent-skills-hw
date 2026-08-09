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

<!-- Task A adds a "## Skills" section here pointing at .agents/skills/ -->

## Skills

- `.agents/skills/creating-widget/SKILL.md` — use when adding a new widget to
  follow the canonical `src/widgets/<name>/<name>.ts` + colocated test +
  `widgets/index.ts` import pattern.
- `.agents/skills/architecture-deep-dive/SKILL.md` — use when explaining the
  widget-registry architecture or deciding where a feature belongs; detailed
  context lives in its `references/architecture.md`.
- `.agents/skills/analyzing-bundle-size/SKILL.md` — use when checking current
  bundle size or the bundle-size impact of a change; it should run the real
  build and inspect `dist/bundle.js`.
