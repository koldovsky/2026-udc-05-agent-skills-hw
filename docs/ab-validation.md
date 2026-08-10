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

Ізольований повторний прогін на чистому worktree від `HEAD` (`ab-result-b-clean`),
агент: [Alert without skill (clean)](083a2089-8c56-43a3-93b1-3d69180fed36).

**Baseline перед промптом (без залишків Result A):**

- `app/src/widgets/alert/` відсутня
- у `app/src/widgets/index.ts` **немає** `import "./alert/alert.js"` (лише badge + spinner)
- `.agents/skills/creating-widget/` переміщено за межі skills у `_disabled-skills/creating-widget`
- рядок про `creating-widget` прибрано з `app/AGENTS.md` → `## Skills`

**Фактичний результат:**

- AI **не** відкривав `creating-widget/SKILL.md` — патерн узяв з `badge.ts` / `badge.test.ts` і `app/AGENTS.md` (також глянув spinner).
- Створив `app/src/widgets/alert/alert.ts` — pure `createAlert`, `tone` default `"info"`, `register("alert", createAlert)`.
- Додав colocated `app/src/widgets/alert/alert.test.ts` (default + explicit tone).
- **Оновив** `app/src/widgets/index.ts` — додав `import "./alert/alert.js";` (wire-up виконано без залишку A).
- Запустив `npm test` (зелений) і `npm run typecheck` (зелений).
- Named exports, без `any`, `registry.ts` не чіпав.
- Checklist скіла як явний план не використовувався — ad-hoc mirror існуючих widgets.

> Попередній Result B (чат `d2aa073d-…`) був забруднений: import alert уже лежав у
> `index.ts` після A, тож «пропуск wire-up» був артефактом baseline, не чистої
> поведінки без скіла. Цей розділ замінює його ізольованим прогоном.

## Difference table

| Aspect | A (skill available) | B (skill removed, clean baseline) |
|---|---|---|
| File location | `app/src/widgets/alert/alert.ts` | `app/src/widgets/alert/alert.ts` (mirror badge) |
| Registered via `register()` | yes | yes |
| Colocated test added | yes | yes |
| Wired into `app/src/widgets/index.ts` | yes — додав import | yes — додав import (на чистому index без alert) |
| Named exports / no `any` | yes | yes |
| Process | прочитав SKILL.md → golden-path checklist | без скіла; ad-hoc mirror badge / AGENTS.md |
| Verify | `npm test` + `typecheck` (зі скіла) | `npm test` + `typecheck` (сам вирішив запустити) |

## Conclusion

На **чистому** baseline без залишку A структурний результат майже збігся: і зі
скілом, і без нього AI зробив factory + `register()` + colocated test + import у
`index.ts`, тести зелені. Реальна різниця — у **процесі**: A явно підвантажив
`creating-widget` і йшов checklist’ом скіла; B обійшовся без нього, копіюючи
`badge`. Раніше задокументований «пропуск wire-up» у B **не відтворився** без
контамінації від A — discoverability підказало формулювання промпта («Make it
discoverable the same way every other widget is») плюс наявні імпорти badge/spinner.
