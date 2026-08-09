# Task E (bonus) — Path 1: cross-tool portability check

**Skill under test:** `creating-widget` — the same `SKILL.md`, **unmodified**,
in both tools (`.agents/skills/creating-widget/SKILL.md`; Claude Code also has
the byte-identical mirror at `.claude/skills/creating-widget/SKILL.md`).

**Tools compared:** Claude Code (Opus 5 → fresh Sonnet sub-agent, empty
context) and **Codex CLI 0.144.1** (`codex exec --full-auto`, separate
process, no shared context).

**Prompt (identical in both, verbatim):**
"Add a `spinner` widget following the project's pattern. When done, report
which files you created or modified, which verification commands you ran, and
whether any project skill was available/used (name it and say what it made you
do differently)."

Each run started from the same clean tree (no `spinner`, `widgets/index.ts` at
HEAD); the first run was reverted before the second.

| | Tool 1 — Claude Code | Tool 2 — Codex CLI |
|---|---|---|
| Skill discovered/loaded? | yes — named `creating-widget` unprompted | yes — named `creating-widget` unprompted |
| File edits needed to the skill | **none** | **none** |
| Followed the golden path? | yes: `app/src/widgets/spinner/spinner.ts`, pure `createSpinner`, `register("spinner", …)` at module bottom, colocated `spinner.test.ts`, wiring import in `widgets/index.ts` | yes: identical structure, same four touchpoints |
| Alphabetical wiring import (skill-only rule) | yes | yes |
| Ran the skill's `## Verify` block | `npm test` (6/6), `npm run typecheck`, all 3 greps, `npm test -- src/widgets/spinner` | `npm test` (6/6), `npm run typecheck`, `npm test -- src/widgets/spinner`, registry/wiring/no-default-export checks, `git diff --check` |
| Discrepancies | invented a required `label` prop and `"sm" \| "md" \| "lg"` sizes | no `label`, hardcoded `"Loading"` text, `"small" \| "medium" \| "large"` sizes |
| Environment quirk | none | had to call `npm.cmd` — PowerShell blocks the `npm.ps1` shim |

The only divergence is in details the skill deliberately does **not** specify
(a spinner's prop vocabulary is a product decision, not a project convention).
Everything the skill *does* specify — layout, purity, registration, colocated
test, alphabetical wiring, the verification routine — came out the same in both
tools.

## A caveat on discovery, which is the non-portable part

The skill *file* needed no adaptation, but reaching it is not uniform:

- Claude Code ignored the cross-tool `.agents/skills/` path in an earlier
  measured run and only loaded the skill once the `.claude/skills/` mirror
  existed — see `docs/ab-validation.md`, round 1 vs round 2.
- Codex CLI has no `.claude/skills/` convention at all and still found and
  applied the skill in this run, with the `## Skills` table in `app/AGENTS.md`
  and the repo-root `AGENTS.md` as the pointers.

**Conclusion:** the skill is genuinely portable as a *document* — one
`SKILL.md` with plain YAML frontmatter drove two independent tools to the same
implementation and the same verification steps, with zero tool-specific edits.
What is not portable is *discovery*: each tool looks in its own place, so the
practical recipe is to keep `.agents/skills/` as the source of truth, mirror it
into the tool-native directory, and keep an explicit pointer in `AGENTS.md` for
tools that read that instead. A skill nobody loads is worth exactly nothing.

> The `spinner` widget from both runs was reverted after the comparison — the
> deliverable here is this write-up, and the repo keeps only the `alert` widget
> from Task D. `cd app && npm test` is green (4/4).
