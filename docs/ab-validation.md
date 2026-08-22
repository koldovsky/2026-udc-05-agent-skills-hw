# A/B validation (Task D)

**Skill under test:** `creating-widget`
**Prompt (same for A and B):** the change request from `materials/ab-task.md`
(add an `alert` widget), pasted verbatim, not reworded between runs.
**Tool used:** Claude Code (model: Fable 5). Each run was a **fresh agent
context** (new chat equivalent); between runs the working tree was reset to
baseline (`git checkout`-level revert of `app/src`), and for run B the
`creating-widget` folder was **moved entirely out of the repo**
(`mv .agents/skills/creating-widget /tmp/skill-disabled/`), not just renamed.

## Result A — skill available

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

## Result B — skill removed

The agent read `app/AGENTS.md`, tried to follow the Skills pointer, and
discovered the `creating-widget` folder **did not exist** (it verified with a
file listing and even guessed it was "removed for the Task D A/B baseline
run"). It then fell back to reverse-engineering the pattern from the seeded
`badge` widget. Output: functionally identical golden-path result — same
three files, `register()` call, colocated test, `widgets/index.ts` wiring;
a `diff` of the two patches shows the **only** differences are the sample
strings inside the tests (`"Saved"` vs `"Heads up"`). It also ran tests
(4/4 green) and typecheck.

## Difference table

| Aspect | A (skill available) | B (skill removed) |
|---|---|---|
| File location | `app/src/widgets/alert/alert.ts` ✅ | `app/src/widgets/alert/alert.ts` ✅ |
| Registered via `register()` | yes, top-level | yes, top-level |
| Colocated test added | yes (2 cases) | yes (2 cases) |
| Wired into `widgets/index.ts` | yes | yes |
| Named exports / no `any` | yes | yes |
| **How the pattern was found** | deterministically: loaded `SKILL.md`, followed its steps + `## Verify` checklist | by inference: hit a dangling skill reference, listed the FS to confirm it was gone, then reverse-engineered `badge/` |
| Extra verification performed | `npm test` + `npm run typecheck` (prescribed by the skill) | `npm test` + typecheck (agent's own initiative) |

## Conclusion

The skill demonstrably changed the **process**: in run A it was discovered and
followed as an explicit checklist; in run B the agent noticed its absence and
had to spend turns inferring the convention from the `badge` example. The
**outcome**, however, converged — because this repo's baseline is unusually
strong (a complete `app/AGENTS.md`, a single canonical example widget, and a
capable model), run B could reconstruct the golden path from examples alone.
That is itself the honest lesson of the A/B: a skill earns the most in repos
where the convention is *not* already legible from one obvious example — and
even in a well-seeded repo it still buys determinism (the prescribed
`## Verify` steps ran because the skill said so, not because the model felt
like it) and removes the token/turn cost of re-deriving the pattern each time.
Known confound: both runs could see the repo-level `AGENTS.md`, which names
`badge/` as "the pattern" — removing the skill does not remove all guidance,
matching the walkthrough's setup where only the skill folder is moved.

The skill-assisted (run A) result is kept as the real commit;
`cd app && npm test` is green (4/4).