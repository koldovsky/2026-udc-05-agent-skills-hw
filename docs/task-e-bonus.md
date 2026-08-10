# Task E (bonus) — Path 1: cross-tool portability check

**Skill under test:** `creating-widget`, unmodified — `sha256 be7857996b82…` in
both locations ([`results/identity.txt`](./task-e/results/identity.txt)).
**Prompt (identical in every session):** the change request from
[`materials/ab-task.md`](../materials/ab-task.md) — the same one Task D used,
extracted programmatically, never retyped. The 15 **widget-task** sessions here
(3 rungs × 5 trials) are therefore directly comparable with that experiment's 17;
the 3 discovery probes below use a different prompt and are counted separately.
**Tool:** Claude Code 2.1.226, headless (`claude -p`), fresh session per run,
allowlist `Read Write Edit Glob Grep Bash TodoWrite Skill`.
**Date:** 2026-08-09 · Node v26.0.0 · **18 sessions total** — 15 widget-task
(3 rungs × 5 trials) + 3 discovery probes
**Reproduce:**

```bash
bash docs/task-e/portability-harness.sh setup
bash docs/task-e/portability-harness.sh probe        # discovery, 1 session per rung
bash docs/task-e/portability-harness.sh run          # the widget task, trial 1
bash docs/task-e/portability-harness.sh trials 5     # trials 2..5
LAB=… python3 docs/task-e/grade.py probe|trials|pertrial|stats|trace
python3 docs/task-e/portlint.py                      # spec conformance + mirror drift
```

Every number below is a line in [`docs/task-e/results/`](./task-e/results/) —
grader output committed verbatim, not retyped.

## What the check had to answer

"Copy the folder, ask the same thing, did it work?" cannot fail: `SKILL.md` is
markdown, and any agent that reads the file will follow it. The question that can
fail is **discovery** — whether the second tool's *loader* ever hands the skill to
the model without someone pointing at it. So the check is split in three:

| | Question | Method |
|---|---|---|
| **Discovery** | does the tool know the skill exists before touching the filesystem? | probe session, no file access, scored from the trace |
| **Behaviour** | do the same bytes produce the same work through a different loader? | 3-rung ladder × 5 trials, Task D's rubric |
| **Validity** | would these bytes still be *legal* elsewhere (claude.ai, Skills API, Cursor)? | [`portlint.py`](./task-e/portlint.py) against the published spec |

### The loader map, and why this repo has a hole in it

| Tool | Reads project skills from | `creating-widget` visible? |
|---|---|---|
| Cursor | `.agents/skills/`, `.cursor/skills/`, plus `.claude/skills/` and `.codex/skills/` for compatibility | yes, before this task |
| Claude Code | `.claude/skills/` (start dir + parents), `~/.claude/skills/`, plugins, `--add-dir` — **it does not scan `.agents/`** | **no**, before this task |

Both tools implement the same [Agent Skills spec](https://agentskills.io/specification)
— identical file format, different search paths. The homework's canonical path,
`.agents/skills/`, is the one Claude Code does not look in. Task D's rung A read
`SKILL.md` in 5 of 5 sessions anyway, which quietly hid this: it was reading the
file because `AGENTS.md` names it, not because anything loaded it.

Path 1 is therefore a one-line change with a measurable consequence: the same
folder, copied to `.claude/skills/creating-widget/`, byte for byte.

## The ladder — one skill file, three ways of reaching it

| Rung | Layout | Discovery route |
|---|---|---|
| **P** | `.agents/skills/creating-widget/`, every prose pointer intact | prose only — the agent must read `AGENTS.md` and go looking (= Task D rung A) |
| **N** | `.claude/skills/creating-widget/`, **every prose pointer scrubbed** | native loader only — no file in the repo mentions the skill |
| **Z** | skill in neither location, pointers scrubbed | none — the floor N is measured against |

P and N differ in two ways at once (path *and* pointer) deliberately: each rung is
one tool's real convention as that tool ships it, not a lab-only hybrid. Z isolates
the half that matters — **N minus Z is what the loader buys with zero prose help.**
Scrubbing on N and Z is the same code Task D used for its rung C. Each rung is a
full copy of the repo in its own git repo whose `HEAD` is the ablated baseline; the
working repo was only ever read. This write-up, its results and Task D's are
stripped from every rung.

## Result 1 — discovery ([`results/probe.txt`](./task-e/results/probe.txt))

The probe forbids reading, listing and searching files, then asks what the session
already has, and to invoke a widget skill if one is there. Scored from the trace.

| | `Skill` tool call | tool calls in trace | what the session said |
|---|---|---|---|
| **P** — skill at `.agents/skills/` | **no** | none | *"**No skill covers "add new widget to this repo."** Nothing widget-, component-, or scaffold-shaped in list."* |
| **N** — same bytes at `.claude/skills/` | **yes** | `['Skill']` | *"Skill loaded."* — then recited the three-file golden path from memory of the loaded file |
| **Z** — control | no | none | listed only built-in and user-level skills |

P is the finding. The file is *right there* on disk in rung P, complete and valid,
and the tool does not know it exists. P's own caveat, unprompted, states the
mechanism exactly: *"repo may define widget skill that not loaded this session."*

Same thing happened live, outside the lab: the moment the `.claude/` copy landed in
the working repo, this session's own skill list gained `creating-widget` — the
loader picked it up mid-session, no restart, from bytes that had been in
`.agents/skills/` untouched for two commits.

## Result 2 — behaviour ([`results/trials.txt`](./task-e/results/trials.txt), [`stats.txt`](./task-e/results/stats.txt))

Task D's 13 per-trial checks, imported not restated
([`grade.py`](./task-e/grade.py) calls `docs/task-d/grade.py`): **13/13 in all 15
sessions, every rung** ([`results/pertrial.txt`](./task-e/results/pertrial.txt)).
As in Task D, the artefact is not where the rungs differ:

| | P (prose pointer) | N (native loader) | Z (no skill) |
|---|---|---|---|
| reached the skill | **5/5** — via `Read` | **5/5** — via `Skill` | 0/5 |
| ran `## Verify` (Task D's `export NAME=alert` fingerprint) | 5/5 | 4/5 | 0/5 |
| …counting one inline `NAME=alert … node -e` variant | 5/5 | **5/5** | 0/5 |
| built the bundle and called `create("alert", …)` | 5/5 | 5/5 | **1/5** |
| 13/13 rubric | 5/5 | 5/5 | 5/5 |
| `alert.ts` raw bytes | `sha256 77c0bc63ca7a…` | `77c0bc63ca7a…` | `77c0bc63ca7a…` |
| median turns / seconds | 17 / 55 | **14 / 36** | 16 / 53 |

Fisher exact, two-sided, on the pre-specified behaviour rows: **N vs Z p = 0.0079**
(verify block), **N vs P p = 1.0000** — the two loaders are statistically
indistinguishable in what they produce, and both are separated from the floor.
That is the portability claim, stated as a null result where a null result is the
good outcome: *the loader changed, the behaviour did not.*

`alert.ts` came out byte-identical in all 15 sessions — and it is the **same
`sha256 77c0bc63ca7a…`** as all 17 sessions of Task D. Thirty-two sessions, five
repo configurations, two discovery mechanisms, one file.

### The native path is also cheaper

| | turns | seconds |
|---|---|---|
| N | 12, 13, 14, 14, 16 | 35, 36, 36, 37, 54 |
| P | 14, 17, 17, 18, 18 | 50, 53, 55, 56, 60 |

Exact Mann-Whitney U, two-sided: **U = 2.0, p = 0.0317** on turns and on seconds
(two tests on the same 10 sessions, uncorrected). The traces show where the three
turns go. N reaches the skill at tool call **1 in 4 of 5 sessions** (call 3 in the
fifth) — before, or almost before, touching a file. P reaches it at call **9, 10,
11, 3, 11** — median 10, after an `ls -R`, five `Read`s and a second `ls -a …
.agents` to go looking:

```text
runP_t1  (16 calls)                       runN_t1  (10 calls)
  1 Bash   ls -R <repo> | head -60          1 Skill  creating-widget    <- first call
  2 Read   AGENTS.md                        2 Bash   ls app/src/widgets/
  3 Read   app/src/widgets/badge/badge.ts   3 Read   badge.ts
  4 Read   badge.test.ts                    4 Read   index.ts
  5 Read   app/src/widgets/index.ts         5 Read   badge.test.ts
  6 Read   app/src/core/registry.ts         6 Write  app/src/widgets/alert/alert.ts
  7 Read   app/src/index.ts                 7 Write  app/src/widgets/alert/alert.test.ts
  8 Bash   ls -a <repo>; ls -R .agents      8 Edit   app/src/widgets/index.ts
  9 Read   .agents/skills/creating-widget/  9 Bash   npm test … npm run typecheck
           SKILL.md          <- call 9     10 Bash   export NAME=alert … dist/bundle.js
```

Progressive disclosure is doing exactly what it advertises: N spends ~100 tokens of
metadata at startup and one call to open the file, while P pays a search tax on
every session to rediscover a file whose location never changes. The seconds carry
the usual caveat — rungs run concurrently over one `node_modules`, so treat turns as
the load-independent number.

## Result 3 — validity ([`results/portlint.txt`](./task-e/results/portlint.txt))

Discovery and behaviour say nothing about whether the bytes are *legal* on paths
that validate strictly (claude.ai upload, the Skills API, `package_skill.py`,
Cursor). [`portlint.py`](./task-e/portlint.py) checks all four skill directories
against the published spec: `name` 1–64 chars, `[a-z0-9-]`, no leading/trailing or
doubled hyphen, **matching the parent directory**; `description` 1–1024, non-empty;
only the six spec fields, because anything else is a hard error off Claude Code
(`Unexpected key(s) in SKILL.md frontmatter: …`). Plus portability hazards
(absolute paths, `~/`, `${CLAUDE_*}` substitutions, dangling `references/` links)
and a byte-hash of the two mirrors.

**`PASS: 0 spec violation(s)`** across all four directories. The library uses only
`name` + `description`, so nothing here needs adapting for any tool. Two things the
linter flags that the eye misses:

- **`NOTE 8 path(s) outside the skill dir`** — `app/AGENTS.md`, `app/src/core/registry.ts`,
  `app/src/widgets/badge/`, … `creating-widget` is portable *as a file* and
  **coupled to this repo as a skill**. Copy it into a different project and the
  frontmatter still validates while the instructions describe files that do not
  exist. Cross-tool ≠ cross-repo, and only the first is what Path 1 tests.
- **`mirror creating-widget: … feb974882484 | … feb974882484 IDENTICAL`** — the
  cost of Path 1 is a second copy that can drift silently. That is now a check with
  an exit code, wired into `AGENTS.md`'s verify list, not a promise to be careful.

⚠️ **The `PASS` above is from the second version of the linter.** The first read
frontmatter with a hand-rolled `key: value` parser, which is exactly the leniency
Claude Code has and the strict paths do not — and it was hiding a real defect:
`architecture-deep-dive`'s `description` contained `structure: architecture
overviews`, and an unquoted YAML scalar may not contain `: `. PyYAML rejects that
file outright (`mapping values are not allowed here`), so the skill would have
failed on upload while linting clean here. `portlint.py` now parses with PyYAML
when it is installed and with a strict built-in reader (duplicate keys, `: ` in
unquoted scalars, malformed lines → `FAIL`) when it is not; both agree on all four
directories. The description was reworded to use an em dash, and the run above is
the re-run after that fix.

## The template's table, filled

| | Tool 1 — `.agents/skills/` (Cursor's path) | Tool 2 — `.claude/skills/` (Claude Code's path) |
|---|---|---|
| Skill discovered/loaded? | **not by Claude Code** — 0/1 probe, 0 `Skill` calls in 5 trials; reached only because `AGENTS.md` names it (5/5 `Read`) | **yes** — `Skill` call in 1/1 probe and 5/5 trials (tool call 1 in four of them, call 3 in the fifth), with every prose pointer removed |
| Followed the golden path? | yes — 13/13 rubric ×5, `## Verify` run 5/5 | yes — 13/13 rubric ×5, `## Verify` run 5/5 (4/5 with Task D's exact fingerprint) |
| Discrepancies | needs the pointer, and pays ~3 turns / ~19 s per session to find the file | one session ran the verify commands inline instead of `export`-first; no difference in result |

**Conclusion:** the skill is portable; the **path** is not. Zero bytes changed —
`sha256 be7857996b82…` in both locations, `PASS` on the spec linter, statistically
indistinguishable behaviour (Fisher p = 1.0000, N vs P) — but the same file is
invisible to Claude Code's loader at `.agents/skills/` and native at
`.claude/skills/`. Portability across tools is a property of *file format*, which
this ecosystem has already solved; what does not port is *where each tool looks*,
and the fix is a copy, not an edit.

## What I would take from this into the next skill

1. **Ship the skill to every loader your team actually uses, and hash the copies.**
   A skill nobody's tool loads is a document, and documents get read only when
   someone remembers to point at them.
2. **A prose pointer is a working fallback, not a substitute.** P did the job in
   5/5 — the pointer is why Task D's rung A worked at all — but it costs a search
   every session and depends on a human keeping `AGENTS.md` accurate. Task D
   already showed the other failure mode: remove the skill, leave the bullet, and
   every session goes hunting for a directory that is not there.
3. **`description` is the only thing that runs at startup.** In rung N the loader
   matched the request against 283 characters of description and nothing else. The
   body could be perfect and never open. That is where scope belongs — ours starts
   with the trigger and ends with the anti-trigger ("not for edits to an existing
   widget"), and N never mis-fired.
4. **Portable format, coupled content.** The frontmatter travels anywhere; the
   eight `app/…` paths in the body do not. A skill meant to be reused across repos
   should say what to look for, not where it lives.

## Honest notes on the run

- **The Cursor row of the loader map is documentation, not measurement.** No Cursor
  CLI is installed on this machine, so nothing here was executed in Cursor; that row
  comes from its published skills docs. What is measured is the Claude Code side of
  the same bytes, where the asymmetry actually bites — and both rungs run against
  one file with one hash, so the discovery result does not depend on the Cursor row
  being right.
- **`Skill` was added to the allowlist on every rung**, including Z, where it is
  unused. Task D's runs did not have it. Rung N cannot express itself without the
  tool, and giving it to all three keeps the allowlist from becoming the difference.
  It is the only deviation from Task D's protocol.
- **`verify_loose` was added after seeing N_t2**, which ran the `## Verify` commands
  with an inline `NAME=alert PROPS=… node -e` instead of `export`-first. Task D's
  strict fingerprint is still reported and is still the pre-registered one; the
  loose count sits next to it, never instead of it.
- **Z_t2 built the bundle and called `create()`** unprompted — 1/5, against 0/12 on
  every skill-less rung in Task D. The floor is not exactly zero; it is low. The
  N-vs-Z gap (p = 0.0476 on that row) rests on 5/5 against 1/5, and is stated that way.
- Probes are n=1 per rung. They are a discovery check with a binary trace outcome
  (`Skill` call present or absent), not a behavioural measurement.
- User-level Claude Code configuration (settings, plugins) was live and identical
  across rungs — visible in the probe answers, which list user-level skills and, in
  probeP, offer to configure a plugin statusline. It cannot explain a P-vs-N
  difference, but the absolute turn and second medians are environment specific.
- Waves run the three rungs concurrently over one shared `node_modules` symlink, so
  every second was measured under equal contention. The turn counts are the
  load-independent number.
- Nothing failed on an API/session limit in this experiment; the harness's
  `FAILED_<tag>.txt` path was never taken.

## Repo state

The deliverable of Path 1 is one directory: `.claude/skills/creating-widget/`,
byte-identical to `.agents/skills/creating-widget/`, plus the drift check in
`portlint.py` and the note in `app/AGENTS.md` that both copies are one skill. No
source file changed; every session ran in an isolated copy under a scratch lab
directory and the working repo was only read. No `alert` widget is committed —
`app/src/widgets/` still holds `badge` and `spinner`. `cd app && npm test` →
**6 passed**; `python3 docs/task-e/portlint.py` → `PASS: 0 spec violation(s)`.
