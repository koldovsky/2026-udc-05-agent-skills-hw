# A/B validation (Task D)

**Skill under test:** `creating-widget` (`.agents/skills/creating-widget/SKILL.md`)

**Prompt (same for A and B):** the section "The request" from
`materials/ab-task.md`, pasted verbatim as the single user message of each run:

> Add a new **alert** widget to the library:
>
> - Renders as `<div class="alert alert--{tone}">{message}</div>`.
> - `tone` is optional, one of `"info" | "warn" | "error"`, defaulting to `"info"`
>   (mirror the `badge` widget's tone handling).
> - Make it discoverable the same way every other widget is.

**Tool used:** Cursor (agents window), model "Claude Opus 5.5 Medium", Fast
mode off. Each run used a new chat, the same prompt, and one user message.

**Run B setup:** the whole `.agents/skills/creating-widget/` folder was moved
outside the repo. After that, Cursor's `/` skill picker filtered by "crea" no
longer listed `creating-widget`; of the repo's own skills, only `analyzing-bundle-size` and
`architecture-deep-dive` remained. The folder was restored after run B. The
code from both runs was reverted after the results were captured, so nothing
from either run is committed.

## Result A — skill available

- Cursor reported "Worked for 33s". There was 1 permission prompt
  (`npm test; npm run typecheck`), answered with Run.
- Trace: the first step was "Used creating-widget", and the agent wrote "I'll
  follow the repo's creating-widget skill". It then searched `app/src/**/*`,
  read `badge.ts`, `badge.test.ts` and `widgets/index.ts`, and edited files.
- Files changed:
  - `app/src/widgets/alert/alert.ts` (+13)
  - `app/src/widgets/alert/alert.test.ts` (+19)
  - `app/src/widgets/index.ts` (+1: `import "./alert/alert.js";`)
- `alert.ts`: `export interface AlertProps extends WidgetProps { message: string; tone?: "info" | "warn" | "error" }`,
  an exported `createAlert` that uses `props.tone ?? "info"`, and a final
  `register("alert", createAlert)`. It has no `any` and no default export.
- `alert.test.ts`: 3 tests covering the default `info` tone, an explicit
  `warn` tone, and a check that `listWidgets()` contains `"alert"`.
  `listWidgets` is imported directly from `../../core/registry.js`.
- Verification: `npm test` passed with 2 files and 5 tests, and typecheck was
  clean. The build was not run.

## Result B — skill removed

- Cursor reported "Worked for 1m 24s". There were 2 permission prompts, both
  answered with Run:
  1. `Get-ChildItem -Recurse -Name app/src, .agents/skills; git status --short`
  2. `npm test; npm run typecheck; npm run build`
- Trace: there was no "Used ..." skill line. The agent's visible thought was
  that the deliverables mention a `creating-widget` skill, but it was not in
  the available skills list (only `analyzing-bundle-size` and
  `architecture-deep-dive`), so it checked `.agents/skills` itself.
- Cursor's file-search index was stale. Globs still showed the reverted
  `alert/` folder and the `creating-widget` files, and 3 "Read attempted"
  calls failed. The agent said the glob results were stale and checked the
  disk instead. It then read `badge.ts`, `badge.test.ts`, `widgets/index.ts`,
  `core/registry.ts` and `src/index.ts`.
- Files changed (the same 3 files):
  - `app/src/widgets/alert/alert.ts` (+13), identical line for line to run A
  - `app/src/widgets/alert/alert.test.ts` (+22)
  - `app/src/widgets/index.ts` (+1, the same `import "./alert/alert.js";` line)
- `alert.test.ts`: 3 tests covering the default `info` tone and an explicit
  `warn` tone. The third test imports `create` and `listWidgets` from
  `../index.js` (that is, `widgets/index.ts`). It checks both that
  `listWidgets()` contains `"alert"` and that
  `create("alert", { message: "Failed", tone: "error" })` returns the expected
  `div`.
- Verification: `npm test` passed with 2 files and 5 tests, and typecheck was
  clean. The build also ran and produced a 509-byte bundle, up from 411 bytes
  before the change.
- Other remarks from the agent: it noticed in `git status` that
  `.agents/skills/creating-widget/SKILL.md` had been deleted and said this was
  likely the "without skill" A/B run. It also noted that `message` is not
  HTML-escaped, which is the same as in `badge`.

## Difference table

| Aspect | A (skill available) | B (skill removed) |
|---|---|---|
| File location | `app/src/widgets/alert/alert.ts` + `alert.test.ts` | Same: `app/src/widgets/alert/alert.ts` + `alert.test.ts` |
| Registered via `register()` | Yes, `register("alert", createAlert)` | Yes, identical line |
| Colocated test added | Yes, 3 tests (+19 lines) | Yes, 3 tests (+22 lines) |
| Wired into `widgets/index.ts` | Yes, `import "./alert/alert.js";` | Yes, the same line |
| Named exports / no `any` | Yes | Yes (`alert.ts` identical to A) |
| Skill loaded | Yes, "Used creating-widget" was the first step | No, the skill was not in the list; the agent inspected `.agents/skills` by hand |
| Time | 33s | 1m 24s |
| Permission prompts | 1 (`npm test; npm run typecheck`) | 2 (directory listing + `git status`; `npm test; npm run typecheck; npm run build`) |
| Files read before editing | 3: `badge.ts`, `badge.test.ts`, `widgets/index.ts` | 5: those 3 plus `core/registry.ts` and `src/index.ts`, after 3 failed reads caused by the stale index |
| Test checks wiring through `widgets/index.ts` | No, `listWidgets` is imported from `../../core/registry.js` | Yes, `create` and `listWidgets` are imported from `../index.js`, and `create("alert", ...)` output is asserted |
| Build run | No | Yes, bundle went from 411 to 509 bytes |

## Conclusion

The skill did not change the output in a meaningful way: both runs produced
the same three files, and `alert.ts` was identical line for line. The
difference was in the process: run A loaded the skill and finished in 33s
with 1 prompt and 3 reads, while run B took 1m 24s, needed 2 prompts and read
5 files after exploring the repo by hand. A likely explanation for the small
gap is that the golden path is documented in several other places as well
(`app/AGENTS.md` in its Architecture, Conventions and Skills sections, the
root `AGENTS.md`, and `architecture-deep-dive`, whose description names
`creating-widget` and whose reference has a "New widget" row). On top of that,
`badge` is a single obvious template, and the `creating-widget` description
itself contains the example "add an alert widget". The comparison has
confounders: Cursor's index was stale in run B, the agent saw the skill's
deletion in `git status`, and there was only one run per side, so the timing
difference may be noise. One concrete finding is that the skill's test
template imports `listWidgets` directly from the registry, so it would not
catch a missing `widgets/index.ts` import, while run B's test, which goes
through `../index.js`, would; adopting that pattern would improve the skill.
