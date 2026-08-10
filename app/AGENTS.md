# AGENTS.md

## Stack

TypeScript 5, Node 22, Vitest, esbuild — plain library, no framework.

## Commands

- Install: `npm install`
- Test: `npm test`
- Typecheck: `npm run typecheck`
- Build (bundle): `npm run build` → `dist/bundle.js`
- Per-widget bundle cost: `npm run ablate` → JSON on stdout, builds in memory
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
  test, `src/widgets/index.ts` wiring.
  **Load only when `src/widgets/<name>/` does not exist yet.** Do NOT load it
  to edit an existing widget's props, markup, unions or tests — read that
  widget's own two files instead. (`src/widgets/spinner/` was produced by this
  skill — see `../docs/task-a-verification.md`.)
- `architecture-deep-dive` — explains how the pieces fit: module boundaries,
  the registry contract, where type safety ends, where a new feature belongs,
  and what a change to `src/core/registry.ts` affects. `SKILL.md` is a routing
  table; the depth lives in its `references/architecture.md`, which is opened
  by section, not whole.
  **Load for explain / why / where questions.** Do NOT load it to actually add
  a widget (that is `creating-widget`) or to measure the bundle. Its facts are
  checked against the code — never answer this codebase's architecture from
  memory when it is available.
- `analyzing-bundle-size` — answers bundle-weight questions with measurements,
  not estimates: its `scripts/measure-bundle.mjs` runs `npm run build`, reads
  the real `dist/bundle.js` (raw + gzip) and gets each widget's marginal cost
  from `npm run ablate`, guarded by a byte-for-byte check against the shipped
  bundle. `--budget <bytes>` exits 1 when over. Interpreting the output
  (why marginals do not sum, before/after deltas, `[UNTRUSTED]`) lives in its
  `references/interpreting-results.md` — opened only when interpreting, not to
  run. Neither file quotes a byte count: the number must come from a run.
  **Load for any "how big / how much did this add / does it fit" question.**
  Do NOT answer bundle size from memory, from source file sizes, or from an
  earlier number in the conversation — run the script. Do NOT load it to add a
  widget (`creating-widget`) or to explain *why* nothing tree-shakes
  (`architecture-deep-dive`).

`creating-widget` exists **twice**: `.agents/skills/creating-widget/` and a
byte-identical copy at `.claude/skills/creating-widget/`. That is not redundancy
— Cursor reads `.agents/skills/`, Claude Code does not, and only the second path
puts the skill in Claude Code's loader (measured in `../docs/task-e-bonus.md`).
Both copies are one skill: **edit one, copy it to the other in the same commit.**
`python3 ../docs/task-e/portlint.py` hashes them and exits 1 when they drift.
