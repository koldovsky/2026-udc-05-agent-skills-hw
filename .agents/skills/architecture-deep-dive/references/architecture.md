# Reference: widget-registry architecture

## Overview

The `app/` library lets callers create HTML-string widgets by name
(`create("badge", { label: "New" })`) without importing the widget module
directly. Two pieces make that work: the **registry** (the lookup) and
**widgets** (the things it looks up).

## Deep dive

### Registry (`app/src/core/registry.ts`)

The shared contract every widget depends on. Public API is stable — do not
change these signatures:

- `register(name, factory)` — stores `factory` in an internal
  `Map<string, WidgetFactory>`. Throws if `name` is already registered.
- `create(name, props)` — looks up `name` and calls its factory with
  `props`. Throws if `name` isn't registered.
- `listWidgets()` — returns the registered names.

The map is module-private — the only way in is `register()`.

### Widgets (`app/src/widgets/<name>/`)

Each widget is exactly two colocated files:

- `<name>.ts` — a **pure** factory `create<Name>(props): string`
  that calls `register("<name>", create<Name>)` at module load. See
  `app/src/widgets/badge/badge.ts` for the example.
- `<name>.test.ts` — colocated vitest tests covering defaults and at least
  one explicit-option case.

`app/src/widgets/index.ts` imports every widget module
and re-exports `create`/`listWidgets`. A widget not
imported there never registers — `create()` throws `Unknown widget` even
though the file exists.

## Related

- `.agents/skills/creating-widget/SKILL.md` — the path for adding a
  new widget.
- `materials/architecture-brief.md` — the source-of-truth brief this
  reference was verified against.
