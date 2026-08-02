# ab-runs — frozen experiment snapshots

Not live source. Nothing here is imported, built, or tested — `a/`, `b/`,
and `c/` are the raw `alert.ts` / `alert.test.ts` / `index.ts` output from
the three arms of the Task D A/B experiment described in
[`../ab-validation.md`](../ab-validation.md).

The point of these folders is to make "all three arms produced the same
artifact" checkable rather than asserted: `git ls-files -s docs/ab-runs`
shows one blob hash per filename across `a/`, `b/`, `c/` — proving the
three arms agree with each other. Separately, `ab-validation.md` diffs each
snapshot against its live counterpart as it stood at experiment time
(`alert.ts` ↔ `app/src/widgets/alert/alert.ts`, `alert.test.ts` ↔
`app/src/widgets/alert/alert.test.ts`, `index.ts` ↔
`app/src/widgets/index.ts`) — that correspondence isn't guaranteed to hold
today for files that have since changed live (see below).

Because of that, these files are intentionally **not** updated when the
live widget changes — e.g. `alert.ts` and `alert.test.ts` here no longer
match `app/src/widgets/alert/` after its later XSS fix, while `index.ts`
still happens to match `app/src/widgets/index.ts` only because that file
hasn't needed to change since. Patching a snapshot to re-match live would
falsify the byte-identical-across-arms proof it exists to record.
Code-quality or security findings against files in this directory aren't
applicable; the real fix, if one is needed, belongs in the live file under
`app/src/widgets/`.
