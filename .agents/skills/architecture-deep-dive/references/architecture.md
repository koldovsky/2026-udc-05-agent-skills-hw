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
### State Isolation & Type Safety
The registry encapsulates its state within a private `widgets` `Map` (`app/src/core/registry.ts`). This map is strictly isolated from direct external mutation and is accessible exclusively through the exported public API.
* **Generic Constraint:** `WidgetFactory<P>` enforces that every component remains a pure function mapping a `WidgetProps` shape (`Record<string, unknown>`) to a raw HTML `string`.
* **Type Casting:** Internal casting (`as WidgetFactory`) is localized inside `register` to store heterogeneous generic factories in a single homogeneous collection without weakening public type safety.

### Runtime Contracts & Error Boundaries
The public API guarantees strict runtime error boundaries to catch configuration and registration issues immediately during execution:
* **Duplicate Protection:** `register()` checks `widgets.has(name)` and throws an explicit `Error` if a widget key conflicts. This mandates a predictable, single-registration lifecycle during module load-time execution.
* **Fail-Fast Resolution:** `create()` evaluates incoming string IDs against the registry. If `widgets.get(name)` is missing, it dynamically compiles and throws an error message containing all available keys via `[...widgets.keys()]`.
* **Defensive Footprint:** `listWidgets()` exposes registered components by spreading map keys into a fresh `string[]` array, preventing external callers from leaking or acquiring a reference to the internal map iterator.

## Related

<!-- Pointers to other files/skills, if relevant. -->
