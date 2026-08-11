# A/B validation (Task D)

**Skill under test:** `creating-widget`

**Tool used:** Claude Code 2.1.220, model `claude-opus-5[1m]` (Opus 5), verified per
run rather than assumed.

> [!IMPORTANT]
> **This validation does not run against the repo as it ships.** The app was
> deliberately prepared first: the seeded `app/src/widgets/badge/` example was
> **removed**, along with `app/AGENTS.md`, every golden-path document, all
> explanatory code comments, and stale build/test caches — in a scratch copy with
> **no git history**. See [Preparing the app](#preparing-the-app) for the exact
> commands and the reasoning.
>
> This is necessary because the golden path is documented in at least five places
> besides the skill. Run in the repo untouched, the same A/B shows **almost no
> difference** — both sides produce a byte-identical `alert.ts`. The preparation is
> what makes the skill's contribution visible instead of masked by the example
> sitting next door.
>
> The real `app/` is untouched: `badge/` and every document are intact, and the
> repo's tests stay green.

## TL;DR

- **With no worked example in the tree, the skill is decisive.** Run A (skill
  installed) produced the house pattern exactly — correct folder layout,
  `createAlert`, `interface … extends WidgetProps`, `??` defaulting, colocated test,
  plus the barrel-only registry test. Its `alert.ts` is byte-identical to what the
  same prompt yields in the full repo with `badge.ts` present.
- **Run B (skill removed) diverged on seven points of code shape:** flat file layout,
  factory named `alert`, a `type` alias that sidesteps the `WidgetProps` constraint
  *while still compiling*, destructuring defaults, invented `ALERT_TONES` + runtime
  validation, forbidden barrel re-exports, and a modified `app/src/index.ts` that
  widened the library's public API. (The difference table lists ten differing rows —
  the other three are about process and test strategy, not the shape of the code.)
  Its registry test **cannot fail** — the barrel re-export loads the module on its
  own, so deleting the wiring keeps the suite green while `create("alert", …)` breaks
  for consumers.
- **Caveat, stated up front:** this gap appears only once `badge.ts` is gone. In the
  repo as it ships, both arms produce identical code and differ by one test file.
- **Takeaway:** the skill's value is inversely proportional to how authoritative the
  nearest example is — which is the direction every codebase drifts as it grows. The
  `## Verify` section pays off immediately either way, since a colocated test
  structurally cannot catch a missing side-effect import.

## Terms, and which runs this reports

Two terms are used throughout and are defined here rather than assumed:

- **golden path** — this project's house pattern for adding a widget: a pure factory
  function returning an HTML string at `app/src/widgets/<name>/<name>.ts`, a
  `register("<name>", …)` call at module load, a colocated `<name>.test.ts`, and a
  side-effect import in the barrel. Spelled out in `materials/architecture-brief.md`
  and encoded in `.agents/skills/creating-widget/SKILL.md`.
- **barrel** — `app/src/widgets/index.ts`. It imports every widget module purely for
  the `register()` side effect, and re-exports `create`/`listWidgets`. A widget that
  is missing from the barrel is invisible to `create()` at runtime.

Three sets of runs are referenced, and they are easy to confuse:

| Label | Setup | Reported where |
|---|---|---|
| **In-repo A/B** | 2 runs, skill on/off, repo exactly as it ships | Summarised only — see [Preparing the app](#preparing-the-app) and the Conclusion |
| **Prepared-app A/B** | 2 runs, skill on/off, example and prose removed | **The main experiment.** Results A and B below |
| **One discarded run** | deleted `badge/` from the real repo | Invalidated — the run recovered `badge/` from git history. Explained under Preparing the app |

Where this document says "Run A" or "Result A" without qualification, it means the
**prepared-app** run.

## The prompt — identical for both runs

The change request from `materials/ab-task.md` lines 13–18. Frozen to a file once
and replayed verbatim, never retyped:

```bash
sed -n '13,18p' materials/ab-task.md > /tmp/ab-prompt.txt   # 296 bytes
```

The cut stops at line 18 deliberately. Line 20 onward says the request omits
*where* files go, *how* the widget is structured, and *that* it needs a test — that
sentence names the three things under test, so including it would hand both runs
the answer.

```
Add a new **alert** widget to the library:

- Renders as `<div class="alert alert--{tone}">{message}</div>`.
- `tone` is optional, one of `"info" | "warn" | "error"`, defaulting to `"info"`
  (mirror the `badge` widget's tone handling).
- Make it discoverable the same way every other widget is.
```

**The prompt cites a widget the prepared app does not contain.** Its second bullet
says "(mirror the `badge` widget's tone handling)", and the preparation below removes
`app/src/widgets/badge/`. That dangling reference is deliberate and was left
byte-identical rather than edited, for three reasons:

- The tone requirement is stated *explicitly* in the same sentence — optional, one of
  three values, defaulting to `"info"` — so the specification survives without
  `badge`. Only the pointer dangles.
- It dangles equally in both runs, so it cannot explain any difference between them.
- Editing the prompt would have broken comparability with the in-repo A/B, which used
  this exact 296-byte string.

Result A below shows the consequence directly: the skill instructs the reader to
study `badge/` first, and that `Read` failed.

Both runs were fresh headless sessions with tool calls recorded:

```bash
claude -p "$(cat /tmp/ab-prompt.txt)" \
  --permission-mode acceptEdits \
  --allowedTools "Bash(npm:*),Read,Grep,Glob,Edit,Write" \
  --output-format stream-json --verbose
```

## Preparing the app

A first attempt at this A/B run *in the repo as it ships* showed almost no
difference: both runs produced the same `alert.ts`, and the only gap was one test
file. The reason is that the golden path is written down in several places besides
the skill, so the no-skill run was never uninformed:

| Source | golden-path statements |
|---|---|
| `app/src/widgets/badge/badge.ts` | a complete working widget, plus a comment stating the rule in prose |
| `materials/architecture-brief.md` | a numbered list headed "The golden path to add a new widget" |
| `app/AGENTS.md` | pure function / colocated `*.test.ts` / `register()` at module load |
| `.coderabbit.yaml` | "pure factory + `register()` + colocated `*.test.ts` + import in `widgets/index.ts`" |
| `app/src/widgets/index.ts` | a comment explaining why the side-effect import exists |

To measure the skill rather than the surrounding documentation, `app/` was copied
to a scratch directory and stripped. `/tmp/ws05-ab` is **ephemeral** — it was deleted
after the runs and is not part of the repository, so reproducing this means re-running
the commands below rather than inspecting a surviving directory:

```bash
cp -R app /tmp/ws05-ab/app && cd /tmp/ws05-ab
rm -rf app/src/widgets/badge                                  # the worked example
printf 'export { listWidgets, create } from "../core/registry.js";\n' \
  > app/src/widgets/index.ts                                  # barrel with no widget imports
rm -f app/AGENTS.md                                           # 7 golden-path mentions
sed -i '' '1d' app/src/core/registry.ts                       # meta comments
sed -i '' '1d' app/src/index.ts
rm -rf app/dist app/node_modules/.vite                        # stale build + test caches
```

Three properties of the result matter:

- **No worked example.** `badge/` is gone, so the folder-per-widget layout, the
  `create<Name>` naming, and the barrel side-effect import have no precedent
  anywhere in the tree.
- **No golden-path prose.** The scratch copy contains no `AGENTS.md`, `CLAUDE.md`,
  `materials/`, `docs/`, `README.md` or `.coderabbit.yaml`, and the remaining code
  carries no explanatory comments.
- **No git history.** The scratch directory is not a git repository and has none in
  any parent. This is load-bearing: an earlier attempt that deleted `badge/` from
  the real repo saw the run recover it — along with the stashed `app/AGENTS.md` —
  with a single `git show HEAD:app/src/widgets/badge/badge.ts`.

Gate before each run: `grep -rniE 'badge|alert|golden|pure function|colocat|skill'`
across everything outside `node_modules` returned **zero hits**. What remained was
three files of bare TypeScript — `core/registry.ts`, `index.ts`, and a
`widgets/index.ts` with no widget imports. `npm run typecheck` passes; `npm test`
exits 1 with "No test files found", since removing the only widget removes the only
test. That is true for both runs equally.

`app/src` was reset to a byte-identical snapshot of this baseline before each run.
The skill factor is `creating-widget` alone — it was the only skill installed in run
A, so the result is attributable to it rather than to the wider skill library.

## Result A — skill available

The skill fired as the first tool call. Full golden path:

- `app/src/widgets/alert/alert.ts` — `interface AlertProps extends WidgetProps`,
  pure `createAlert(props): string`, `props.tone ?? "info"`, `register("alert",
  createAlert)` as the last top-level statement, relative import ending `.js`.
- `app/src/widgets/alert/alert.test.ts` — colocated, exact-string `toBe`, five
  cases: default, all three explicit tones, and an empty-message case that pins the
  `??`-not-`||` behaviour.
- `app/src/widgets/index.ts` — `import "./alert/alert.js";` added.
- `app/src/widgets/index.test.ts` — imports the barrel only, asserts
  `listWidgets()` contains `"alert"` and `create("alert", …)` renders.

`npm test` 6/6 across 2 files, `npm run typecheck` clean. `core/registry.ts` and
`src/index.ts` untouched. The tool log shows it ran the skill's step-0 name-collision
check (`ls src/widgets/`) and its `## Verify` greps at the end.

Those six tests are 5 in `alert.test.ts` + 1 in the barrel test. The real repo also
reports 6/6, but from a different composition — 3 alert + 2 badge + 1 barrel, across
3 files. The totals matching is a coincidence, not the same suite.

Worth noting: the skill tells the reader to study `app/src/widgets/badge/` before
writing, and that `Read` **failed** — `File does not exist`. The run still produced
the canonical result, because the skill carries the pattern inline rather than only
pointing at the example.

## Result B — skill removed

Same prepared app, skill deleted, everything else identical. The house pattern broke
in seven ways:

```ts
// app/src/widgets/alert.ts   ← flat file, no per-widget folder
export const ALERT_TONES = ["info", "warn", "error"] as const;
export type AlertTone = (typeof ALERT_TONES)[number];

export type AlertProps = {          // type alias, not `interface … extends WidgetProps`
  message: string;
  tone?: AlertTone;
};

export function alert({ message, tone = "info" }: AlertProps): string {   // named `alert`; destructuring default, not `??`
  if (!ALERT_TONES.includes(tone)) {                                     // invented runtime validation
    throw new Error(`Unknown alert tone "${tone}". Expected: ${ALERT_TONES.join(", ")}`);
  }
  return `<div class="alert alert--${tone}">${message}</div>`;
}

register<AlertProps>("alert", alert);
```

It also widened the library's public surface, which the skill explicitly forbids:

```ts
// app/src/widgets/index.ts
export type { AlertProps, AlertTone } from "./alert.js";
export { ALERT_TONES } from "./alert.js";

// app/src/index.ts  ← the entry point, modified
export { create, listWidgets, ALERT_TONES } from "./widgets/index.js";
export type { AlertProps, AlertTone } from "./widgets/index.js";
```

Its tests went in `app/src/widgets/alert.test.ts` and assert through `create()`
rather than the factory. It needed one self-correction — the first version omitted
the `vitest` imports and failed with `describe is not defined` — after which
`npm test` was 4/4 in 1 file and typecheck clean.

## Difference table

| Aspect | A (skill available) | B (skill removed) |
|---|---|---|
| File location | `app/src/widgets/alert/alert.ts` — per-widget folder | `app/src/widgets/alert.ts` — flat |
| Registered via `register()` | yes, last top-level statement | yes, but `register<AlertProps>(…)` |
| Colocated test added | yes, `widgets/alert/alert.test.ts` | yes, `widgets/alert.test.ts` |
| Wired into `widgets/index.ts` | yes, side-effect import | yes, side-effect import |
| Named exports / no `any` | yes | yes |
| Factory name | `createAlert` | `alert` |
| Props type | `interface AlertProps extends WidgetProps` | `type AlertProps = { … }` |
| Optional-prop default | `props.tone ?? "info"` | destructuring default |
| Invented API surface | none | `ALERT_TONES` const + runtime tone validation |
| Factory/type re-exported from barrel | no | yes |
| `app/src/index.ts` (entry point) | untouched | **modified** to widen the public API |
| Barrel-only `widgets/index.test.ts` | **yes** | **no** — assertions folded into the colocated test |
| Ran the skill's `## Verify` greps | yes | no |
| Self-corrections needed | none | one (missing `vitest` imports) |
| Tests / typecheck | 6/6 in 2 files, clean | 4/4 in 1 file, clean |

Two rows are worth more than they look.

**The type alias is not cosmetic.** A bare `interface AlertProps { … }` has no
implicit index signature and would *not* satisfy `register<P extends WidgetProps>`.
A `type` alias does. So B's workaround compiles, and `tsc` cannot flag the
divergence — the constraint the skill spells out is invisible to tooling.

**B's registry assertions cannot fail.** They live in the widget's own test file,
and because the barrel also re-exports from `./alert.js`, that re-export loads the
module and runs `register()` on its own. Delete the `import "./alert.js";` line and
B's tests still pass while `create("alert", …)` breaks for real consumers. A's
barrel-only `widgets/index.test.ts` is the file that does fail in that scenario —
which is the whole reason the skill specifies it.

## Conclusion

With the worked example removed, the skill made a decisive difference. Run A
produced the house pattern exactly — and its `alert.ts` is byte-identical to what
the same prompt produces in the full repo with `badge.ts` present, meaning the skill
alone reconstructed the convention with nothing to copy. Run B, given the same
registry and the same prompt, diverged on file layout, factory naming, the
`WidgetProps` constraint, defaulting style, public API surface, and test strategy,
and shipped a registry test that cannot fail.

The honest qualifier is that this gap only appears once `badge.ts` is gone. Run in
the repo as it ships, the same A/B produced a byte-identical `alert.ts` on both
sides and differed only by the barrel-only test. The seeded example is that good: it
demonstrates the layout, the naming, the `??`, the `.js` import extension and the
`register()` call all at once, and a capable model copies it faithfully.

So the skill's value is inversely proportional to how authoritative the nearest
example is. That is the useful conclusion, because the condition this experiment
manufactured — no single file that reliably shows the house pattern — is the
condition every codebase drifts toward as it grows, as widgets accumulate variants,
and as no one file stays canonical. The skill is insurance against the example
becoming untrustworthy, and its `## Verify` section pays off immediately regardless,
since a colocated test structurally cannot catch a missing side-effect import.

