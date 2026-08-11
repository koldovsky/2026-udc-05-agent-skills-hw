# Task E (bonus) — both paths

> The template says pick one path. Both are completed here, each in full.

---

## Path 1 — cross-tool portability check

**Tools compared:** Claude Code 2.1.220 (`claude-opus-5[1m]`) and **GitHub Copilot
CLI 1.0.70**. Cursor is not installed on this machine; `opencode` 1.16.2 is, but has
no skill support, so Copilot CLI was the better second tool.

**Prompt (same in both):** frozen once to `/tmp/taske-prompt.txt` (245 bytes) and
replayed verbatim in each tool — never retyped. It deliberately omits where files go,
how the widget is structured, and that it needs a test, so golden-path adherence
stays observable:

```
Add a new **spinner** widget to the library:

- Renders as `<div class="spinner spinner--{size}">{label}</div>`.
- `size` is optional, one of `"sm" | "md" | "lg"`, defaulting to `"md"`.
- Make it discoverable the same way every other widget is.
```

`spinner` was chosen so there is no `register()` name collision with the `alert`
widget Task D left in the tree. `app/src` was reset to a byte-identical snapshot
before each run, and both runs started from a green 6/6 baseline.

```bash
# tool 1
claude -p "$(cat /tmp/taske-prompt.txt)" --permission-mode acceptEdits \
  --allowedTools "Bash(npm:*),Read,Grep,Glob,Edit,Write" \
  --output-format stream-json --verbose

# tool 2 — narrow permissions chosen to mirror the Claude Code toolset
copilot -p "$(cat /tmp/taske-prompt.txt)" \
  --allow-tool='write' --allow-tool='shell(npm:*)'
```

### Results

| | Claude Code 2.1.220 | GitHub Copilot CLI 1.0.70 |
|---|---|---|
| Skill discovered/loaded? | **yes** — `Skill(creating-widget)` is tool call #1 in the `stream-json` log | **yes** — `● skill(creating-widget)` is the first line of its output; `copilot skill list` also lists all three skills with correct names and descriptions |
| Followed the golden path? | **yes** — `widgets/spinner/spinner.ts` with `interface SpinnerProps extends WidgetProps`, `createSpinner`, `props.size ?? "md"`, `register("spinner", createSpinner)` last, `.js` import; colocated `spinner.test.ts`; side-effect import added to `widgets/index.ts`; extended the existing barrel-only `widgets/index.test.ts` with a spinner case. Ran the skill's step-0 name check and its `## Verify` greps. 11/11 tests, typecheck clean | **yes** — same file layout, same factory name, same `??` defaulting, same `register()` placement, same barrel wiring, and it also extended `widgets/index.test.ts` rather than creating a duplicate. Ran a baseline test before editing and `npm test && npm run typecheck && npm run build` after. 9/9 tests, typecheck clean |
| Discrepancies | `spinner.ts` is **byte-identical** between the two tools — `md5 55254555e8c94d1f1c753b155834d986`. So is `widgets/index.ts`. The only differences are in test breadth and fixture strings: Claude Code wrote 4 cases (default + all three sizes), Copilot wrote 2 (default + `lg`); the barrel test differs only in the label string (`"Loading"` vs `"Hi"`). Both satisfy the skill's stated rule — "the default branch and at least one explicit variant of every optional prop" — Claude Code simply over-delivered. No structural discrepancy at all | |

### The finding the table does not capture: the two tools read different directories

This repo keeps skills in `.agents/skills/` and mirrors them at `.claude/skills`
(a symlink, per `.gitignore:35-42`). Both paths resolve to the same files, so "it
works in both tools" does not reveal *which* convention each tool honours. Moving
only the mirror aside answers it:

```bash
mv .claude/skills /tmp/taske-mirror
claude -p "List every skill available to you, one per line."   # → none of the three
copilot skill list                                             # → all three, unchanged
mv /tmp/taske-mirror .claude/skills
```

- **Copilot CLI reads `.agents/skills/` natively.** Its `skill --help` documents
  project discovery from `.github/skills/`, `.agents/skills/`, **or**
  `.claude/skills/`, and removing the mirror changed nothing.
- **Claude Code does not.** With the mirror gone it discovered **zero** project
  skills, even though `.agents/skills/` was untouched and intact.

So the mirror is not decorative — it is load-bearing for Claude Code, and it is the
only reason this repo is cross-tool at all.

### Conclusion

The skill is genuinely portable **as a file**: the same `SKILL.md`, unmodified, was
discovered and used by two independently built tools, and produced byte-identical
production code in both. Zero tool-specific tweaks were needed to the skill's
content, frontmatter, or instructions.

Portability of the **directory convention** is a different matter, and this is where
the real work is. Claude Code found nothing in `.agents/skills/`; Copilot found
everything. The repo only works in both because it maintains a symlink bridging the
two layouts. A skill author shipping to multiple tools has to solve placement, not
authoring.

One asymmetry worth naming: evidence quality differed. Claude Code's `stream-json`
gives a machine-readable tool-call record proving the `Skill` tool fired. Copilot has
no equivalent, so its evidence is its own narration (`● skill(creating-widget)`) plus
`copilot skill list`. Both are convincing here, but they are not the same standard of
proof. Copilot also reported cost directly — 9.86 AI credits, 139.8k input tokens
(126.5k cached) — which Claude Code does not surface in `-p` output.

---

## Path 2 — install a community skill

**Skill installed:** `doc-coauthoring` — https://github.com/anthropics/skills,
`skills/doc-coauthoring/SKILL.md`, pinned at commit `f17010c9bb48` (2026-08-07).
One file, 15,815 bytes. Installed to `.agents/skills/doc-coauthoring/` and verified
byte-identical to upstream:

```bash
git hash-object .agents/skills/doc-coauthoring/SKILL.md
# a5a69839ef4a161131d80b6daef10037a9686f4a  — matches the upstream blob SHA
```

Chosen after sizing all 17 skills in that repo (they run 13 KB → 5.5 MB;
`skill-creator` is 225 KB/18 files, `canvas-design` 5.5 MB/83 files). It is the
smallest vendored diff of any plausible candidate and the best genuine fit — this
repo's deliverables *are* documents. Both tools picked it up immediately: `claude -p
"list skills"` and `copilot skill list` each report four project skills.

It is third-party and **not** one of Tasks A–C. See
`.agents/skills/doc-coauthoring/PROVENANCE.md`.

### What it did when invoked

The skill is a three-stage workflow: Context Gathering → Refinement & Structure →
**Reader Testing**. It was invoked for Stage 3 alone, against the finished
`docs/ab-validation.md` — a real target, and one where a bad result costs nothing
because the stage mutates nothing by default.

It predicted ten questions a reader would ask, then checked for ambiguity, false
assumptions and contradictions. It found **one real defect**, not just style notes:

> `docs/ab-validation.md` conflates two different "Run A"s. Its *Result A* section
> describes `alert.test.ts` with **five** cases (default, all three tones, plus an
> empty-message case). Its *Kept change* section says A's output is what was kept in
> the real `app/src`. The file actually in the repo has **three** cases — it comes
> from the earlier in-repo A/B arm, not from the prepared-app Result A the document
> describes. The document never distinguishes the two.

Verified directly:

| | cases in `alert.test.ts` |
|---|---|
| Result A, prepared app | 5 |
| kept in the real repo | 3 |

It also surfaced an unaddressed contradiction — the frozen prompt says "mirror the
`badge` widget's tone handling" while the preparation section removes `badge`, two
facts stated pages apart and never reconciled — plus two undefined terms used
throughout ("barrel" 12 times, "golden path" 4 times, neither defined in that
document), and a reproducibility gap (the setup commands cite `/tmp/ws05-ab` without
saying it is scratch and now deleted).

### Fixes applied

All seven findings were fixed in `docs/ab-validation.md`:

| Finding | Fix |
|---|---|
| Two different "Run A"s conflated | The claim lived entirely in a *Kept change* section, which was then dropped as out of scope for the deliverable — removing the false statement at its source rather than annotating it. The template does not ask which change was kept |
| Reader cannot count the runs | New **Terms, and which runs this reports** section with a table labelling the in-repo A/B, the prepared-app A/B, and the one discarded run, and a rule that unqualified "Run A" means the prepared-app one |
| `badge` cited by a prompt that removed it | Explicit paragraph in *The prompt* explaining why the dangling reference was left byte-identical: the tone spec is stated in the same sentence, it dangles equally in both runs, and editing it would break comparability |
| Both "6/6" figures ambiguous | Noted as coincidental — 5 alert + 1 barrel in the prepared app vs 3 alert + 2 badge + 1 barrel in the repo |
| "barrel", "golden path" undefined | Both defined at the top |
| "seven counts" vs ten differing table rows | Reworded to "seven points of code shape", with a note that the other three rows are process and test strategy |
| `/tmp/ws05-ab` reproducibility | Marked ephemeral and deleted; reproduction means re-running the commands |

A trim pass afterwards also removed an API-error aside from Result B — a transport
failure during one run, irrelevant to whether the skill changed behaviour.

Verified afterwards: no reference to the removed sections survives anywhere in
`docs/ab-validation.md`, and its remaining structure matches
`docs/templates/ab-validation.md` — header, Result A, Result B, difference table,
conclusion.

### Adaptations needed

Two, and they are the interesting part:

1. **It assumes an interactive session.** The skill is written to "act as an active
   guide" that interviews the user across three stages. A headless `claude -p`
   one-shot cannot do that, so unlike Path 1 this invocation had to run in the
   interactive session. Its Stages 1 and 2 were skipped entirely as inapplicable —
   the document already existed.
2. **Its Stage 3 branches on sub-agent availability, and both branches were
   unusable as written.** The sub-agent branch was closed by a standing instruction
   in this project not to spawn agents unrequested. The fallback branch assumes the
   claude.ai web interface and delegates the testing to the human ("open a fresh
   Claude conversation, paste the document"). Neither fit Claude Code with agents
   disallowed, so Steps 1 and 3 were performed in-session.

That second adaptation degrades the result, and the write-up should not pretend
otherwise: the skill's entire premise for Stage 3 is *a fresh reader with no context
bleed*, and the reader here was the same session that wrote the document. The defect
it found is real and verified, but a genuinely uninformed reader would likely have
found more.

### Conclusion

Usable as-is in the mechanical sense — dropped in, discovered by two tools, no edits
to its content — but not usable as designed, because its most valuable stage depends
on an execution environment it cannot always get, and its fallback hands the work
back to the human.

Two lessons for writing our own skills. First, **shape follows job**:
`doc-coauthoring` is *procedural* (15.8 KB of staged workflow that interviews you)
where our `creating-widget` is *prescriptive* (a code template plus copy-pasteable
verification commands). The prescriptive shape survived a headless one-shot in two
different tools; the procedural one needed a human in the loop. If a skill must work
unattended, encode artifacts and checks, not conversation.

Second, and more concretely: **it shipped with no licence and no provenance.**
Sibling skills in the same repo each vendor an Apache-2.0 `LICENSE.txt`;
`doc-coauthoring` has none, and the repo has no root licence either. Anyone
vendoring it has to guess. That cost us a hand-written `PROVENANCE.md`, and it is
the cheapest possible thing for a skill author to get right — worth copying as a
habit into our own three.
