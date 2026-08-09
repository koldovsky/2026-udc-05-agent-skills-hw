# A/B validation (Task D)

**Skill under test:** `creating-widget`
**Prompt (identical in every run):** the change request from
`materials/ab-task.md` (add an `alert` widget) — pasted verbatim, never
reworded between runs.
**Tool used:** Claude Code (Opus 5 orchestrating, each run executed by a
fresh sub-agent on Sonnet with an empty context = the "new chat" requirement).

Two rounds were run, because the first one exposed a methodology bug worth
reporting rather than hiding.

---

## Round 1 — the run that proved my measurement was wrong

- **A:** `.agents/skills/creating-widget/` present, `app/AGENTS.md` with its
  `## Skills` section.
- **B:** `.agents/skills/` moved entirely outside the repo, `app/AGENTS.md`
  reverted to its pre-Task-A baseline.

Both runs produced **byte-identical** `alert.ts` and an identical
`widgets/index.ts` edit; the only difference was a test fixture string
(`"Something broke"` vs `"Failed"`).

Asked afterwards whether it had opened the skill, run A's agent answered that
it had **not** — it had worked from `app/AGENTS.md` and the seeded
`badge/` widget alone. So round 1 compared *no skill* against *no skill*.
**Cause:** this tool auto-discovers project skills under `.claude/skills/`,
not under the cross-tool `.agents/skills/` path, and the agent did not follow
the markdown link in `app/AGENTS.md` on its own.

When that same agent was then pointed at the skill, it found one concrete
deviation in its own work — `app/src/widgets/index.ts` imports must be kept
alphabetical, a convention that is **unobservable from `badge/`** because
badge is the only existing entry — and fixed it.

---

## Round 2 — the real comparison

Discovery fixed by mirroring the skill, unmodified, into
`.claude/skills/creating-widget/`. Clean baseline before each run (no `alert`
widget, `widgets/index.ts` reverted).

### Result A — skill available

Skill was loaded and explicitly cited. The agent produced:

- `app/src/widgets/alert/alert.ts` — pure `createAlert(props): string`,
  `AlertProps extends WidgetProps`, `tone ?? "info"`, `.js` extension on the
  registry import, `register("alert", createAlert)` at module load.
- `app/src/widgets/alert/alert.test.ts` — colocated, default tone + explicit
  tone, mirroring `badge.test.ts`.
- `app/src/widgets/index.ts` — `import "./alert/alert.js";` placed **before**
  the badge import (alphabetical, per the skill).
- Verification actually executed: `npm test` (4/4), `npm run typecheck`
  (clean), `grep -n 'register("' …` (exactly one), `grep -n 'alert'
  src/widgets/index.ts` (wiring present), `grep -rn 'export default'
  src/widgets/alert/` (no matches), `npx vitest run src/widgets/alert` (2/2).
- Cost: 10 tool calls, ~49 s.

### Result B — skill removed

`.agents/skills/` and `.claude/skills/` both moved outside the repo. The agent
explicitly confirmed no skill was available and re-derived the pattern by
reading `badge/` and `AGENTS.md`. It produced:

- The same three file changes, functionally correct — `register()` called,
  colocated test written, wiring import added, registry untouched.
- `import "./alert/alert.js";` appended **after** badge (no ordering
  convention to observe).
- An explanatory comment restating the pattern (the skill-run omitted it —
  the pattern was already external knowledge).
- Verification: `npm test` only (4/4). No typecheck, no greps, no isolated
  run.
- Cost: 19 tool calls, ~189 s — nearly 4× the exploration to reach the same
  place.

### Difference table

| Aspect | A (skill available) | B (skill removed) |
|---|---|---|
| File location | `app/src/widgets/alert/alert.ts` | same — correct |
| Registered via `register()` | yes | yes |
| Colocated test added | yes | yes |
| Wired into `widgets/index.ts` | yes, alphabetically ordered | yes, appended out of order |
| Named exports / no `any` | yes | yes |
| Verification run | test + typecheck + 3 greps + isolated vitest | `npm test` only |
| Tool calls / wall time | 10 / ~49 s | 19 / ~189 s |
| Skill acknowledged | yes, cited `creating-widget` | explicitly "no skill available" |

### Round 1 vs round 2

| | Round 1 A | Round 2 A |
|---|---|---|
| Skill location | `.agents/skills/` only | `.agents/skills/` + `.claude/skills/` mirror |
| Skill actually loaded | **no** | yes |
| Output vs its B run | identical | identical code, different rigor + cost |

## Conclusion

On a task this well-covered by the repo's baseline (`app/AGENTS.md` documents
the pattern and `badge/` is a working example), the skill did **not** change
the produced code — it changed *how the agent got there*: half the tool calls,
a quarter of the wall time, a prescribed verification routine that was actually
executed, and one convention (alphabetical wiring imports) that is genuinely
not inferable from the codebase. The bigger lesson was the round-1 failure:
a skill that is never discovered is indistinguishable from a skill that does
not exist, so **placement is a functional property, not packaging** —
`.agents/skills/` is the portable convention, but it needs the tool-native
mirror (here `.claude/skills/`) to actually fire. See `docs/task-e-bonus.md`.

The skill-assisted result (round 2, run A) is kept as the committed change;
`cd app && npm test` is green (4/4) and `npm run typecheck` is clean.
