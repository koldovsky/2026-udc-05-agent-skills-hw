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

Project skills live in `.agents/skills/` (repo root, one level above this
file). Load the one that matches the task instead of improvising:

| Skill | Use it when | Extras |
|---|---|---|
| [`creating-widget`](../.agents/skills/creating-widget/SKILL.md) | Adding or reviewing a widget in `src/widgets/` — encodes the golden path: pure factory → `register()` → colocated test → wiring import in `src/widgets/index.ts`. | instructions only |
| [`architecture-deep-dive`](../.agents/skills/architecture-deep-dive/SKILL.md) | Explaining how the registry works, or deciding which layer (`core/` vs `widgets/`) a change belongs in. | `references/architecture.md` |
| [`analyzing-bundle-size`](../.agents/skills/analyzing-bundle-size/SKILL.md) | Reporting the size of `dist/bundle.js` or the cost of a change — runs the real build, never estimates. | `scripts/bundle-size.mjs` |

`.agents/skills/` is the portable source of truth. `creating-widget` is also
mirrored, unmodified, to `.claude/skills/creating-widget/` — tools that only
auto-discover their own path do not see `.agents/skills/` otherwise
(measured in [`docs/ab-validation.md`](../docs/ab-validation.md)). If you edit
one copy, edit both.

