# Round 3 evidence — model-routing A/B (2026-08-22)

Verbatim-identical prompt in all three fresh agent contexts: assign a specific
Claude model (exact ID + fallback) to three tasks — (1) add a `toast` widget,
(2) explain the architecture / place a "theming" feature, (3) measure bundle
size + delta — then disclose sources and guidance-vs-judgment per choice.
No hints about skills or models were given in the prompt. Condensed from each
agent's final report; wording preserved where quoted.

## Run A — skills present

| Task | Assigned | Fallback chain | Source claimed |
|---|---|---|---|
| toast widget | `claude-haiku-4-5` | `claude-sonnet-5` → `claude-sonnet-4-6` | `creating-widget` SKILL.md frontmatter + ladder ("the expertise lives in the skill, not the model") |
| architecture/theming | `claude-fable-5` | `claude-opus-5` → `claude-opus-4-8` | `architecture-deep-dive` SKILL.md |
| bundle size | `claude-sonnet-5` | `claude-sonnet-4-6`; step-up/step-down rule quoted | `analyzing-bundle-size` SKILL.md |

Attribution: "Every primary model ID and fallback came verbatim from the
project's own skill files; I did not need to invent any recommendation." Own
judgment only for task→skill mapping, a Fable-5 pricing/retention caveat, and
Sonnet-5-over-4.6 ordering.

## Run B — skill folders moved out of the repo (git history intact)

Identical assignments and ladders to run A. **Methodology finding:** the agent
noticed `.agents/skills/` was empty in the working tree, and **recovered all
three SKILL.md files from git history** (`git show HEAD:...`), then followed
them — even helpfully suggesting `git checkout -- .agents .claude` to restore
the "deleted" files. Once skills are committed, moving the folder out of the
working tree no longer removes the skill from a resourceful agent: the
walkthrough's folder-move disabling technique is only valid while skills are
uncommitted (as they were in rounds 1–2's baseline).

## Run B′ — clean room: repo copy with no `.git` and no skill folders

`app/AGENTS.md` retained (per the walkthrough's methodology of removing only
skill folders). Assignments: same three tiers, exact IDs self-supplied.

- Tier choices attributed to `app/AGENTS.md` "## Skills" — its one-line tier
  summary ("cheap/fast (Haiku)… mid-tier (Sonnet)… highest capability
  (Fable/Opus)") was called "**the decisive source**".
- Exact IDs, pricing, and fallback ordering came from the agent's own
  reference material (the bundled claude-api model catalog), not the project —
  the full ladders and the step-up/step-down rule were absent.
- **Counterfactual, disclosed unprompted:** "my unaided instinct would have
  swapped tasks 1 and 3 (Sonnet for the coding task, Haiku for the mechanical
  measurement); the project's mapping overrides that, and I followed the
  project." — i.e. with *no* project guidance at all, the routing would have
  been wrong per the project's intent.

## Verdict

Skills pick the correct models (run A, full ladders, verbatim). The routing
survives even aggressive removal because the guidance is layered
(skills → AGENTS.md summary → git history). The skills' marginal value over
the AGENTS.md line alone: machine-readable `model:` frontmatter, exact IDs,
complete fallback chains, and per-task step-up/step-down rules. The
demonstrated behavioral delta vs. *no* guidance: the agent's default instinct
mis-tiers the widget task vs. the measurement task.