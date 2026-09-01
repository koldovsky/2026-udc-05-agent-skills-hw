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

Project-specific Agent Skills live in `.agents/skills/` (repo root). Load the
matching `SKILL.md` before working on the tasks below.

| Skill | Path | Use it when |
|---|---|---|
| `creating-widget` | `.agents/skills/creating-widget/SKILL.md` | Adding, renaming, or removing a widget — encodes the golden path: `src/widgets/<name>/<name>.ts` (pure factory + `register()`), colocated `<name>.test.ts`, `import "./<name>/<name>.js";` in `src/widgets/index.ts`. |
| `architecture-deep-dive` | `.agents/skills/architecture-deep-dive/SKILL.md` (+ `references/architecture.md`) | Explaining how the registry/widget layers fit together, or deciding where a new feature belongs. Depth lives in the reference file, loaded only on demand. |
| `analyzing-bundle-size` | `.agents/skills/analyzing-bundle-size/SKILL.md` (+ `scripts/`) | Reporting the current bundle weight or the bundle-size impact of a change — the script runs `npm run build` and reads the real byte size of `dist/bundle.js` instead of guessing. |

