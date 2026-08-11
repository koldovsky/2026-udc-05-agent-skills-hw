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

Reusable, tool-agnostic instructions live in `.agents/skills/<name>/SKILL.md` at
the repo root. Load one when its trigger matches — the description in each
skill's frontmatter says when.

- **`creating-widget`** — the golden path for adding a new widget: the
  `src/widgets/<name>/` folder, the pure `create<Name>` factory and its
  `register()` call, the colocated `<name>.test.ts`, and the
  `src/widgets/index.ts` side-effect import. Reach for it on any "add a
  widget/component" request.
- **`architecture-deep-dive`** — explains the registry contract and the module
  boundaries between `core/`, `widgets/`, and the entry point, with the depth in
  `references/architecture.md`. Reach for it on "how does this work" or "where
  should this feature live" questions.
- **`analyzing-bundle-size`** — runs the real `npm run build` and reports the
  actual `dist/bundle.js` byte size instead of estimating it, via
  `scripts/measure-bundle.mjs`. Reach for it when asked about bundle weight or a
  change's size impact — never answer those from an estimate.

Also installed, but **not** part of this library's golden path:

- **`webapp-testing`** — third-party skill vendored verbatim from
  [anthropics/skills](https://github.com/anthropics/skills) for Task E. Drives a
  headless browser via Playwright. This library renders nothing on its own, so
  it only applies through the Task E harness (`docs/task-e/`), which serves the
  built bundle and screenshots it. Not needed for ordinary widget work — `npm
  test` remains the check that matters. See `docs/task-e-bonus.md`.
