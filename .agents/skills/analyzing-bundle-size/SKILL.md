---
name: analyzing-bundle-size
description: Analyzing the bundle size of the project. When the user asks to analyze the bundle size of the project or check the impact of changes on the bundle size.
---

# Analyzing Bundle Size

## When to use this

When the user asks to analyze the bundle size of the project or check the impact of changes on the bundle size.

## Instructions

Run the `cd app && npm run build` command and invoke the `scripts/calc-bundle-size.mjs` script to read the size of the `dist/bundle.js` file. 
The script will report the size in bytes. Example output: `dist/bundle.js: 100000 bytes`.


## Verify

- the script `scripts/calc-bundle-size.mjs` has been executed successfully.
