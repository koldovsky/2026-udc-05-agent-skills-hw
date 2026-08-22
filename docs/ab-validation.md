# A/B validation (Task D)

**Skill under test:** `creating-widget`
**Prompt (same for A and B):** the change request from `materials/ab-task.md`
(add an `alert` widget), pasted verbatim, not reworded between runs.
**Tool used:** Claude Code (Claude 5 family, session model Fable 5), run date
2026-08-22. Each run was a **fresh agent context** (new chat equivalent);
between runs the working tree was reset to baseline (`git checkout`-level
revert of `app/src`), and for run B the `creating-widget` folder was **moved
entirely out of the repo**
(`mv .agents/skills/creating-widget /tmp/skill-disabled/`), not just renamed.
**Raw evidence:** the exact `git diff` of every run is preserved in
[`docs/evidence/`](evidence/README.md).

Two rounds were run: **Round 1** with the initial version of the skill, and
**Round 2** after upgrading the skill with project-specific knowledge that is
*not* inferable from the seeded example (a registry-level registration test —
see Round 2 below for why that matters methodologically).

---

## Round 1 — initial skill

### Result A — skill available

The agent followed the discovery chain `app/AGENTS.md` → `## Skills` →
`.agents/skills/creating-widget/SKILL.md` and reported explicitly that it
loaded the skill and "followed it step by step, including its verify
checklist". Output:

- `app/src/widgets/alert/alert.ts` — `AlertProps extends WidgetProps`
  (`message: string`, `tone?: "info" | "warn" | "error"`), pure `createAlert`
  with `props.tone ?? "info"`, top-level `register("alert", createAlert)`,
  named exports only.
- `app/src/widgets/alert/alert.test.ts` — colocated vitest tests (default
  tone + explicit `error` tone, exact-HTML-string assertions, mirroring
  `badge.test.ts`).
- `app/src/widgets/index.ts` — added `import "./alert/alert.js";`.
- No changes to `core/registry.ts`. Ran `npm test` (4/4 green) **and**
  `npm run typecheck` — the typecheck run came from the skill's `## Verify`
  section.

### Result B — skill removed

The agent read `app/AGENTS.md`, tried to follow the Skills pointer, and
discovered the `creating-widget` folder **did not exist** (it verified with a
file listing and even guessed it was "removed for the Task D A/B baseline
run"). It then fell back to reverse-engineering the pattern from the seeded
`badge` widget. Output: functionally identical golden-path result — same
three files, `register()` call, colocated test, `widgets/index.ts` wiring;
a `diff` of the two patches shows the **only** differences are the sample
strings inside the tests (`"Saved"` vs `"Heads up"`). It also ran tests
(4/4 green) and typecheck.

### Round 1 difference table

| Aspect | A (skill available) | B (skill removed) |
|---|---|---|
| File location | `app/src/widgets/alert/alert.ts` ✅ | `app/src/widgets/alert/alert.ts` ✅ |
| Registered via `register()` | yes, top-level | yes, top-level |
| Colocated test added | yes (2 cases) | yes (2 cases) |
| Wired into `widgets/index.ts` | yes | yes |
| Named exports / no `any` | yes | yes |
| **How the pattern was found** | deterministically: loaded `SKILL.md`, followed its steps + `## Verify` checklist | by inference: hit a dangling skill reference, listed the FS to confirm it was gone, then reverse-engineered `badge/` |
| Extra verification performed | `npm test` + `npm run typecheck` (prescribed by the skill) | `npm test` + typecheck (agent's own initiative) |

### Round 1 conclusion

The skill demonstrably changed the **process**: in run A it was discovered and
followed as an explicit checklist; in run B the agent noticed its absence and
had to spend turns inferring the convention from the `badge` example. The
**outcome**, however, converged — because this repo's baseline is unusually
strong (a complete `app/AGENTS.md`, a single canonical example widget, and a
capable model), run B could reconstruct the golden path from examples alone.
Known confound: both runs could see the repo-level `AGENTS.md`, which names
`badge/` as "the pattern" — removing the skill does not remove all guidance,
matching the walkthrough's setup where only the skill folder is moved.

On efficiency, the measured numbers were a wash at n=1 — run A: 28,430 tokens
/ 13 tool calls / 73 s; run B: 29,116 tokens / 12 tool calls / 76 s — well
inside run-to-run noise, so no efficiency claim is made from this data.

---

## Round 2 — upgraded skill (knowledge the example can't teach)

Round 1 exposed a design weakness in the experiment itself: when everything
the skill teaches is also legible from the seeded `badge/` example, a capable
agent reconstructs it and the arms converge. So the skill was upgraded with a
piece of real, verified project knowledge that exists **nowhere in the seeded
code**: colocated widget tests import the factory directly, so the entire
suite stays green even when a widget is never registered (verified: with the
`alert` import deleted from `widgets/index.ts`, `npm test` passed 4/4 and
typecheck was clean while `create("alert", …)` would throw at runtime). The
upgraded skill's step 4 closes that hole by requiring a registry-level case in
`app/src/widgets/registration.test.ts`.

Both arms were re-run from the same badge-only baseline (no `alert`, no
`registration.test.ts`), same verbatim prompt, fresh contexts; for arm B the
skill was moved out of **both** `.agents/skills/` and the `.claude/skills/`
mirror.

### Result A₂ — upgraded skill available

Golden path as before, **plus** it created `registration.test.ts` with
registry-level cases (`listWidgets()` containment + `create()` output) for
both `alert` and `badge`, citing the skill as the reason. `npm test` 6/6
green, typecheck clean.

### Result B₂ — skill removed

Golden path faithfully reproduced — its `alert.ts`/`alert.test.ts`/`index.ts`
came out byte-identical to the committed skill-assisted versions (its diff vs
the commit is empty, see `docs/evidence/run-b2.patch`) — but **no
`registration.test.ts`**: the file appears nowhere in its output or its
report. `npm test` 4/4 green (which is exactly the problem: green while the
registration gap stays open).

### Round 2 difference table

| Aspect | A₂ (upgraded skill) | B₂ (skill removed) |
|---|---|---|
| Golden path (folder, factory, `register()`, colocated test, `index.ts`) | yes | yes |
| Registry-level `registration.test.ts` | **yes — created, covers alert + badge** | **no — structurally unreachable: nothing in `badge/` to mirror it from** |
| Would a forgotten `widgets/index.ts` import be caught by tests? | yes (fails with `expected [ 'badge' ] to include 'alert'` — verified) | no (suite stays green — verified) |

## Round 3 — model routing (do the skills pick the correct models?)

After the skills gained per-task model recommendations (`model:` frontmatter
+ a "Recommended model" fallback ladder: Haiku for `creating-widget`, Sonnet
for `analyzing-bundle-size`, Fable→Opus for `architecture-deep-dive`), a
third A/B checked whether agents actually route by them. Same verbatim prompt
in fresh contexts: assign an exact model ID + fallback to one task per skill,
then disclose sources. Full reports: `docs/evidence/round3-model-routing.md`.

| | A (skills present) | B (folders moved out, git intact) | B′ (clean room: no git, no skills) |
|---|---|---|---|
| Correct tiers (Haiku / Fable / Sonnet)? | ✅ all three | ✅ all three | ✅ all three |
| Exact IDs + full fallback ladders? | ✅ verbatim from SKILL.md | ✅ — **recovered the SKILL.md files from git history** | ⚠️ tiers only, from `app/AGENTS.md`'s summary line; IDs self-supplied, ladders absent |
| Attributed to project guidance? | yes, per-file | yes (via `git show HEAD:`) | yes (`app/AGENTS.md` "the decisive source") |

Two findings beyond the headline ✅:

1. **Folder-move disabling stops working once skills are committed.** Run B's
   agent noticed the empty `.agents/skills/`, pulled all three SKILL.md files
   out of git history, and followed them anyway. The walkthrough's
   disable-by-moving technique was valid in rounds 1–2 only because the skill
   wasn't committed yet; a future A/B on committed skills needs a baseline
   commit (or a `.git`-less copy) instead.
2. **The behavioral delta vs. no guidance is real.** The clean-room agent
   disclosed unprompted that its unaided instinct "would have swapped tasks 1
   and 3 (Sonnet for the coding task, Haiku for the mechanical measurement)"
   — the project mapping overrode it. Without any guidance the routing would
   have contradicted the project's intent, which is exactly what the skill
   recommendations exist to prevent.

## Overall conclusion

Round 1 shows what a skill does when it merely restates a legible convention:
it changes the *process* (deterministic discovery, prescribed verification)
but a strong baseline lets the no-skill arm converge on the same code. Round 2
shows what a skill does when it encodes knowledge the codebase cannot teach by
example: the no-skill arm cannot produce it at all. The practical rule this
A/B demonstrates: **a skill earns its keep in proportion to how much of it is
NOT already derivable from the repo's own examples** — and the registration
test is now part of the skill precisely because it fails that derivability
test.

The skill-assisted results are kept as the real commit (`alert` widget +
`registration.test.ts`); `cd app && npm test` is green (3 files, 6/6).