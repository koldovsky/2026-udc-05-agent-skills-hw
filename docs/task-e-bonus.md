# Task E (bonus) — Path 2: install a community skill

**Skill installed:** `webapp-testing` from
[github.com/anthropics/skills](https://github.com/anthropics/skills)
(`skills/webapp-testing`), at commit **`b9e19e6`** (2026-04-20) — vendored to
`.agents/skills/webapp-testing/`, mirrored to `.claude/skills/webapp-testing/`.
6 files: `SKILL.md`, `scripts/with_server.py`, 3 `examples/*.py`, `LICENSE.txt`.

### License

Licensed **Apache 2.0**, which permits redistribution provided the license and
attribution travel with the copy. What that required here, checked against §4:

- **§4(a) — ship the license.** `LICENSE.txt` is vendored alongside the skill,
  byte-identical to upstream, and carries its `Copyright 2026 Anthropic, PBC.`
  line. The `.claude/skills/` mirror carries its own copy too.
- **§4(b) — flag modified files.** `SKILL.md` is the only file changed (the
  `description`), and it opens with a notice naming the upstream commit, the
  change, and where the unmodified content resumes.
- **§4(c)/(d) — retain attribution notices.** Verified by diffing every other
  vendored file against upstream: `with_server.py` and all three `examples/*.py`
  are unchanged. Upstream ships no `NOTICE` file for this skill, so §4(d) does
  not apply — the repo-root `THIRD_PARTY_NOTICES.md` covers unrelated
  dependencies and mentions nothing in `webapp-testing`.

**Why this one:** widgets here are pure functions returning HTML **strings**.
`npm test` only asserts on those strings — nothing in this repo had ever
rendered a widget in a browser.

## What it did when invoked — it worked

```bash
python .agents/skills/webapp-testing/scripts/with_server.py \
    --server "python -m http.server 8765" --port 8765 \
    -- python docs/task-e/check_widgets.py
```

```text
cases : 7 -> badge, badge, alert, alert, spinner, spinner, tooltip-missing
error : [harness] expected throw: Unknown widget "tooltip". Registered: badge, spinner, alert
OK: all widgets rendered in a real browser; registry threw as expected
```

Exit code 0. [`docs/task-e/harness.png`](task-e/harness.png) is the screenshot:
all three widgets rendering from the **built bundle**, plus the registry's
`Unknown widget` error — the unregistered-name branch `architecture-deep-dive`
describes, now confirmed in a browser instead of asserted in prose.

### Why 7 cases — two of each widget

Each widget branches on one prop, so a single render would only prove the
default path. Each pair renders the **same widget with a different prop value**,
so a broken class interpolation shows up as two identical-looking boxes:

| Pair | Varies | Classes produced |
|---|---|---|
| badge ×2 | `tone` | `.badge--info`, `.badge--warn` |
| alert ×2 | `tone` | `.alert--info`, `.alert--warn` |
| spinner ×2 | `size` | `.spinner--sm`, `.spinner--lg` |

Six, plus the unregistered `tooltip` case = 7. The count is asserted in
`check_widgets.py` (`len(rendered) != 7`), so adding or removing a case in
`harness.html` means updating that number too.

**What this does not cover:** every case passes `tone`/`size` explicitly *and*
as a valid literal, so no factory ever takes its fallback branch. Each narrows
at runtime by comparing against the allowed values rather than coalescing a
nullish one — `props.tone === "warn" || props.tone === "error" ? props.tone :
"info"` in `badge` and `alert`, the same shape ending `: "md"` in `spinner` —
so the browser run exercises neither an omitted prop nor a rejected value, and
the `error` tone and `md` size never appear. The run proves the valid explicit
paths render, not the fallbacks.

## Adaptations needed

1. **No web app to point it at.** The skill assumes a running server and a
   page; this is a headless library with neither. → Wrote
   `docs/task-e/harness.html` (renders the built bundle) and `check_widgets.py`
   (Playwright logic only, as `SKILL.md` prescribes).
2. **No CSS ships with the library**, on purpose — so the first render was
   invisible. → The harness supplies its own stylesheet. That CSS is
   scaffolding, **not** library behaviour; nothing in `app/` validates it.
3. **The bundle must be served over HTTP**, so the skill's `file://` route is
   unavailable: the bundle is ESM, and Chromium blocks module loads from an
   opaque `file://` origin. → Took the server route; its `with_server.py` ran
   **unmodified**.
4. **Playwright needs a short install path on Windows** — its nested driver
   directories exceed the 260-char `MAX_PATH` limit under a deep folder. →
   Installed the venv + browsers under `%TEMP%\wt`; nothing global, and
   deleting that folder undoes the whole toolchain.
5. **Bundled examples hardcode `/mnt/user-data/outputs/`** (Linux sandbox). →
   Read as reference, not copied; paths written relative to the repo.
6. **Not discovered from `.agents/skills/` alone.** → Mirrored to
   `.claude/skills/`, same as this repo's other three skills.
7. **The `description` under-triggered and was rewritten.** Upstream says
   *"testing local **web applications**"* — but this repo has no web
   application, so on a request like *"does the badge actually render?"* an
   agent scanning descriptions would reasonably skip it. It also gave no hint
   the harness exists. → Rewritten to name this repo's widgets, the harness,
   and a "not for `npm test`" clause routing string-level checks elsewhere —
   the same shape the repo's own three skills use. This one is a judgment call
   about wording rather than a measured result.

**Not adapted:** `SKILL.md`'s frontmatter `description` is the **only** change
to the vendored skill — its body, `with_server.py`, and the examples are
untouched upstream content, and the modification notice in `SKILL.md` says so.
No file in `app/` was touched; `npm test` is still 17/17 green.

## Reproduce

```bash
cd app && npm install && npm run build && cd ..     # dist/ is gitignored
pip install playwright && playwright install chromium
python .agents/skills/webapp-testing/scripts/with_server.py \
    --server "python -m http.server 8765" --port 8765 \
    -- python docs/task-e/check_widgets.py
```

Exit 0 + a regenerated `harness.png` means it passed. On Windows, install to a
short path (item 4).

## Conclusion

The skill's **instructions** were usable as-is — its body and scripts ran
unedited. What was not portable was its `description` and its assumption that a
web app already exists: the real cost was ~100 lines of repo-specific
scaffolding written just so the skill had something to act on.

That's the lesson for my own three skills. A skill's body travels; its
`description` is local, because triggering depends on the shape of the repo it
lands in and on what other skills sit beside it — neither of which the author
can know. And every skill smuggles in assumptions about its host project; the
good ones just carry fewer, and say them out loud. The payoff was real evidence:
the seeded widgets render, which 17 green string tests never actually showed.
