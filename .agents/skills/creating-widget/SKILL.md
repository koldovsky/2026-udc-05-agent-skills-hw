---
name: creating-widget
description: Use when the user asks to add a new widget or component to the widget-registry library (e.g. "add a spinner widget", "create a tooltip component"). Encodes the project-specific golden path — file layout, registration, colocated test, and index wiring — that a generic model would not know.
---

# Creating a Widget

## When to use this

- User asks to "add widget X", "create a new widget", "implement a <name> component"
- User references adding something to the widget library or widget registry
- User wants to know how to structure a new widget

## Instructions

Follow this exact golden path from `materials/architecture-brief.md`:

### 1. Create the widget module

File: `app/src/widgets/<name>/<name>.ts`

```ts
import { register, type WidgetProps } from "../../core/registry.js";

export interface <Name>Props extends WidgetProps {
  // required props here
  tone?: "info" | "warn" | "error";  // include if widget has tone variants
}

export function create<Name>(props: <Name>Props): string {
  const tone = props.tone ?? "info";
  return `<element class="<name> <name>--${tone}">...</element>`;
}

register("<name>", create<Name>);
```

Rules:
- Named exports only — **no `default` export**
- Props interface extends `WidgetProps` (from `../../core/registry.js`)
- Pure function: no DOM access, no async, no side effects except the module-load-time `register()` call
- No `any`, no `@ts-ignore`
- The `register()` call goes at **module level** (not inside the function)

### 2. Create the colocated test

File: `app/src/widgets/<name>/<name>.test.ts`

```ts
import { describe, expect, it } from "vitest";
import { create<Name> } from "./<name>.js";

describe("create<Name>", () => {
  it("defaults to the info tone", () => {
    expect(create<Name>({ /* required props */ })).toBe('...');
  });

  it("respects an explicit tone", () => {
    expect(create<Name>({ /* props */, tone: "error" })).toBe('...');
  });
});
```

Mirror the structure of `app/src/widgets/badge/badge.test.ts`.

### 3. Wire into the widget index

Add one line to `app/src/widgets/index.ts`:

```ts
import "./<name>/<name>.js";
```

Place it alongside the other widget imports. This makes `register()` run at bundle load time so `create("<name>", props)` works.

## Verify

```bash
cd app && npm test
```

All tests must stay green. Also verify:

```bash
grep "register(" app/src/widgets/<name>/<name>.ts
```

Should output exactly one line with the `register("<name>", create<Name>)` call.

Confirm the new widget is discoverable at runtime:

```ts
import { listWidgets } from "./src/widgets/index.js";
console.log(listWidgets()); // Should include "<name>"
// Example: ["badge", "alert", "<name>"]
```
