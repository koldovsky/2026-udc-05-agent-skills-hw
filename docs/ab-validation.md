# A/B validation (Task D)

**Skill under test:** `creating-widget`
**Prompt (same for A and B):** the change request from `materials/ab-task.md`
(add an `alert` widget).
**Tool used:** Cursor (Agent)

## Result A — skill available

Новий чат ([Alert with skill](390a7828-c3b1-49e3-9ae6-6f0789ac5e77)), скіл на місці.

- AI **одразу прочитав** `.agents/skills/creating-widget/SKILL.md`, потім `badge` як еталон.
- Створив `app/src/widgets/alert/alert.ts` — pure `createAlert`, `tone` з default `"info"`, `register("alert", createAlert)` на load.
- Додав colocated `app/src/widgets/alert/alert.test.ts` (default + explicit tone).
- **Оновив** `app/src/widgets/index.ts` — `import "./alert/alert.js";`.
- Перевірка за секцією Verify скіла: `npm test` + `npm run typecheck` — обидва зелені.
- Named exports, без `any`, `registry.ts` не чіпав.

## Result B — skill removed

Новий чат ([Alert without skill](d2aa073d-2c88-4e4c-9d75-281789ea7c9d)); скіл прибрано / інструкція «не відновлювати creating-widget».

- AI **не** відкривав `creating-widget/SKILL.md` — копіював патерн з `badge.ts` / `badge.test.ts` і `app/AGENTS.md`.
- Файли `alert.ts` + `alert.test.ts` знову вийшли правильними (той самий HTML і `register()`).
- **`widgets/index.ts` не змінював** — лише зауважив, що import уже є (залишок після прогону A). Без того залишку `create("alert", …)` не був би discoverable.
- Перевірив лише `npm test`; `npm run typecheck` зі скілового Verify **не** запускав.
- Checklist скіла (factory → test → wire-up → verify) не виконувався як явний план — лише дзеркалення badge.

## Difference table

| Aspect | A (skill available) | B (skill removed) |
|---|---|---|
| File location | `widgets/alert/alert.ts` | `widgets/alert/alert.ts` (скопійовано з badge) |
| Registered via `register()` | yes | yes |
| Colocated test added | yes | yes |
| Wired into `widgets/index.ts` | yes — AI сам додав import | no — не чіпав; покладався на вже наявний рядок |
| Named exports / no `any` | yes | yes |
| Process | прочитав SKILL.md → checklist golden path | без скіла; ad-hoc mirror badge |
| Verify | `npm test` + `typecheck` | лише `npm test` |

## Conclusion

Скіл реально змінив поведінку: з ним AI йшов за checklist (зокрема **обов’язковий wire-up у `index.ts`** і повний Verify), без нього — відтворив factory/test з badge, але **пропустив крок discoverability**, бо index уже був «зелений» після A. Різниця варта скіла саме для кроків, які промпт не називає явно (тест, `register()`, import у `index.ts`).
