# Task E (bonus) — pick ONE path

## Path 1 — cross-tool portability check

The **same** `creating-widget/SKILL.md`, byte-for-byte unmodified, was copied
from the cross-tool location into Claude Code's native location
(`cp -r .agents/skills/creating-widget .claude/skills/creating-widget`) and
exercised through **two different discovery mechanisms**:

- **Run 1** — agent-convention discovery: an agent session that reads
  `AGENTS.md` / `app/AGENTS.md` and follows the `## Skills` pointer to
  `.agents/skills/creating-widget/SKILL.md` as a plain file (the open
  `.agents/` convention used by Cursor, Copilot, Windsurf, etc.). This is the
  Task D run A session.
- **Run 2** — native skill discovery: a **fresh headless Claude Code CLI
  session** (`claude -p`, new context, no hints), where the harness itself
  lists project skills from `.claude/skills/` in the Skill tool.

*Honesty note / known limitation: only Claude Code was installed in this
environment — no second IDE (Cursor, Copilot, Windsurf) was available to run —
so this deliberately compares the two discovery mechanisms/locations rather
than two separate IDE products, which is exactly what the
copy-into-`.claude/skills/` variant of Path 1 tests. A run in a genuinely
different product would strengthen the claim and is the natural follow-up.*

**Tools compared:** Claude Code via `.agents/skills/` file-convention
discovery vs. Claude Code (fresh CLI session) via native `.claude/skills/`
skill discovery.
**Prompt (same shape in both):** "add a widget following the project's
pattern" (run 1: `alert` per `materials/ab-task.md`; run 2: `spinner` per
this template's example).

| | Run 1 (`.agents/skills/`, AGENTS.md pointer) | Run 2 (`.claude/skills/`, native Skill tool) |
|---|---|---|
| Skill discovered/loaded? | yes — followed `app/AGENTS.md` → `## Skills` → read `SKILL.md`, reported using it | yes — session reported `creating-widget` in its available-skills list and loaded it via the Skill tool from `C:\...\.claude\skills\creating-widget` |
| Followed the golden path? | yes — `widgets/alert/alert.ts` pure factory + `register()`, colocated test, `widgets/index.ts` import, ran the skill's `## Verify` steps (`npm test` + typecheck, 4/4 green) | yes — `widgets/spinner/spinner.ts` pure factory + `register()`, colocated test, `widgets/index.ts` import; sandbox denied its `npm test` calls so it verified statically; I ran `npm test` + `npm run typecheck` after: 6/6 green, no TS errors |
| Discrepancies | none | none in behaviour; only operational: headless permission mode blocked the agent from running the verify commands itself |

**Conclusion:** The identical SKILL.md worked in both locations with zero
edits — frontmatter `name`/`description` was enough for native discovery, and
the markdown body was equally followable when found as a plain file via the
AGENTS.md pointer. The only friction was environmental (headless permission
sandbox), not skill-format-related. Progressive disclosure held up too: the
fresh session saw only the description until the widget request triggered a
full load. (The `spinner` widget from run 2 was reverted afterwards — the
committed code change in this PR is the `alert` widget from Task D.)

**Tradeoff of copying over symlinking:** the two locations are independent
files, so an edit to one silently diverges the other and would quietly
invalidate this portability claim. After any skill edit, re-sync and verify:

```bash
cp .agents/skills/creating-widget/SKILL.md .claude/skills/creating-widget/SKILL.md
diff .agents/skills/creating-widget/SKILL.md .claude/skills/creating-widget/SKILL.md
```

(Both copies in this repo are byte-identical as of the last commit — verified
with the `diff` above.)