# Provenance — vendored third-party skill

`SKILL.md` in this directory is **not** original work for this homework. It was
installed unmodified for Task E (Path 2 — install a community skill).

| | |
|---|---|
| Source | https://github.com/anthropics/skills |
| Path upstream | `skills/doc-coauthoring/SKILL.md` |
| Pinned commit | `f17010c9bb48` (2026-08-07) |
| Blob SHA-1 | `a5a69839ef4a161131d80b6daef10037a9686f4a` |
| Size | 15,815 bytes |

Verify it is byte-identical to upstream:

```bash
git hash-object .agents/skills/doc-coauthoring/SKILL.md
# => a5a69839ef4a161131d80b6daef10037a9686f4a
```

## Licence

Upstream ships **no licence file for this skill**, and `anthropics/skills` has no
repository-root `LICENSE`. Sibling skills in the same repo (e.g. `skill-creator`,
`algorithmic-art`) each vendor their own `LICENSE.txt` under **Apache-2.0**, so that
is the most likely intended licence here — but it is not stated for
`doc-coauthoring`, so this note records the gap rather than asserting a licence on
the author's behalf.

Attribution is kept in this separate file, not appended to `SKILL.md`, so the
vendored file stays byte-identical to upstream and the SHA above remains checkable.

## Not part of Tasks A–C

The three skills authored for this homework are `creating-widget`,
`architecture-deep-dive`, and `analyzing-bundle-size`. This one is a fourth,
third-party skill; see `docs/task-e-bonus.md` for what it was used for.
