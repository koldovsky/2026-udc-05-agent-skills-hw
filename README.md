# UDC Workshop 5 — Homework (Agent Skills)

Starter repo for the fifth homework of the UDC "Modern Development with Agentic
AI" course.

> Workshop 5: **Agent Skills**
> Автор: В'ячеслав Колдовський (Programming Mentor)

You build a small **skill library** (`.agents/skills/`) for a tiny widget-
registry TypeScript library: a simple instructions-only skill, a skill with a
`references/` deep-dive, and a skill with a `scripts/` bundle-size analyzer —
then prove with an A/B test that a skill actually changes AI behaviour.
~2–2.5 hours.

## Quick start

```bash
gh repo fork koldovsky/2026-udc-05-agent-skills-hw --clone
cd 2026-udc-05-agent-skills-hw
git checkout -b ws05/<github-username>
cd app && npm install && npm test && cd ..
# follow docs/walkthrough.md
gh pr create --title "WS5: <your name>" --fill
```

Full step-by-step instructions: [`docs/walkthrough.md`](docs/walkthrough.md).

## What's in here

| Path | Purpose |
|---|---|
| `docs/walkthrough.md` | Step-by-step: setup, Tasks A–E, Definition of Done |
| `app/` | A tiny widget-registry TS library — the code your skills document/automate |
| `app/src/core/registry.ts` | The shared contract every widget depends on |
| `app/src/widgets/badge/` | The one seeded widget — the pattern to encode as a skill |
| `app/AGENTS.md` | A reasonably complete baseline — Task A appends a "## Skills" section |
| `materials/architecture-brief.md` | Source of truth for what your skills should document |
| `materials/ab-task.md` | The change request for the A/B validation (Task D) |
| `docs/templates/` | Fill-in skeletons: `SKILL-template.md`, `reference-template.md`, `script-template.mjs`, `ab-validation.md`, `task-e-bonus.md` |
| `.github/pull_request_template.md` | PR checklist (auto-applied) |
| `.coderabbit.yaml` | CodeRabbit auto-review tuned to this homework's DoD |
| `AGENTS.md` (repo root) | Baseline guidance for your Agentic IDE working in this repo |

You create: `.agents/skills/creating-widget/SKILL.md`, `.agents/skills/
architecture-deep-dive/SKILL.md` + `references/`, `.agents/skills/analyzing-
bundle-size/SKILL.md` + `scripts/`, an updated `app/AGENTS.md`, `docs/ab-
validation.md`, and (bonus) `docs/task-e-bonus.md`.

## Tools

An Agentic IDE with Agent Skills support (Claude Code, Cursor, GitHub Copilot,
and most current tools support the open `SKILL.md` standard — check
`docs/walkthrough.md` §0 if unsure) + a GitHub account + Node 22+. Questions →
the course chat (feedback within 2 weeks).

