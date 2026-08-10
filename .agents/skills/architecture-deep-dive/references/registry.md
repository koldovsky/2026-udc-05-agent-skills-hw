# Reference: `registry.ts`

## Overview

Description of the core registry and its purpose.

## Deep dive

`app/src/core/registry.ts` is the registry itself: `register(name, factory)`
and `create(name, props)`. This is the **shared contract** every widget
depends on. Its public API (`register`, `create`, `listWidgets`) is stable;
do not change its signatures.

## Related

- `app/src/index.ts` — the library's bundle entry point, used by `npm run
  build` (Task C's bundle-size exercise).