# A/B validation (Task D)

> Copy to `docs/ab-validation.md` and fill in. Run the SAME prompt twice — once
> with your `creating-widget` skill available, once with it temporarily
> **moved entirely out of `.agents/skills/`** (e.g. to a repo-root scratch
> folder: `mv .agents/skills/creating-widget /tmp/creating-widget-disabled`,
> or just `git rm -r .agents/skills/creating-widget` and `git checkout --
> .agents/skills/creating-widget` afterward to restore it) — in a NEW chat
> each time. Just renaming the folder in place (e.g. adding a `.off` suffix)
> is NOT reliable: some tools discover any `SKILL.md` found anywhere under
> `.agents/skills/`, so a renamed-but-still-nested folder can still get
> picked up.

**Skill under test:** `creating-widget`
**Prompt (same for A and B):** the change request from `materials/ab-task.md`
(add an `alert` widget).
**Tool used:** Codex

## Result A — skill available

I’ll use the project’s creating-widget skill for this, since the request is exactly adding a new widget in app/src/widgets. I’m first loading its instructions, then
I’ll inspect the existing badge pattern and wire the alert in the same way.

• Explored
└ Read SKILL.md (creating-widget skill)
List .codegraph

───────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────

• There’s no .codegraph/ index in this repo, so I’m using the local files directly. Next I’m reading the badge widget, registry, widget index, and tests to keep the
alert implementation aligned with the current contract.

• Explored
└ Read badge.test.ts, badge.ts, index.ts, registry.ts
List app

The badge uses a tiny pure factory with tone ?? "info" and a module-level register(...); widgets/index.ts is the discoverability root. I’m adding the alert files now
and importing the module there so its registration runs.

• Explored
└ Read spinner.ts, spinner.test.ts

• Ran git status --short
└ A  docs/ab-validation.md

There’s one unrelated untracked doc already present, so I’m leaving it alone. The alert change is scoped to app/src/widgets/alert plus the widget index.

• Edited 3 files (+30 -0)
└ app/src/widgets/alert/alert.test.ts (+16 -0)
1 +import { describe, expect, it } from "vitest";                                                                                                                 
2 +import { createAlert } from "./alert.js";                                                                                                                      
3 +                                                                                                                                                               
4 +describe("createAlert", () => {                                                                                                                                
5 +  it("defaults to the info tone", () => {                                                                                                                      
6 +    expect(createAlert({ message: "Heads up" })).toBe(                                                                                                         
7 +      '<div class="alert alert--info">Heads up</div>',                                                                                                         
8 +    );                                                                                                                                                         
9 +  });                                                                                                                                                          
10 +                                                                                                                                                               
11 +  it("respects an explicit tone", () => {                                                                                                                      
12 +    expect(createAlert({ message: "Check failed", tone: "error" })).toBe(                                                                                      
13 +      '<div class="alert alert--error">Check failed</div>',                                                                                                    
14 +    );                                                                                                                                                         
15 +  });                                                                                                                                                          
16 +});

└ app/src/widgets/alert/alert.ts (+13 -0)
1 +import { register, type WidgetProps } from "../../core/registry.js";                                                                                           
2 +                                                                                                                                                               
3 +export interface AlertProps extends WidgetProps {                                                                                                              
4 +  message: string;                                                                                                                                             
5 +  tone?: "info" | "warn" | "error";                                                                                                                            
6 +}                                                                                                                                                              
7 +                                                                                                                                                               
8 +export function createAlert(props: AlertProps): string {                                                                                                       
9 +  const tone = props.tone ?? "info";                                                                                                                           
10 +  return `<div class="alert alert--${tone}">${props.message}</div>`;                                                                                           
11 +}                                                                                                                                                              
12 +                                                                                                                                                               
13 +register("alert", createAlert);

└ app/src/widgets/index.ts (+1 -0)
2  // bundle entry point's dependency root for the bundle-size exercise.
3 +import "./alert/alert.js";                                                                                                                                      
4  import "./badge/badge.js";

───────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────

• The widget is now implemented and registered through the same module-import mechanism as the existing widgets. I’m running the project test suite and the specific
registration/import checks from the skill.

• Explored
└ Search register\("alert" in alert.ts
Search import "\./alert/alert\.js" in index.ts

• Ran npm test
└
> udc-ws05-app@1.0.0 test
… +12 lines (ctrl + t to view transcript)
Duration  264ms (transform 157ms, setup 0ms, collect 176ms, tests 4ms, environment 0ms, prepare 143ms)


───────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────

• Tests pass, and the registration/import checks both match. I’m doing one final diff review so the close-out can point to the exact files changed.

• Ran git diff -- app/src/widgets/alert/alert.ts app/src/widgets/alert/alert.test.ts app/src/widgets/index.ts
└ diff --git a/app/src/widgets/index.ts b/app/src/widgets/index.ts
index 6c18edb..a52f735 100644
… +7 lines (ctrl + t to view transcript)
import "./spinner/spinner.js";


• Ran git status --short
└  M app/src/widgets/index.ts
A  docs/ab-validation.md
?? app/src/widgets/alert/

───────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────

• Added the alert widget.

Changes:

- app/src/widgets/alert/alert.ts: createAlert({ message, tone }), default tone is "info", renders <div class="alert alert--{tone}">{message}</div>, registers as
  "alert".

- app/src/widgets/alert/alert.test.ts: covers default and explicit tone rendering.
- app/src/widgets/index.ts: imports ./alert/alert.js so the widget is discoverable through the registry.

Verified:

- cd app && npm test passes: 3 files, 6 tests.
- Confirmed register("alert", createAlert);
- Confirmed widgets/index.ts imports the alert module.

Note: docs/ab-validation.md was already untracked before my changes; I left it untouched.


## Result B — skill removed

• I’ll inspect the indexed project structure first, then follow the existing badge widget pattern so the new widget uses the library’s registration path rather than
inventing a parallel one.

• Ran test -d .codegraph && codegraph explore "badge widget registration alert widget where to add new widget" || true
└ (no output)

• Explored
└ Search SKILL.md in skills

• Ran git status --short
└ D  .agents/skills/creating-widget/SKILL.md

───────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────

• There’s no active creating-widget skill available in this checkout; the tracked file appears deleted already. I’m going to use the local architecture skill for the
implementation boundaries, then read the badge files directly.

• Explored
└ List ls -a
Read SKILL.md (architecture-deep-dive skill)
List app

───────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────

• The architecture guidance confirms widgets are pure HTML-string factories that self-register on module load. I’m reading the widget index, registry contract, and
badge tests now to mirror the existing public behavior.

• Explored
└ Read architecture.md, badge.ts, registry.ts, badge.test.ts, index.ts

───────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────

• The badge implementation is minimal: props type, default tone, pure factory, and one top-level register. I’m adding the alert folder plus a registration import and
tests that cover both direct rendering and discoverability through create/listWidgets.

• Explored
└ Read package.json, spinner.ts, spinner.test.ts

───────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────

• I’m editing only the new widget module, its colocated test, and the widget registration root. The registry API stays untouched.

• Edited 3 files (+38 -0)
└ app/src/widgets/alert/alert.test.ts (+24 -0)
1 +import { describe, expect, it } from "vitest";                                                                                                                 
2 +import { createAlert } from "./alert.js";                                                                                                                      
3 +import { create, listWidgets } from "../index.js";                                                                                                             
4 +                                                                                                                                                               
5 +describe("createAlert", () => {                                                                                                                                
6 +  it("defaults to the info tone", () => {                                                                                                                      
7 +    expect(createAlert({ message: "Heads up" })).toBe(                                                                                                         
8 +      '<div class="alert alert--info">Heads up</div>',                                                                                                         
9 +    );                                                                                                                                                         
10 +  });                                                                                                                                                          
11 +                                                                                                                                                               
12 +  it("respects an explicit tone", () => {                                                                                                                      
13 +    expect(createAlert({ message: "Careful", tone: "warn" })).toBe(                                                                                            
14 +      '<div class="alert alert--warn">Careful</div>',                                                                                                          
15 +    );                                                                                                                                                         
16 +  });                                                                                                                                                          
17 +                                                                                                                                                               
18 +  it("is discoverable through the widget registry", () => {                                                                                                    
19 +    expect(listWidgets()).toContain("alert");                                                                                                                  
20 +    expect(create("alert", { message: "Broken", tone: "error" })).toBe(                                                                                        
21 +      '<div class="alert alert--error">Broken</div>',                                                                                                          
22 +    );                                                                                                                                                         
23 +  });                                                                                                                                                          
24 +});

└ app/src/widgets/alert/alert.ts (+13 -0)
1 +import { register, type WidgetProps } from "../../core/registry.js";                                                                                           
2 +                                                                                                                                                               
3 +export interface AlertProps extends WidgetProps {                                                                                                              
4 +  message: string;                                                                                                                                             
5 +  tone?: "info" | "warn" | "error";                                                                                                                            
6 +}                                                                                                                                                              
7 +                                                                                                                                                               
8 +export function createAlert(props: AlertProps): string {                                                                                                       
9 +  const tone = props.tone ?? "info";                                                                                                                           
10 +  return `<div class="alert alert--${tone}">${props.message}</div>`;                                                                                           
11 +}                                                                                                                                                              
12 +                                                                                                                                                               
13 +register("alert", createAlert);

└ app/src/widgets/index.ts (+1 -0)
4  import "./spinner/spinner.js";
5 +import "./alert/alert.js";                                                                                                                                      
6

───────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────

• The new alert widget is in place. I’m running the project’s normal checks from app/: Vitest, TypeScript, and the esbuild bundle.

• Ran npm run build
└ dist/bundle.js — 661 bytes

• Ran npm run typecheck
└
> udc-ws05-app@1.0.0 typecheck
> tsc --noEmit


• Ran npm test
└
> udc-ws05-app@1.0.0 test
… +12 lines (ctrl + t to view transcript)
Duration  298ms (transform 136ms, setup 0ms, collect 156ms, tests 4ms, environment 0ms, prepare 143ms)


───────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────

• All three checks passed. I’m doing a final diff/status pass so I can report exactly what changed and avoid mixing in the pre-existing deleted skill file.

• Ran git diff -- app/src/widgets/index.ts app/src/widgets/alert/alert.ts app/src/widgets/alert/alert.test.ts
└ diff --git a/app/src/widgets/index.ts b/app/src/widgets/index.ts
index 6c18edb..377b0ba 100644
… +7 lines (ctrl + t to view transcript)

     export { listWidgets, create } from "../core/registry.js";

• Ran git status --short
└ D  .agents/skills/creating-widget/SKILL.md
M app/src/widgets/index.ts
?? app/src/widgets/alert/

───────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────

• Implemented the new alert widget.

Changes:

- Added app/src/widgets/alert/alert.ts with createAlert, AlertProps, default tone = "info", and register("alert", createAlert).
- Added app/src/widgets/alert/alert.test.ts covering default tone, explicit tone, and registry discoverability.
- Updated app/src/widgets/index.ts to import the alert module for registration.

Verification passed:

- npm test: 7 tests passed
- npm run typecheck: passed
- npm run build: passed, dist/bundle.js is 661 bytes

Note: .agents/skills/creating-widget/SKILL.md was already deleted before my changes; I left it untouched.

## Difference table

| Aspect | A (skill available) | B (skill removed) |
|---|---|---|
| File location | Correct: added `app/src/widgets/alert/alert.ts` and `app/src/widgets/alert/alert.test.ts`. | Also correct: added `app/src/widgets/alert/alert.ts` and `app/src/widgets/alert/alert.test.ts`. |
| Registered via `register()` | Yes: `register("alert", createAlert)` at module load. | Yes: `register("alert", createAlert)` at module load. |
| Colocated test added | Yes: tested default `info` tone and explicit `error` tone. | Yes, and more broadly: tested default tone, explicit `warn` tone, and registry discoverability via `create()` / `listWidgets()`. |
| Wired into `widgets/index.ts` | Yes: imported `./alert/alert.js` so registration runs through the widget root. | Yes: imported `./alert/alert.js` so registration runs through the widget root. |
| Named exports / no `any` | Yes: exported `AlertProps` and `createAlert`; used typed tone union; no `any`. | Yes: exported `AlertProps` and `createAlert`; used typed tone union; no `any`. |
| Extra guidance used | The run explicitly loaded `creating-widget` and followed its golden path directly. | With `creating-widget` removed, the run had to inspect more context and loaded `architecture-deep-dive` to recover the same boundaries. |
| Verification | Ran `npm test`; 6 tests passed. Also checked `register("alert", createAlert)` and the `widgets/index.ts` import. | Ran `npm test`, `npm run typecheck`, and `npm run build`; 7 tests passed and `dist/bundle.js` was 661 bytes. |

## Conclusion

The `creating-widget` skill changed the path more than the final code: with the skill, the agent immediately followed the intended widget recipe; without it, the agent still produced a correct implementation, but only after gathering more surrounding architecture context. The skill is still useful because it makes the golden path explicit and reduces discovery work, even though this particular no-skill run was rescued by the separate architecture guidance.
