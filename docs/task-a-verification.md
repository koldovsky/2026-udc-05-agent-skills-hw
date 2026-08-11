# Task A — verifying the `creating-widget` skill

Walkthrough step 5: fresh chat, three-word prompt `Add widget spinner`, no
mention of `app/src/widgets/`, `register()`, a colocated test, `index.ts`, or
`SKILL.md`.

Claude Code (Opus 5) · 2026-08-10 · `ws05/FeschenkoNatalia`

## Precondition

The assignment convention is `.agents/skills/`, but Claude Code only reads
`.claude/skills/` — **the skill must be mirrored into `.claude/skills/` to
trigger at all**, and the mirror has to stay in sync when the skill is edited.
Everything below was run with that mirror in place; without it the skill never
fires and the run measures nothing.

## Result: triggered, applied correctly

The skill was invoked **before any file was opened** — so the frontmatter
`description` alone was enough. Five signals show the output came from the skill,
not general knowledge:

- `src/widgets/spinner/` with exactly two files — folder shape is skill-only
- `SpinnerProps extends WidgetProps` — the TS2345 trap is skill-only
- `index.ts` edited before tests were written — the order the skill demands
- Test imports `createSpinner` directly, not via `create()`
- `listWidgets()` checked from the built bundle — non-obvious, straight from `## Verify`
- No `npm install` (the skill flags "a spinner" as the request that tempts one)

## Changes

| File | Action |
|---|---|
| `app/src/widgets/spinner/spinner.ts` | created — factory + `register("spinner", …)` |
| `app/src/widgets/spinner/spinner.test.ts` | created — 3 colocated vitest cases |
| `app/src/widgets/index.ts` | edited — side-effect import |
| `app/src/core/registry.ts` | untouched — protected API |

## Verification — all green

| Command | Result |
|---|---|
| `npm test` | 2 files, 5 tests passed |
| `npm run typecheck` | `tsc --noEmit`, empty output |
| `npm run build` + `listWidgets()` | `[ 'badge', 'spinner' ]`, bundle 564 B |

The bundle check is the one that matters: tests and `tsc` both stay green if the
`index.ts` import is forgotten (every test imports its widget directly), and only
the bundle prints `[ 'badge' ]` in that case. No lint step exists in this project.

> **Numbers are as of this run** (`badge` + `spinner`). Task D later added
> `alert`, and a later pass introduced HTML escaping, so the tree now
> reports 4 files / 17 tests, a 937 B bundle, and
> `[ 'badge', 'spinner', 'alert' ]`. Left unchanged on purpose — this document
> records what the run saw, not the current state.

## Conclusion

A three-word prompt produced the right folder, registration pattern, colocated
test, side-effect import, and bundle-level check. The `description` was specific
enough to fire on "add widget" and narrow enough not to fire elsewhere in the
same session.
