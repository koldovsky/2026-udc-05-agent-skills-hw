# A/B validation (Task D)

**Skill under test:** `creating-widget`
**Prompt (same for A and B):** the change request from `materials/ab-task.md`
(add an `alert` widget) — pasted verbatim, unchanged between runs.
**Tool used:** Claude Code (each run = a fresh, isolated sub-agent, no shared
context with the other run or with the orchestrating session).

## Result A — skill available

`creating-widget` was mirrored into `.claude/skills/` (Claude Code discovers
skills there) before this run. The agent explicitly invoked the skill and
followed its documented golden path:

- `app/src/widgets/alert/alert.ts` — `AlertProps extends WidgetProps`,
  `message: string`, optional `tone?: "info" | "warn" | "error"`, pure
  `createAlert(props)` returning the exact markup, `tone` defaulted via
  `props.tone ?? "info"`, top-level `register("alert", createAlert)`. Named
  export, no `any`.
- `app/src/widgets/alert/alert.test.ts` — colocated vitest tests for the
  default tone and an explicit tone, mirroring `badge.test.ts`.
- `app/src/widgets/index.ts` — added `import "./alert/alert.js";`.
- `core/registry.ts` untouched. `cd app && npm test` → 7/7 green (including
  the pre-existing `spinner` widget).
- Self-reported reasoning: found `.claude/skills/creating-widget/SKILL.md`,
  used it to identify `badge` as the canonical reference, and copied its
  layout/pattern exactly.

## Result B — skill removed

Two removal passes, to isolate what was actually doing the work:

**B1 — only `creating-widget` removed** (`architecture-deep-dive` still
installed). `.agents/skills/creating-widget` was moved entirely out of
`.agents/skills/` (not just renamed in place), and its `.claude/skills`
mirror deleted too. Result: same three files, same code shape as Result A —
`alert.ts`, `alert.test.ts`, `register("alert", createAlert)`, wired into
`widgets/index.ts`. `cd app && npm test` → 7/7 green. Self-reported
reasoning: with `creating-widget` gone, the agent invoked the *other*
installed skill, `architecture-deep-dive`, to learn that `core/registry.ts`
is a protected contract and `widgets/index.ts` is the composition root, then
read `badge.ts`/`badge.test.ts` directly (the ticket says "mirror the badge
widget's tone handling") and copied that pattern by hand.

**B2 — both `creating-widget` AND `architecture-deep-dive` removed**, from
both `.agents/skills/` and `.claude/skills/` (a stricter, "truly no skill"
control, since B1 let a second, overlapping skill supply the same golden-path
knowledge). Result: still the same three files, same code, same
`register()`/wiring, `cd app && npm test` → 7/7 green — no skill at all was
available this time. Self-reported reasoning: the agent tried
`architecture-deep-dive` first, found it and its referenced
`references/architecture.md` didn't exist in `.claude/skills/` (only the
homework's own `AGENTS.md` did), and fell back to `AGENTS.md`'s own line
calling out `app/src/widgets/badge/` as "the pattern every new widget ...
should follow," combined with the ticket's explicit "mirror the badge
widget" instruction, to reconstruct the identical implementation by hand.

## Difference table

| Aspect | A (skill available) | B1 (`creating-widget` removed, `architecture-deep-dive` kept) | B2 (both skills removed) |
|---|---|---|---|
| File location | `widgets/alert/alert.ts` | same | same |
| Registered via `register()` | yes | yes | yes |
| Colocated test added | yes | yes | yes |
| Wired into `widgets/index.ts` | yes | yes | yes |
| Named exports / no `any` | yes | yes | yes |
| `npm test` | 7/7 green | 7/7 green | 7/7 green |
| Source of the golden path | `creating-widget` skill, cited directly | `architecture-deep-dive` skill + manual read of `badge.ts`/`badge.test.ts` | `AGENTS.md`'s own "badge is the pattern to follow" line + manual read of `badge.ts`/`badge.test.ts` |
| Extra verification | none beyond tests | also ran `npm run build` + bundle smoke test | also ran `npm run build` |

## Conclusion

`creating-widget` did **not** produce the outcome-level gap the task brief
anticipates (wrong folder, missing `register()`, skipped test, default
export, etc.) — all three runs, including the strict B2 control with *no*
skill installed at all, shipped an identical, fully correct implementation.
Two things blunted the skill's marginal value for this specific case: (1)
the ticket itself names `badge` as the pattern to mirror, which is enough of
a pointer for a capable agent to go read it directly instead of guessing,
and (2) this repo's own `AGENTS.md` already states in plain prose that
`badge/` is "the pattern every new widget ... should follow" — so even with
zero skills installed, the golden path was one file-read away. The skill
still earned its keep on *process*, not *outcome*: Run A went straight to
the documented pattern in a single lookup, while B1/B2 spent extra tool
calls (reading `AGENTS.md`, trying `architecture-deep-dive`, reading
`badge.ts`/`badge.test.ts` separately, plus an unprompted build) to
reconstruct the same answer. So: cheaper/faster with the skill, same
correctness without it — *for this well-hinted ticket, this repo's
already-good `AGENTS.md`, and this model*. I'd expect the gap
`ab-task.md` describes to show up for real with a vaguer ticket (no explicit
"mirror badge" hint), a weaker model, a larger codebase where "the pattern to
follow" isn't one `AGENTS.md` line away, or a convention subtle enough that
prose alone under-specifies it (e.g. the exact registration mechanism, not
just "there's a badge widget, look at it").
