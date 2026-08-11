---
name: architecture-deep-dive
description: Explains how this repo's widget-registry library (app/src/) is structured — the registry contract, module boundaries between core and widgets, and why new code belongs where it belongs. Use this whenever asked to explain the architecture, walk through how the pieces fit together, or figure out exactly where to implement a new feature or change ("where should this go", "how does registration work", "why is it split this way") — even for asks that don't name "architecture" directly, such as debugging why a widget isn't showing up or deciding whether a change belongs in the registry or in a widget file. Not for the step-by-step of adding a new widget (see creating-widget) or measuring bundle size (see analyzing-bundle-size).
---

# Architecture Deep Dive

<!--
Everything below this line only loads into context when the agent actually
invokes the skill — keep the frontmatter description tight (it's ALWAYS in
context for every skill you have installed), and put the real instructional
weight here.
-->

## When to use this

- The user asks to explain, walk through, or summarize the architecture of
  `app/` (e.g. "explain this codebase", "how does the widget registry work").
- The user asks where a change belongs — e.g. "where do I add X", "should
  this go in the registry or the widget", "why can't I just import the
  widget module directly".
- Not applicable to the mechanical steps of scaffolding a new widget (that's
  `creating-widget`) or to bundle-size measurement (`analyzing-bundle-size`)
  — this skill is about explaining *why* the structure is what it is, not
  performing a task inside it.

## Instructions

Read `references/architecture.md` before answering — that file holds the
verified depth (module boundaries, the registry contract, why widgets
self-register) so this file can stay short. Don't just dump it verbatim:
pull the parts relevant to the question and answer with real file paths and
function names from it, not generic architecture language a model would
produce without having read this project's code.

If the question is about where a specific change belongs, use the reference
file's module-boundary section to point at the exact file, not just a
general area of the codebase.

## Verify

- Any file path or function name used in the answer should actually exist —
  spot-check with `grep -n "<name>" app/src/core/registry.ts` or the
  relevant widget file if in doubt.
- The answer should reflect `references/architecture.md`, not a generic
  description of "a registry pattern" — if it reads the same regardless of
  which project it's about, the reference file wasn't actually consulted.

## References

- `references/architecture.md` — the deep dive: the registry contract,
  module boundaries, and the reasoning behind the widget structure. Open it
  whenever this skill triggers; it's written to be read in full, not
  skimmed.
