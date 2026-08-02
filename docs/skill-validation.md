# Skill discovery validation

Each task in `docs/walkthrough.md` ends with a «Перевірте» step asking the same
question: given a plain request with no structural detail, does the agent find
and load the skill **on its own**? This file records those three runs. Task D's
separate with-skill-vs-without comparison lives in `docs/ab-validation.md`.

All runs were done in a **fresh top-level chat**, never a subagent — subagents
spawned via the `Agent` tool in this environment receive only a skill's bare
name, not its `description`, so they cannot test discovery at all (that finding
is what shaped Task D's method).

| Skill | Prompt | Tool | Loaded? | Evidence |
|---|---|---|---|---|
| `creating-widget` | «додай widget spinner» | Claude Code | yes | produced `app/src/widgets/spinner/spinner.ts` — pure factory, `register("spinner", createSpinner)`, colocated test, `widgets/index.ts` import. Still in the tree; `npm test` covers it |
| `architecture-deep-dive` | «поясни архітектуру цього проєкту» | Claude Code | yes | the answer came from `references/architecture.md` rather than a generic model explanation of "a registry pattern" |
| `analyzing-bundle-size` | «яка зараз вага бандла?» | Antigravity 2.0, GitHub Copilot | yes | the script was invoked and the real `app/dist/bundle.js` number reported, not estimated — see `docs/task-e-bonus.md` |

Evidence grading, so the rows aren't read as stronger than they are:

- Rows 1 and 2 are **participant-observed** in Claude Code — the run happened,
  the output is on disk for row 1.
- Row 3 is **participant-observed in Antigravity and Copilot** and recorded in
  the Task E write-up. The same prompt was not separately logged in Claude
  Code, so this table doesn't claim it.
- The script itself was run directly from the shell as well (Task C step 3),
  printing `app/dist/bundle.js — 636 bytes (0.62 KB)` — that confirms the
  script works, which is a different claim from the skill being discovered.

The one thing none of these rows proves is that the skill *changed* the
outcome. Discovery and effect are separate questions; the effect measurement
is Task D, and its answer for `creating-widget` was a null on the artifact
with a real difference in process cost.
