---
name: creating-widget
description: Teaches how to create a new widget for the widget-registry library following the established pattern. Use when adding a new widget or when unsure about widget structure, registration, and testing.
---

# Creating a Widget

When adding a new widget to the widget-registry library, follow the golden path established by the seeded `badge` widget.

## When to use this

- User asks to "add a widget", "create a widget", or "implement a new widget"
- The request mentions specific widget behavior (renders as HTML, has props, etc.)
- You need to implement something discoverable via `create(name, props)`

## Instructions

Every widget follows this exact structure:

### 1. Create the widget module at `app/src/widgets/<name>/<name>.ts`

```typescript
import { register, type WidgetProps } from "../../core/registry.js";

export interface <Name>Props extends WidgetProps {
  // Define required and optional props here
  // Example: label: string; tone?: "info" | "warn" | "error";
}

export function create<Name>(props: <Name>Props): string {
  // Pure function: no DOM access, no side effects
  // Return an HTML string
  // Example: return `<div class="widget">${props.label}</div>`;
}

register("<name>", create<Name>);
```

Key points:
- **Named exports only** — export the factory function by name, never default export
- **Pure function** — returns HTML string, no DOM or async operations
- **TypeScript strict** — no `any`, no `@ts-ignore`
- **Self-register** — the module calls `register(name, factory)` at load time
- **Props interface** — extends `WidgetProps`, defines the widget's API
- **Naming**: factory is `create<PascalName>`, props interface is `<PascalName>Props`

### 2. Create colocated tests at `app/src/widgets/<name>/<name>.test.ts`

```typescript
import { describe, expect, it } from "vitest";
import { create<Name> } from "./<name>.js";

describe("create<Name>", () => {
  it("renders with default props", () => {
    expect(create<Name>({ /* required props */ })).toContain("expected-content");
  });

  it("respects optional props", () => {
    expect(create<Name>({ /* props */, optionalProp: "value" })).toContain("value");
  });
});
```

For widgets with optional string enums (like `tone?: "info" | "warn"`), test both default and explicit values. See `badge.test.ts` for the canonical example.

### 3. Register the widget in `app/src/widgets/index.ts`

Add this import at the top of the file:
```typescript
import "./<name>/<name>.js";
```

This ensures the widget's `register()` call runs when the bundle loads.

### 4. Verify

Run tests to confirm the widget is discoverable and works:
```bash
cd app && npm test
```

The widget is now usable via:
```typescript
import { create } from "app";
const html = create("<name>", { /* props */ });
```

## Verify

- `cd app && npm test` runs green with no changes to `core/registry.ts`'s public API
- The new widget file uses named exports and has TypeScript strict compliance
- Tests are colocated in the same folder
- The widget is registered and discoverable (can be created by string ID)
