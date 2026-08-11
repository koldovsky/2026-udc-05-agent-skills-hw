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
- Widget factories interpolate props into HTML **unescaped** — the contract is
  that `create()` receives trusted, already-escaped text. Keep new widgets
  consistent with that; if the library ever needs to accept untrusted input,
  escaping is a `core/registry.ts` concern applied to every widget, not a
  per-widget patch. See the `architecture-deep-dive` skill.

## Skills

Project skills live in `.agents/skills/<name>/SKILL.md` (repo root, one level
above this file). Load the relevant one before working in the matching area
rather than inferring the pattern from the code.

| Skill | Use it when |
|---|---|
| `creating-widget` | Adding, scaffolding, or reviewing a widget under `src/widgets/` — encodes the golden path: pure `create<Name>` factory + `register()`, colocated `*.test.ts`, side-effect import in `src/widgets/index.ts`. |
| `architecture-deep-dive` | Explaining how the library fits together, or deciding *where* a new feature belongs. Keeps the depth in `references/architecture.md` — the registry contract, module boundaries, and why widgets are shaped this way. |
| `analyzing-bundle-size` | Estimating the bundle's weight or checking a change's impact on it. Runs the real `npm run build` and reads the real byte size of `dist/bundle.js` via `scripts/` — never guesses a number. |
