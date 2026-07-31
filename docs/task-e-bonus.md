# Task E (bonus) — pick ONE path

---

## Path 1 — cross-tool portability check

Verify the **same** skill works, unmodified, in a **second** tool (e.g.
Cursor + Claude Code, or copy `.agents/skills/creating-widget/` into
`.claude/skills/creating-widget/`).

**Tools compared:** `.agents/skills/` (generic Agentic IDE convention) and `.claude/skills/` (Claude Code native discovery)
**Prompt (same in both):** "Add a new alert widget to the library: renders as `<div class="alert alert--{tone}">{message}</div>`, tone optional defaulting to info, make it discoverable the same way every other widget is."

| | Tool 1 (`.agents/skills/`) | Tool 2 (`.claude/skills/`) |
|---|---|---|
| Skill discovered/loaded? | Yes — agent read SKILL.md before implementing | Yes — Claude Code listed it in available skills and agent loaded it |
| Followed the golden path? | Yes — correct folder, register(), test, index import | Yes — identical structure and verification steps |
| Discrepancies | None | None — file used unmodified, no adaptation required |

**Conclusion:** The skill is fully portable between `.agents/skills/` (tool-agnostic convention) and `.claude/skills/` (Claude Code native). The YAML frontmatter format (`name` + `description`) works identically in both locations — Claude Code auto-discovers the skill and presents it in its skill listing. No edits were needed; a simple `cp -r` was sufficient.
