# Task E (bonus) — Path 1: cross-tool portability check

**Skill under test:** `creating-widget`, copied **byte-for-byte** (no edits) from
`.agents/skills/creating-widget/SKILL.md` to `.claude/skills/creating-widget/SKILL.md`.
**Prompt (identical in both):** the `alert` widget ticket from `materials/ab-task.md`.

## Honest scope note

Both runs were executed by Claude Code (fresh sub-agent, empty context). So
this compares **two discovery conventions within one tool family** — the
cross-tool `.agents/skills/` path versus the tool-native `.claude/skills/`
path — not two vendors. That turned out to be the more interesting axis
anyway, because it is where the skill actually failed.

| | Discovery via `.agents/skills/` only | Discovery via `.claude/skills/` mirror |
|---|---|---|
| Skill discovered/loaded? | **no** — agent later confirmed it never opened `SKILL.md` | **yes** — agent cited `creating-widget` by name |
| Followed the golden path? | yes, but by re-deriving it from `badge/` and `app/AGENTS.md` | yes, and cited the skill for each rule |
| Followed skill-only conventions? | no — alphabetical import ordering in `widgets/index.ts` was missed | yes |
| Ran the skill's `## Verify` routine? | no (`npm test` only) | yes (test, typecheck, 3 greps, isolated vitest) |
| File content changes needed | **none** | **none** |
| Discrepancies | pointer from `app/AGENTS.md` was not enough to trigger a read | — |

## Conclusion

The skill file itself is genuinely portable: the same `SKILL.md`, with the same
YAML frontmatter and no tool-specific syntax, worked unmodified from the
`.claude/skills/` location. What is **not** portable is discovery — placing a
skill only under the cross-tool `.agents/skills/` path left it invisible to
this tool, and a markdown link to it from `app/AGENTS.md` was not enough to
make an agent read it. Keeping both locations (the portable source plus a
tool-native copy) costs one `cp` and is the difference between a skill that
fires and a skill that is decoration. Ideally the mirror is a symlink or a
CI-checked copy, so the two cannot drift apart.
