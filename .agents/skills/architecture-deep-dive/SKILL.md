---
name: architecture-deep-dive
description: Use whenever the user asks to explain, understand, or navigate this project's architecture — e.g. "explain the architecture of this project", "how does the widget registry work", "where should I implement X", or "what's the module boundary between the registry and widgets". Also reach for it before any change that isn't a plain new-widget addition (creating-widget already covers that golden path), since getting the registry/widget boundary wrong breaks every widget silently. Load references/architecture.md for the actual depth — don't answer from general knowledge.
---

# Architecture Deep Dive

See `references/architecture.md` for the full deep dive: the
`register`/`create`/`listWidgets` contract, the module boundaries, the widget
folder convention, and why it's shaped this way — verified against the real
code, not a generic architecture explanation.
