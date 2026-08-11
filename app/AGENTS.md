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

Project skills live in **`.agents/skills/`** at the repo root — the cross-tool
`SKILL.md` convention. `.claude/skills` is a symlink to that folder for Claude
Code, which only scans `.claude/skills/`; `.agents/skills/` is the single source
of truth, so edit there and never through the mirror.

- **`creating-widget`** — the golden path for adding a widget:
  `src/widgets/<name>/<name>.ts` (pure factory + `register()`), the colocated
  `<name>.test.ts`, and the side-effect import in `src/widgets/index.ts`.
  Loads when asked to add, create, or scaffold a widget or component.
- **`architecture-deep-dive`** — the registry contract, the one-way module
  boundaries, and where each kind of change belongs; the depth lives in
  `references/architecture.md` (progressive disclosure). Loads when asked how
  the project is structured, why it works this way, or where a feature belongs.
- **`analyzing-bundle-size`** — runs `npm run build` and reports the real
  `dist/bundle.js` size (raw + gzip) via `scripts/measure-bundle.mjs` rather than
  guessing a number. Loads when asked about bundle weight or a change's size
  impact.

Those three are written for this project. One further skill in the same folder is
**vendored, not authored here**: `doc-coauthoring`, installed unmodified from
[anthropics/skills](https://github.com/anthropics/skills) for Task E. Its
provenance and licence gap are recorded in
`.agents/skills/doc-coauthoring/PROVENANCE.md`; do not treat it as a project
convention.
