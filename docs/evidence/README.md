# A/B validation evidence — raw run patches

Diffs of what each fresh-context agent run actually produced, captured with
`git diff` immediately after each run, before any cleanup. See
`docs/ab-validation.md` for the write-up these support.

| File | Round | Arm | Diff base | Contents |
|---|---|---|---|---|
| `run-a.patch` | 1 | A (skill ON) | badge-only baseline | `alert.ts` + `alert.test.ts` + `widgets/index.ts` import |
| `run-b.patch` | 1 | B (skill OFF) | badge-only baseline | same three files; only test fixture strings differ from run A |
| `run-a2.patch` | 2 | A (upgraded skill ON) | commit `eed1c75` (round-1 alert already committed) | **`registration.test.ts` (new)** + alert.test.ts fixture-string deltas; `alert.ts` is absent because the run reproduced the committed file byte-for-byte |
| `run-b2.patch` | 2 | B (skill OFF, removed from both `.agents/` and `.claude/`) | commit `eed1c75` | **intentionally empty**: the run reproduced the committed `alert.ts`/`alert.test.ts`/`index.ts` byte-for-byte and created **no** `registration.test.ts` — the file did not exist in its baseline and appears nowhere in its report. The empty diff *is* the round-2 finding: without the skill, the registry-level test is structurally unreachable (nothing in `badge/` to mirror it from). |

Round-2 baseline for both arms: working tree with the `alert` widget and
`registration.test.ts` removed (badge-only `app/src`), upgraded
`creating-widget` skill present (arm A) or moved fully outside the repo
(arm B). Same verbatim prompt from `materials/ab-task.md` in every run.