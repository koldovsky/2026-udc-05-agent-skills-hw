# Task E (bonus) — Path 1: cross-tool portability check

Verified the **same, unmodified** `.agents/skills/` (with the `.claude/skills/`
symlink mirror for Claude Code) across three tools, no per-tool edits to any
`SKILL.md`.

**Tools compared:** Claude Code, Antigravity 2.0, GitHub Copilot
**Prompts (same across tools):** "add a `spinner`/`alert` widget" (triggers
`creating-widget`) and "яка зараз вага бандла?" (triggers
`analyzing-bundle-size`)

| | Claude Code | Antigravity 2.0 | GitHub Copilot |
|---|---|---|---|
| Skill discovered/loaded? | Yes, in a genuinely new top-level chat (confirmed earlier, Task A) | Yes — all 3 skills visible automatically in GUI, no changes needed | Yes, **in normal mode** — sees both `.agents/skills/` and `.claude/skills/`, each skill listed with 2 paths in GUI |
| Followed the golden path? | Yes | Yes — bundle-size prompt loaded both the `analyzing-bundle-size` skill and its script automatically, ran it | Yes, in normal mode — bundle size calculated correctly via the real script |
| Discrepancies | None | None | **In worktree mode (Copilot's default), skills were completely absent** — neither `.agents/skills/` nor `.claude/skills/` was seen at all |

## The worktree-mode gap

Copilot's default execution mode runs the agent in an isolated git worktree.
In that mode no skill showed up; the same repo in normal (non-worktree) mode
picked up everything correctly. The likely cause isn't a Copilot skill-loading
bug — it's a git mechanic: at the time of this check `.agents/skills/` and
`.claude/skills/` were both still **untracked** in this branch (`git status`
showed them as untracked; they were committed afterwards).
`git worktree add` populates a new worktree from git's tracked history, not
from the working tree's untracked files — so any tool that isolates its
agent run in a fresh worktree will structurally not see untracked skill
directories, regardless of how good its skill-discovery logic is. This is a
repo-state issue (uncommitted skills), not a portability failure of the
`SKILL.md` convention itself — it would disappear once `.agents/skills/` is
committed.

## Gotcha — `.claude/skills/` is not read only by Claude

Copilot enumerates skills from *both* `.agents/skills/` and `.claude/skills/`
independently (2 paths per skill in its GUI) rather than deduplicating the
symlink target. Harmless in this repo, because all three skills are
tool-neutral: they name real file paths, `npm` scripts and one `node`
invocation, nothing harness-specific.

It stops being harmless as soon as a skill under `.claude/skills/` is written
*for* Claude Code. The directory name reads like a namespace but doesn't act
as one — Copilot loads such a skill just as eagerly, then follows instructions
it cannot execute: a Claude-only tool name, `Skill`/`Agent` dispatch, a
`/`-command, a hook or settings path. The failure isn't a clean "unsupported
skill" error; the model improvises around the parts that don't map to it and
returns a normal-looking, wrong answer. The A/B in `docs/ab-validation.md`
shows the same mechanic from the other side: a skill whose `description`
never reaches the agent simply doesn't fire, and nothing announces that either.

Practical rule for a mixed-tool repo: keep everything in `.agents/skills/` —
and anything mirrored into `.claude/skills/` — tool-neutral. A genuinely
Claude-only skill belongs outside the repo (a personal `~/.claude/skills/`,
which no repo-scanning tool sees), or must name its tool requirement in the
`description`, the one field every tool reads before deciding to load.

## Conclusion

`.agents/skills/` is genuinely cross-platform: three different tools (Claude
Code, Antigravity 2.0, Copilot) all discovered and correctly used the exact
same, unmodified skill files — no adaptation needed, confirming the
convention described in `docs/walkthrough.md`. The one real gotcha isn't
about the convention but about **delivery**: a skill that only exists as
untracked working-tree files is invisible to any tool that materializes an
isolated worktree for its agent run (Copilot's default mode being one
concrete example) — a good reason to commit `.agents/skills/` rather than
leave it untracked before relying on it in worktree-based tools. A second
delivery caveat, from how this mirror is built: `.claude/skills/creating-widget`
is a git symlink (mode `120000`) while the other two mirrors are real copies,
and git checks a symlink out as a 36-byte plain text file on Windows without
`core.symlinks` — so on a Windows clone that one mirror silently isn't a
skill. Real copies are the portable form; the cost is that a fix has to be
applied to both trees. And per the gotcha above, the mirror directory buys no
tool isolation — `.claude/skills/` is read by more than Claude, so the skills
that live there have to stay tool-neutral to be safe.
