# AGENTS.md

Baseline guidance for an Agentic IDE working in **this homework repo**.

> UDC Workshop 5 homework — Agent Skills. Participants build a 3-skill
> library (`.agents/skills/`) for the seeded widget-registry app, extend
> `app/AGENTS.md` with a "## Skills" section, and prove a skill changes AI
> behaviour with an A/B test. See `docs/walkthrough.md`.

## Context

- `app/` is a tiny TS **widget-registry library**. It is the code
  participants write skills about. Key files:
  - `app/src/core/registry.ts` — `register`/`create`/`listWidgets` — the
    shared contract (PROTECTED public API — do not change its signatures).
  - `app/src/widgets/badge/` — the one seeded widget; the pattern every new
    widget (and the `creating-widget` skill) should follow.
  - `app/src/index.ts` — bundle entry point for `npm run build` (esbuild).
  - Tests are colocated `*.test.ts` (vitest); `cd app && npm test` is green.
- `app/AGENTS.md` (a DIFFERENT file, nested inside `app/`) is already a
  reasonably complete baseline — Task A's job is to APPEND a "## Skills"
  section to it, not rewrite the rest.
- `materials/architecture-brief.md` is the source of truth for what the
  skills should document; `materials/ab-task.md` is the change request used
  for the A/B validation (Task D).
- **Answering a question about `app/`'s architecture — how the registry works,
  why it is built this way, where a new feature belongs — starts at
  `.agents/skills/architecture-deep-dive/SKILL.md`, not at the brief.** The
  brief states the *intended* design; the skill's `references/architecture.md`
  is checked against the current code and carries what the brief omits (the
  type-erasure boundary, the escaping contract, the tree-shaking cost).
- The homework is graded by CodeRabbit (`.coderabbit.yaml`) against the
  Definition of Done in `docs/walkthrough.md`.

## Conventions

- Keep deliverables at the agreed paths so auto-review can find them:
  - `.agents/skills/creating-widget/SKILL.md` — Task A (simple skill)
  - `.agents/skills/architecture-deep-dive/SKILL.md` +
    `references/architecture.md` — Task B (skill with references/)
  - `.agents/skills/analyzing-bundle-size/SKILL.md` + `scripts/*` — Task C
    (skill with scripts/)
  - `app/AGENTS.md` — gets a "## Skills" section (Task A)
  - `docs/task-a-verification.md` — Task A step-5 check (skill triggers unprompted)
  - `docs/ab-validation.md` — Task D A/B write-up (its harness and grader live
    in `docs/task-d/`; they only ever read this repo and write to a scratch lab
    directory outside it). Every figure in the write-up is a line in
    `docs/task-d/results/` — grader output committed verbatim, so a reviewer
    checks the numbers without re-running 17 sessions.
  - `docs/task-e-bonus.md` — Task E (bonus, path 1: cross-tool portability). Its
    harness, spec linter and grader live in `docs/task-e/`; the grader imports
    Task D's rubric instead of restating it, and `docs/task-e/results/` is its
    output committed verbatim.
  - `.claude/skills/creating-widget/` — cross-tool mirror (Task E, path 1): the
    **same bytes** as `.agents/skills/creating-widget/`. Cursor reads
    `.agents/skills/`; Claude Code reads `.claude/skills/` and does not scan
    `.agents/`. Edit one copy → copy it to the other in the same commit.
- Every `SKILL.md` needs YAML frontmatter with at least `name` and
  `description` — that's the part every current tool reads before deciding
  whether to load the rest (progressive disclosure).

## Guardrails

- **NEVER** commit secrets, API keys, or `.env` files. They are gitignored —
  keep it that way.
- **NEVER** add real client/NDA-protected business details — `app/` and
  `materials/` contain only synthetic, generic sample data on purpose.
- A skill's `scripts/` must not run destructive commands (no `rm -rf`, no
  network calls, no writing outside `app/`) — it should wrap the project's
  own `npm` scripts, nothing more.
- Do not change the public signatures of `register`/`create`/`listWidgets` in
  `app/src/core/registry.ts`.
- **Windows + Git Bash:** never use `2>nul` / `>nul` (creates a literal `nul`
  file). Use `2>/dev/null` / `>/dev/null`. `nul` is gitignored as a net.

## How to verify

Before opening a PR: `cd app && npm test` is green, all three
`.agents/skills/**/SKILL.md` have real frontmatter + concrete instructions
(not the raw template), `app/AGENTS.md` has a "## Skills" section, and
`docs/ab-validation.md` shows a real, specific difference (not placeholders).

`python3 docs/task-e/portlint.py` checks every `SKILL.md` against the published
[Agent Skills spec](https://agentskills.io/specification) — frontmatter fields,
`name`/description limits, `name` == directory — and hashes the two copies of
`creating-widget` against each other. Exit 1 = a spec violation or drifted
mirror; run it after touching any skill.
