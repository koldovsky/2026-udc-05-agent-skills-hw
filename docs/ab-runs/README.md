# ab-runs — frozen experiment snapshots

Not live source. Nothing here is imported, built, or tested — `a/`, `b/`,
and `c/` are the raw `alert.ts` / `alert.test.ts` / `index.ts` output from
the three arms of the Task D A/B experiment described in
[`../ab-validation.md`](../ab-validation.md).

The point of these folders is to make "all three arms produced the same
artifact" checkable rather than asserted: `git ls-files -s docs/ab-runs`
shows one blob hash per filename across `a/`, `b/`, `c/`, and each matches
the `app/src/widgets/alert/alert.ts` that shipped at experiment time.

Because of that, these files are intentionally **not** updated when the
live widget changes (e.g. later security fixes to
`app/src/widgets/alert/alert.ts`) — patching a snapshot would falsify the
byte-identical proof it exists to record. Code-quality or security findings
against files in this directory aren't applicable; the real fix, if one is
needed, belongs in `app/src/widgets/alert/alert.ts`.
