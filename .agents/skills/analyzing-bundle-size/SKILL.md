---
name: analyzing-bundle-size
description: Analyze and optimize the widget-registry bundle size. Use when measuring the impact of adding widgets, optimizing code, or understanding bundle composition.
---

# Analyzing Bundle Size

Techniques and scripts for measuring and optimizing the bundle produced by esbuild.

## When to use this

- User asks to "check bundle size", "reduce bundle size", or "analyze bundle impact"
- Adding a widget and want to know its size impact
- Optimizing the library for production use
- Understanding which widgets contribute most to the final bundle

## Instructions

### Building the bundle

The library uses esbuild to bundle `src/index.ts`:

```bash
cd app
npm run build
```

This creates `dist/bundle.js` (minified) and prints its byte size to stdout.

### Analyzing bundle composition

Use the included script to analyze bundle contents:

```bash
cd app
node scripts/analyze-bundle.mjs
```

This script:
- Reads the minified bundle
- Extracts widget registration calls
- Lists each widget and estimates its contribution
- Identifies unused code (if any)

### Manual inspection

1. **Before adding a widget**, record the current size:
   ```bash
   cd app && npm run build
   ```

2. **Add a widget** following the `creating-widget` skill

3. **After adding**, rebuild and compare:
   ```bash
   cd app && npm run build
   ```

4. **Analyze the delta** — the size difference is roughly the widget's cost plus overhead

### Optimization tips

- **Keep widget factories small** — each character in the HTML template adds bytes
- **Avoid utility functions** — extract common patterns only if shared by 2+ widgets
- **Check for dead code** — if esbuild doesn't tree-shake a dependency, it costs bytes
- **Inline constants** — prefer string literals in templates over imported constants

## Verify

- `npm run build` completes without errors
- `dist/bundle.js` exists and is minified
- `node scripts/analyze-bundle.mjs` runs successfully and lists registered widgets
- Bundle size tracks expected changes when widgets are added/removed

## Scripts

- `scripts/analyze-bundle.mjs` — Parse and report bundle composition
