# Task C — verifying the `analyzing-bundle-size` skill

Walkthrough steps 3 and 4: run the script personally, then confirm a fresh
session reaches the same result on its own.

Claude Code (Opus 5) · 2026-08-10 · `ws05/FeschenkoNatalia`

Precondition: same as [Task A](./task-a-verification.md#precondition), plus the
skill's `scripts/` directory — both mirrored into `.claude/skills/`.

## Step 3 — run personally

From the repo root:

```bash
node .agents/skills/analyzing-bundle-size/scripts/measure-bundle.mjs
```

<a id="the-report"></a>

```text
Bundle report — app/dist/bundle.js

  raw         937 B
  gzipped     505 B
  exports     create, listWidgets
  widgets     3  (badge, spinner, alert)
  per widget  ~312 B raw (average)
```

Every successful run in this document produced this report verbatim —
`--baseline` adds one line, nothing else varies — so it is shown once.

The tree measured here is the current one: three widgets (`alert` arrived with
Task D) and HTML escaping in `app/src/core/escape-html.ts`. An earlier pass of
this document recorded 564 B / 346 B / 2 widgets against `badge` + `spinner`
only; the script's behaviour below is unchanged, since these rows test how it
responds, not one particular size.

## Step 4 — fresh-session trigger

In a new chat, so the number was not already in context. Asked the walkthrough's
question — «яка зараз вага бандла?», phrased by the participant as "what weight
of bundle now?".

The agent invoked the skill as its first action and ran the script; no number
appeared before the script's output, which was the report verbatim. It quoted
gzipped as what users download and raw as the comparison number, and named
neither before running.

Triggering works: the description matched a bytes question with no skill named
and no build command in the prompt.

## It measures, it does not estimate

The script runs the project's own `npm run build`, then `statSync` for raw bytes,
`gzipSync` for download size, and a dynamic `import()` of the built bundle for
`listWidgets()`. No step infers a number. It resolves `app/` by walking up from
its own file, so it works from any cwd and either skill copy; it writes nothing
beyond the build's own `app/dist/bundle.js` and makes no network calls.

| Invocation                          | Result                                                       |
|-------------------------------------|--------------------------------------------------------------|
| `--baseline=512`                    | `baseline 512 B → +425 B (+83.0%)`                           |
| `--baseline=1000`                   | `baseline 1000 B → -63 B (-6.3%)` — negative delta signed    |
| `--baseline=0`                      | `baseline 0 B → +937 B` — delta alone, no undefined percent  |
| `--baseline=abc` / `=` / `=-5`      | `--baseline needs a number of bytes, got "…"` · exit 1       |
| `--json`                            | valid JSON: `raw` 937, `gzipped` 505, 3 `widgets`, 2 `exports`, `perWidget` 312, `baseline`/`delta` `null` |
| from `app/` or the `.claude/` copy  | same report — cwd-independent, both copies work              |
| **`app/dist/bundle.js` deleted**    | rebuilt by the run, 937 B — not reading a stale artifact     |
| **build deliberately broken**       | prints the esbuild error, **no size number**, exit 1         |

The last two rows are the ones that matter, and both were run first-hand.

Deleting `app/dist/bundle.js` and re-running returned the same 937 B.
`git check-ignore` confirms `.gitignore:7` covers it, so nothing could have been
restored from git — the file only comes back if `npm run build` actually ran.

Breaking the build is the sharper test. `app/src/index.ts` was temporarily
replaced with an unterminated import **while a valid 937 B bundle sat in
`app/dist/`**:

```text
X [ERROR] Unterminated string literal

    src/index.ts:1:55:
      1 │ export { create, listWidgets } from "./core/registry.js

measure-bundle: `npm run build` failed — fix the build before trusting any size number
```

Exit 1, and zero size lines on stdout (`node … | grep -c "raw"` → `0`). The
stale artifact was right there and still went unreported — the script measures
only what the build it just ran produced. `app/src/index.ts` was restored with
`git checkout --`; `git status` shows it unmodified and a re-run returns the
report unchanged.

The three `--baseline` rejection cases and the 0 B case come from a fix made
after the first review pass: `Number("")` is `0` rather than `NaN`, so an empty
`--baseline=` used to slip through as a 0 B comparison and print `(+null%)`.
Validation now rejects empty and negative values, and a 0 B baseline prints the
delta without a percentage.
