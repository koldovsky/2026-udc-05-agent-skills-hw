# Task B — verifying the `architecture-deep-dive` skill

Fresh chat, five-word prompt `explain architecture of this project`, no mention
of `app/`, `register()`/`create()`, `references/`, or `SKILL.md`.

Claude Code (Opus 5) · 2026-08-10 · `ws05/FeschenkoNatalia`

## Precondition

Same as [Task A](./task-a-verification.md#precondition), plus the skill's
`references/` directory — both must be mirrored into `.claude/skills/`.

## Result: triggered, reference loaded, answer grounded

The skill was invoked after repo orientation (root `AGENTS.md` + file listing)
but **before any `app/src` file was read** — the frontmatter `description` was
what selected it. Five signals show the answer came from the skill, not from
general registry-pattern knowledge:

- `references/architecture.md` was read before answering — the progressive
  disclosure step `SKILL.md` demands, and the reference is where the non-obvious
  content lives
- The answer led with **import-time registration** and its failure mode (green
  tests + missing `index.ts` line = `Unknown widget` at runtime) — reference-only
- The **type-safety split** was stated correctly: checked at the factory
  definition (`extends WidgetProps`, the TS2345 trap), *not* at `create()`, whose
  `Record<string, unknown>` accepts `{ labl: "typo" }` — the detail a generic
  answer gets wrong
- The `## Verify` ground-truth command was run rather than assumed (see below)
- Gaps were **named, not designed around**: no lifecycle, async, or cross-render
  state; no lint step. That is an explicit skill instruction

## Verification — commands actually run

| Command                                 | Result                                               |
|-----------------------------------------|------------------------------------------------------|
| `npm run build`                         | `dist/bundle.js — 564 bytes`                         |
| `node -e "import('./dist/bundle.js')…"` | `[ 'create', 'listWidgets' ] [ 'badge', 'spinner' ]` |

That second line is the skill's ground truth for two separate claims: the public
surface is exactly `create` + `listWidgets` (`register` is deliberately absent,
so consumers cannot register from outside), and both widgets really ship. Neither
`npm test` nor `npm run typecheck` can confirm either — both operate on files,
not on the assembled module graph.

> **Numbers are as of this run** (`badge` + `spinner`). Task D later added
> `alert`, and a later pass introduced HTML escaping, so the bundle is now
> 937 B and `listWidgets()` returns `[ 'badge', 'spinner', 'alert' ]`. The
> exported surface is unchanged. Left as recorded — this document reports what
> the run saw.

## Drift check

`SKILL.md` says the code wins where it disagrees with the reference. Checked the
reference's copied signatures against `app/src/core/registry.ts`,
`app/src/widgets/index.ts`, and `app/src/index.ts`: **no drift** — signatures,
the duplicate-`register` throw, the `Unknown widget "x". Registered: …` string,
and the four-layer import table all matched the tree.

## Conclusion

A five-word prompt with no domain vocabulary loaded the right skill, pulled its
`references/` file, and produced an answer whose every structural claim traces to
a file or a command output. The two-level structure earned its keep: `SKILL.md`
alone would not have carried the type-safety split or the import-time hazard, and
neither would have survived being inlined into a description.
