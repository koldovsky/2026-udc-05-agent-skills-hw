---
name: architecture-deep-dive
description: How app/ is built — module boundaries, the registry contract, where type safety ends, where new code belongs. Use for any explain/why/where question about this codebase's structure: architecture overviews, onboarding, design rationale, feature placement, impact of touching core/registry.ts, reviewing a boundary change. Not for writing a widget (creating-widget) or measuring the bundle (analyzing-bundle-size).
---

# Architecture deep dive

## When to use this

**Scope check — before reading further.** This skill answers *explain* and
*where does it go* questions. It does not write widget code.

- **Applies:** "explain the architecture", "how does the registry work", "why
  is it structured this way", "where should feature X live", "what breaks if I
  change `core/registry.ts`", any review question about module boundaries.
- **Does not apply:** executing the golden path for a new widget → load
  `creating-widget` instead. Measuring bundle size → `analyzing-bundle-size`.
  Editing one existing widget's props or markup → read that widget's own two
  files.
- **Both can apply:** "where do I put a new widget, and why?" — answer the
  *why* from here, then hand the *how* to `creating-widget`.

## Instructions

One invariant carries most of the answers: **dependencies point one way, into
`core/registry.ts`**, which imports nothing from the project. Widgets register
themselves and never import each other; `widgets/index.ts` is the only file that
knows the full set. That is why lookup is by **string** rather than by import,
and it is the fact most other answers here fall out of.

**Open `references/architecture.md` at the section that matches the question —
do not answer this codebase's architecture from memory.** The reference carries
what generic reasoning about "a registry" gets wrong here: props are unchecked
through `create()`; `register` is not part of the built bundle's surface; every
registered widget ships whether or not it is used.

| The question is about | Open |
|---|---|
| overall shape, layering, what may import what | [`#the-dependency-direction`](references/architecture.md#the-dependency-direction) |
| `register` / `create` / `listWidgets` behaviour, errors, ordering | [`#the-registry-contract`](references/architecture.md#the-registry-contract) |
| why `Unknown widget "x"` at runtime although `tsc` is clean | [`#registration-is-a-module-load-side-effect`](references/architecture.md#registration-is-a-module-load-side-effect) |
| whether `create("badge", props)` is type-checked | [`#where-type-safety-ends`](references/architecture.md#where-type-safety-ends) |
| what a widget may return / do, escaping, purity | [`#the-output-contract`](references/architecture.md#the-output-contract) |
| where a new feature belongs | [`#where-new-code-goes`](references/architecture.md#where-new-code-goes) |
| why the bundle contains widgets nobody creates | [`#the-bundle-consequence`](references/architecture.md#the-bundle-consequence) |

If the code and the reference disagree, **the code wins** — fix the reference
in the same change and say so in the answer.

## Verify

An architecture answer is only worth as much as its last check against the
code. Re-run the relevant line before asserting:

```bash
cd app
grep -rn "register(\"" src/widgets                 # who registers under which name
grep -n "import" src/widgets/index.ts              # which modules actually load
npm run build
node -e "import('./dist/bundle.js').then(m => console.log(Object.keys(m), m.listWidgets()))"
```

`Object.keys(m)` is the built public surface (`create`, `listWidgets` — not
`register`); `listWidgets()` is the set of widgets that survived to runtime, in
import order. Every claim in the reference has a one-line command that proves
it in its [fact-check ledger](references/architecture.md#fact-check-ledger) —
use it rather than trusting the prose, including this file's prose.

## References

- `references/architecture.md` — the verified depth: module boundaries, the
  registry contract line by line, the type-safety boundary, the escaping and
  purity contract, a placement decision table, the tree-shaking consequence,
  pitfalls, and a fact-check ledger. Open the section named in the routing
  table above; read the whole file only for a genuine "explain the whole
  architecture" request.
