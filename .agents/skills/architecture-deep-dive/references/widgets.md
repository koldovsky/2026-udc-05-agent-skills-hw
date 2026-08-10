# Reference: widgets structure

## Overview

Description of the widgets structure and its purpose.

## Deep dive

- `app/src/widgets/<name>/` — one folder per widget, containing exactly two
  files: `<name>.ts` (the pure factory function + its `register(...)` call)
  and `<name>.test.ts` (colocated vitest tests). See `app/src/widgets/badge/`
  for the canonical example.
- `app/src/widgets/index.ts` — imports every widget module (so its
  `register()` call runs) and re-exports `create`/`listWidgets`.

## Related

- `app/src/widgets/badge/badge.ts` — the badge widget.
