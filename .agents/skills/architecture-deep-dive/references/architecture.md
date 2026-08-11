# Reference: Widget Registry Architecture

## Overview

The project is a small, framework-free TypeScript library built around a central widget registry.

A widget is a pure factory function that accepts props and returns an HTML string. Widgets register themselves under a string name, allowing callers to create them through the registry without importing individual widget modules directly.

The main architectural areas are:

* `app/src/core/registry.ts` — shared registry contract and runtime storage;
* `app/src/widgets/<name>/` — implementation and colocated tests for each widget;
* `app/src/widgets/index.ts` — loads all widget modules so their registrations execute and exposes the registry API;
* `app/src/index.ts` — public bundle entry point.

## Deep dive

### Registry core

`app/src/core/registry.ts` owns the shared registry.

It defines:

```ts
export type WidgetProps = Record<string, unknown>;
```

Widget-specific props interfaces can extend this base type.

A widget factory is represented by:

```ts
export type WidgetFactory<P extends WidgetProps = WidgetProps> =
  (props: P) => string;
```

Factories therefore receive props and return an HTML string.

Registered factories are stored in a module-private:

```ts
Map<string, WidgetFactory>
```

The registry exposes three public operations.

#### `register(name, factory)`

Registers a factory under a string name.

If the name is already present, registration throws an error instead of silently replacing the existing widget.

Widget modules call `register()` at module load time.

The public signature of this function is part of the shared contract and should remain stable.

#### `create(name, props)`

Looks up a registered widget factory by name and invokes it with the supplied props.

`props` defaults to an empty object.

If no widget exists under that name, `create()` throws an error that includes the unknown name and the currently registered widget names.

This function is what lets consumers create widgets without importing their implementation modules directly.

#### `listWidgets()`

Returns an array containing the names currently stored in the registry.

### Widget module boundary

Each widget owns one directory:

```text
app/src/widgets/<name>/
  <name>.ts
  <name>.test.ts
```

The implementation file contains the widget-specific props interface and its pure factory function.

For example, the canonical `badge` widget exports `createBadge(props): string`.

The factory itself has no DOM dependency and returns an HTML string. The only intended side effect in a widget module is the top-level registration:

```ts
register("badge", createBadge);
```

Keeping each widget isolated in its own directory provides a consistent place for implementation and tests and avoids placing widget-specific behavior in the shared registry.

### Tests

Each widget has a colocated Vitest file named `<name>.test.ts`.

Tests import the widget factory directly rather than going through the registry.

For example, the `badge` tests import `createBadge` from `./badge.js` and assert the HTML strings returned for different props.

This keeps unit tests focused on the widget factory itself.

### Widget aggregation and registration

`app/src/widgets/index.ts` imports every widget module with a side-effect import such as:

```ts
import "./badge/badge.js";
```

This import is architecturally important because loading the module causes its top-level `register()` call to execute.

After loading widget modules, `widgets/index.ts` re-exports:

```ts
create
listWidgets
```

from the core registry.

Therefore, adding a widget implementation without importing it from `widgets/index.ts` is incomplete: the file may exist and its direct tests may pass, but it will not be registered when consumers use the library entry point.

### Public entry point

`app/src/index.ts` is the library bundle entry point.

It re-exports:

```ts
create
listWidgets
```

from `./widgets/index.js`.

This creates the runtime flow:

```text
app/src/index.ts
    ↓
app/src/widgets/index.ts
    ↓
imports widget modules
    ↓
widget module calls register(...)
    ↓
app/src/core/registry.ts stores factory
```

A consumer can then call:

```ts
create("<name>", props)
```

without importing the widget implementation directly.

### Where changes belong

When adding a normal new widget, changes belong under:

```text
app/src/widgets/<name>/
```

plus the corresponding side-effect import in:

```text
app/src/widgets/index.ts
```

A normal widget addition should not require modifying `app/src/core/registry.ts`.

Changes to `registry.ts` affect the shared contract used by every widget and should only be made when the registry behavior itself must change.

Changes to the public signatures of `register`, `create`, or `listWidgets` should be avoided because those functions form the stable registry API.

### Architectural constraints

The current design intentionally keeps widgets independent of UI frameworks.

Widget factories:

* return strings;
* do not manipulate the DOM;
* use named exports;
* avoid unrelated side effects;
* self-register once when their module loads.

The registry is responsible for mapping string widget names to factories. Individual widget modules are responsible for widget-specific rendering behavior and props.

## Related

* `app/src/core/registry.ts` — registry implementation.
* `app/src/widgets/badge/badge.ts` — canonical widget implementation.
* `app/src/widgets/badge/badge.test.ts` — canonical colocated widget test.
* `app/src/widgets/index.ts` — widget loading and registry API re-export.
* `app/src/index.ts` — bundle/public entry point.
* `.agents/skills/creating-widget/SKILL.md` — procedural instructions for adding a widget.
