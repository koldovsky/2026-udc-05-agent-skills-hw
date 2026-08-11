---
name: architecture-deep-dive
description: The design/architecture of the widget-registry library in app/ — the register/create contract, the module boundaries, and the limits of its type safety. Use for structural questions — how the project works, where new code belongs, whether changing core/registry.ts is safe, or why a widget with green tests throws "Unknown widget". Not for scaffolding a widget; that's creating-widget.
---

# Architecture deep dive

## When to use this

Design questions about `app/`. Most arrive without the word "architecture":

- "How does this project work?" — onboarding, or reviewing a structural change
- "Where do I put a helper two widgets need?" — placement, at any layer
- "Can I add a parameter to `register()`?" — blast radius of a contract change
- "Tests pass, so why does `create("alert")` throw `Unknown widget`?"
- "Why didn't TypeScript catch my typo in the props I passed to `create`?"

Route elsewhere when the question is procedural rather than structural:

| Request | Skill |
|---|---|
| Add or scaffold a widget | `creating-widget` |
| What the bundle weighs, or the cost of a change | `analyzing-bundle-size` |
| Change one widget's markup or props | neither — edit its two files |

The split is design vs. procedure: this skill explains why the pattern is shaped
the way it is, `creating-widget` walks the steps. A question that is really "how
do I build X here" wants that one, even when phrased as "how does X work".

## Instructions

**Read `references/architecture.md` before answering.** A generic
registry-pattern answer from memory is plausible and wrong on exactly the
details that decide real questions here: where type checking applies, what the
bundle exports, why a widget can pass its tests and still not exist at runtime.

Answer the question that was asked. The reference is a source to draw on, not an
outline to reproduce — a placement question wants the one boundary that settles
it, not a tour of all four layers.

Ground each structural claim in a file, and quote real signatures instead of
paraphrasing. `app/src/core/registry.ts` is short enough to read in full, so when
a question reaches past the reference, read the code and say what you read.

**Where the code and the reference disagree, the code wins** — the reference was
verified against the tree when written, so a mismatch means it has gone stale.
Answer from the code and flag the drift.

Name the limits instead of designing around them. The library has no lifecycle,
async, state, or lint step; a proposal needing one is a decision for a human, not
a gap to quietly fill.

## Verify

Confirm a structural claim before asserting it:

```bash
cat app/src/core/registry.ts   # the contract
cat app/src/widgets/index.ts   # the composition root
cd app && npm run build && node -e "import('./dist/bundle.js').then(m => console.log(Object.keys(m), m.listWidgets()))"
```

The last one is ground truth for the public surface and which widgets ship.

## References

- `references/architecture.md` — the contract, module boundaries, import-time
  data flow, and the consequences of the design.
