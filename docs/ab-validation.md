# A/B validation (Task D)

**Skill under test:** `creating-widget`
**Prompt (identical for A and B):** the change request from
`materials/ab-task.md` (add an `alert` widget), pasted verbatim from a file so
the two runs got byte-identical input — not retyped, not reworded.
**Tool used:** Claude Code CLI `2.1.236`, non-interactive
(`claude --dangerously-skip-permissions --verbose --output-format stream-json
-p "$(cat prompt.txt)"`). Each run is a **new session** with no shared
context, and the full tool-call trace of every run was captured as JSONL so
the comparison below is measured, not remembered.

**How the skill was disabled for B:** the folder was moved **entirely out of
the repo** — `mv .agents/skills/creating-widget /tmp/ws5-ab/creating-widget-disabled`
— and `find .agents/skills -name "SKILL.md"` was used to confirm only
`architecture-deep-dive` and `analyzing-bundle-size` remained. No in-place
rename was used.

**One honest tooling note:** the first A attempt showed `creating-widget` was
**never invoked** — Claude Code `2.1.236` discovers skills in `.claude/skills/`,
not `.agents/skills/`. The run silently degraded into a B run. Run A below was
therefore executed with the skill mirrored to `.claude/skills/creating-widget/`
(an unmodified `cp -r`), and the trace was checked for an actual
`Skill: creating-widget` tool call before the result was accepted. Finding
this was itself worth the exercise: **"the file exists" ≠ "the skill loaded."**

Between every run the tree was reset (`rm -rf app/src/widgets/alert &&
git checkout -- app/src/widgets/index.ts`) so each run started from the
identical seeded state.

---

## Result A — skill available

Trace: the **very first tool call** was `Skill: creating-widget`. Nothing was
searched for first — the agent loaded the skill, then read exactly three files
(`badge.ts`, `badge.test.ts`, `widgets/index.ts`) to copy the concrete
pattern, and went straight to writing.

Produced:

- `app/src/widgets/alert/alert.ts` — `AlertProps extends WidgetProps`
  (`message: string`, `tone?: "info" | "warn" | "error"`), pure
  `createAlert(props): string`, `.js` import suffix, `register("alert",
  createAlert)` as the last line.
- `app/src/widgets/alert/alert.test.ts` — colocated, 3 vitest cases (default
  `info`, explicit `error`, `warn`) asserting exact HTML with `toBe`.
- `app/src/widgets/index.ts` — added `import "./alert/alert.js";`.
- Verification: ran **`npm test` AND `npm run typecheck`**, and reported
  *"All 5 tests pass and typecheck is clean."*

9 tool calls · 26.1 s · $0.160.

## Result B — skill removed

Trace: no skill call (none existed). The agent opened with a
general-purpose sub-agent (`Agent`) plus a repo-wide `find` and two `grep -r`
sweeps for `"badge"` / `"widget"`, then read **five** files before writing.
It reconstructed the convention from the `badge` example and `app/AGENTS.md`.

Produced: the same three files in the same locations, structurally identical
code. The only textual differences were test-case cosmetics — `"Danger"` vs
`"Oops"` as a fixture string and `"supports warn tone"` vs `"renders warn
tone"` as a test title. `diff -u` on `alert.ts` between A and B: **no
differences at all.**

Verification: ran **`npm test` only** — no typecheck.

13 tool calls · 40.7 s · $0.241.

## Result B2 — control: no skill *and* no `AGENTS.md`

Because B came out correct, a third run isolated *where* the knowledge was
actually coming from. The skill, `AGENTS.md`, `app/AGENTS.md` and `CLAUDE.md`
were all moved out; only the source code remained.

Result: **still correct** — `alert.ts` byte-identical to A's, correct folder,
`register()` called, colocated test, barrel updated. 13 tool calls · 52.5 s ·
$0.218, again with `npm test` only and no typecheck.

Conclusion from the control: for this particular task the seeded
`app/src/widgets/badge/` example is a strong enough in-repo pattern that a
capable model can infer the golden path by imitation. The task is
*mirror-able*.

---

## Difference table

| Aspect | A (skill available) | B (skill removed) | B2 (no skill, no docs) |
|---|---|---|---|
| File location | `widgets/alert/alert.ts` ✅ | same ✅ | same ✅ |
| Registered via `register()` | yes ✅ | yes ✅ | yes ✅ |
| Colocated test added | yes, 3 cases ✅ | yes, 3 cases ✅ | yes, 3 cases ✅ |
| Wired into `widgets/index.ts` | yes ✅ | yes ✅ | yes ✅ |
| Named exports / no `any` | yes ✅ | yes ✅ | yes ✅ |
| **Skill actually invoked** | **yes — first tool call** | n/a | n/a |
| **How the convention was found** | **read from `SKILL.md`** | `find` + 2× `grep -r` + sub-agent | `find` ×2 + sub-agent |
| **Files read before writing** | **3** | 5 | 5 |
| **Verification run** | **`npm test` + `npm run typecheck`** | `npm test` only | `npm test` only |
| Tool calls | **9** | 13 | 13 |
| Wall-clock | **26.1 s** | 40.7 s | 52.5 s |
| Cost | **$0.160** | $0.241 (+51 %) | $0.218 (+36 %) |

## Conclusion

The skill **did** change behaviour, but not in the way the exercise predicts:
the *artifact* was the same in all three runs, while the *path to it* was
measurably different. With the skill the agent skipped discovery entirely —
one `Skill` call instead of a sub-agent plus three filesystem sweeps — landing
at 9 tool calls / 26 s / $0.16 versus 13 / 41 s / $0.24 without it, i.e.
**~30 % fewer steps and ~34 % cheaper for an identical result.** The one
behavioural difference in the output was verification: only Run A ran
`npm run typecheck` alongside `npm test`, because the skill's `## Verify`
section names both. B and B2 declared success on tests alone.

What surprised me: the B2 control. The honest read is that this repo is an
easy case — one seeded widget makes the pattern imitable, so the skill buys
speed and consistent verification rather than correctness. A skill earns its
keep on knowledge that is *not* inferable from a nearby example: the
`analyzing-bundle-size` script is the sharper case, since no amount of reading
`src/` tells you the bundle is 411 bytes, or that adding this very `alert`
widget grows it to **509 bytes (+98 bytes, +23.8 %)**. Second lesson, learned
the hard way: always verify the skill was *loaded* (look for the `Skill` tool
call in the trace), because a skill in a directory your tool doesn't scan is
indistinguishable from no skill at all.

## Repo state after this exercise

Run A's `alert` widget was **kept** as a real change. `cd app && npm test` →
5 tests / 2 files green; `npm run typecheck` → clean. The `creating-widget`
skill was moved back to `.agents/skills/`, and `AGENTS.md`, `CLAUDE.md`,
`app/AGENTS.md` were all restored.

