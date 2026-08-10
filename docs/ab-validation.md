# A/B validation (Task D)

**Skill under test:** `creating-widget`
**Prompt (same for A and B):** the change request from `materials/ab-task.md` (add an `alert` widget).
**Tool used:** Claude Code

## Result A — skill available

The AI followed the golden path exactly:

1. Created `app/src/widgets/alert/alert.ts` with:
   - `AlertProps` interface extending `WidgetProps`, with `message: string` and `tone?: "info" | "warn" | "error"`
   - Pure function `createAlert(props: AlertProps): string` returning `<div class="alert alert--{tone}">{message}</div>`
   - HTML escaping via `escapeHtml()` function for XSS protection
   - Tone validation via whitelist (`["info", "warn", "error"]`)
   - Module-level `register("alert", createAlert)` call
   - Named export only, no default export, no `any`
2. Created `app/src/widgets/alert/alert.test.ts` colocated — **8 comprehensive vitest tests:**
   - ✅ `is discoverable via listWidgets()`
   - ✅ `renders with default info tone`
   - ✅ `renders with explicit tone`
   - ✅ `escapes HTML in message` (XSS protection verified)
   - ✅ `rejects invalid tone and defaults to info` (tone validation verified)
   - ✅ `throws when message is not a string` (message-type validation)
   - ✅ `throws when message is missing` (message-required validation)
   - ✅ `throws when props is null` (null-safety validated)
3. Updated `app/src/widgets/index.ts` with `import "./alert/alert.js";`
4. `cd app && npm test` — 10 tests pass (2 badge + 8 alert)

## Result B — skill removed

The AI created the golden path architecture but with a critical gap between tests and implementation:

1. Created `app/src/widgets/alert/alert.ts` with:
   - `AlertProps` interface extending `WidgetProps`, with `message: string` and `tone?: "info" | "warn" | "error"`
   - Pure function `createAlert(props: AlertProps): string`
   - **No HTML escaping** — vulnerable to XSS: `` `<div class="alert alert--${tone}">${props.message}</div>` ``
   - **No tone validation** — accepts any value: `const tone = props.tone ?? "info"`
   - Module-level `register("alert", createAlert)` call
   - Named export only
2. Created `app/src/widgets/alert/alert.test.ts` colocated — **8 vitest tests with misalignment:**
   - ✅ `is discoverable via listWidgets()` (works)
   - ✅ `renders with default info tone` (works)
   - ✅ `renders with explicit tone` (works)
   - ❌ `escapes HTML in message` — **test expects feature not implemented**
   - ❌ `rejects invalid tone and defaults to info` — **test expects feature not implemented**
   - ❌ `throws when message is not a string` — **test expects feature not implemented**
   - ❌ `throws when message is missing` — **test expects feature not implemented**
   - ❌ `throws when props is null` — **test expects feature not implemented**
3. Updated `app/src/widgets/index.ts` with `import "./alert/alert.js";`
4. `cd app && npm test` — **5 out of 8 alert tests fail** (security + validation tests against unprotected code)

## Difference table

| Aspect | A (skill available) | B (skill removed) |
|---|---|---|
| File location | `app/src/widgets/alert/alert.ts` | `app/src/widgets/alert/alert.ts` |
| Registered via `register()` | yes — module-level call | yes — module-level call |
| Colocated test added | yes — 8 tests | yes — 8 tests |
| Wired into `widgets/index.ts` | yes | yes |
| Named exports / no `any` | yes | yes |
| HTML escaping implemented | ✅ yes — `escapeHtml()` | ❌ no — vulnerable code |
| Tone validation implemented | ✅ yes — whitelist check | ❌ no — unvalidated input |
| Message validation implemented | ✅ yes — type + required checks | ❌ no — unvalidated input |
| Tests match implementation | ✅ all 8 pass | ❌ 5/8 fail (misalignment) |

## Conclusion

**The skill prevented a dangerous quality gap.** Both runs correctly identified the architecture (file layout, registration, wiring). However, Result B exposed a critical flaw: it wrote comprehensive security tests (`escapeHtml`, `tone` validation, null safety) but did not implement the features being tested — 5 of 8 alert tests failed because the implementation lacked HTML escaping, validation, and null safety. Result A with the skill guidance ensured code and tests align. This is the skill's real value — not "architecture direction" but **quality alignment**: catching the gap between security requirements (verified by tests) and vulnerable code that lacked the necessary protections. Without the skill, security gaps discovered during testing remain as unimplemented vulnerabilities.
