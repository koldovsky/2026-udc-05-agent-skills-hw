# Reference: Widget architecture reference

## Overview

<!-- 2-3 sentences: what this reference explains and why it's separate from SKILL.md. -->
This widget reference explains architecture of registry.ts file and purpose of it own methods

## Deep dive

<!-- The actual depth: module boundaries, data flow, the "why" behind the
     architecture, worked examples, common pitfalls. Cite real files
     (app/src/core/registry.ts, app/src/widgets/**) and real function
     signatures — a reference file is only valuable if it's verifiably
     accurate against the current code, not a generic architecture essay. -->

### State Isolation
The registry encapsulates its state within a private `widgets` `Map` (`app/src/core/registry.ts`). This map is strictly isolated from direct external mutation and is accessible exclusively through the exported public API.
* **Type Signature:** `WidgetFactory<P>` enforces a function signature `(props: P) => string`, where P extends `WidgetProps` (`Record<string, unknown>`). TypeScript type-checks this signature at compile time but does *not* guarantee purity — side effects or DOM access are TypeScript-valid.
* **Type Casting:** Internal casting (`as WidgetFactory`) is localized inside `register` to store heterogeneous generic factories in a single homogeneous collection without weakening public type safety.

### Architectural Contracts & Runtime Error Boundaries
Beyond the type signature, the registry enforces architectural contracts at runtime:
* **Pure Function Contract:** Every widget factory must be a pure function — no DOM access, no side effects (except the module-load-time `register()` call itself). This is an *architectural requirement* enforced by code review, not by TypeScript. Violators pass type-checking but break the registry's contract.
* **Duplicate Protection:** `register()` checks `widgets.has(name)` and throws an explicit `Error` if a widget key conflicts. This mandates a predictable, single-registration lifecycle during module load-time execution.
* **Fail-Fast Resolution:** `create(name, props)` retrieves the factory from the registry and invokes it: `factory(props)`. If the widget is not registered, it throws an error message listing all available keys via `[...widgets.keys()]`.
* **Defensive Footprint:** `listWidgets()` exposes registered components by spreading map keys into a fresh `string[]` array, preventing external callers from leaking or acquiring a reference to the internal map iterator.

## Related

<!-- Pointers to other files/skills, if relevant. -->
