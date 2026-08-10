# Домашнє завдання — Воркшоп 5

**Тема:** Agent Skills
**Формат:** artifacts-first — ви будуєте бібліотеку з 3 скілів для реального
(хай і маленького) проєкту й доводите A/B-тестом, що вони працюють
**Час:** ~2–2.5 години
**Здача:** Pull Request у starter-repo (CodeRabbit зробить авто-рев'ю)

---

## 0. Налаштування

```bash
# форк + клон
gh repo fork koldovsky/2026-udc-05-agent-skills-hw --clone
cd 2026-udc-05-agent-skills-hw

# робоча гілка
git checkout -b ws05/<github-username>

# sample-проєкт (ціль для скілів)
cd app && npm install && npm test && cd ..
```

Що потрібно: **Agentic IDE з підтримкою Agent Skills** (Claude Code, Cursor,
GitHub Copilot та більшість сучасних інструментів підтримують відкритий
стандарт `SKILL.md` — якщо не певні, перевірте `/skills` чи еквівалент вашого
інструмента), Node 22+, GitHub account.

> Скіли пишемо у `.agents/skills/<name>/SKILL.md` — це крос-tool конвенція, яку
> читають Claude Code, Cursor, Copilot, Windsurf, JetBrains AI та інші напряму.
> Якщо ваш інструмент шукає їх деінде (напр. `.claude/skills/`), перевірте його
> документацію — часто достатньо симлінка або копії.

### Що засіяно в репо

| Шлях | Що це |
|---|---|
| `app/src/core/registry.ts` | `register`/`create`/`listWidgets` — **захищений публічний API** |
| `app/src/widgets/badge/` | Єдиний засіяний widget — **патерн**, який кодує ваш Task A скіл |
| `app/src/index.ts` | Entry point для `npm run build` (esbuild) |
| `app/src/*.test.ts` | Наявні тести — усі зелені (`cd app && npm test`) |
| `app/AGENTS.md` | Вже повноцінний baseline — Task A лише **додає** секцію Skills |
| `materials/architecture-brief.md` | Опис задуманої архітектури — **джерело правди** для скілів |
| `materials/ab-task.md` | Задача для A/B-тесту (додати `alert` widget) |
| `docs/templates/` | Скелети: `SKILL-template.md`, `reference-template.md`, `script-template.mjs`, `ab-validation.md`, `task-e-bonus.md` |

> **Спершу прочитайте `materials/architecture-brief.md`** — він пояснює
> golden path для нового widget. Ваші скіли мають кодувати саме цей патерн.

---

## Task A — простий skill: `creating-widget` _(~25 хв)_

**Мета:** упакувати повторювану експертизу («як створити новий widget у цьому
проєкті») у portable інструкцію.

1. Створіть `.agents/skills/creating-widget/SKILL.md` за шаблоном
   `docs/templates/SKILL-template.md`. Frontmatter — `name` + `description`
   (опишіть, КОЛИ агент має підвантажувати цей скіл — напр. «коли просять
   додати новий widget/компонент до бібліотеки»).
2. В Instructions закодуйте реальний golden path з
   `materials/architecture-brief.md`: `app/src/widgets/<name>/<name>.ts` (pure
   factory + `register()`), колокований `<name>.test.ts`, імпорт у
   `app/src/widgets/index.ts`.
3. Додайте секцію `## Verify` — як перевірити, що widget зроблено правильно
   (напр. `cd app && npm test`, `grep register(` у новому файлі).
4. Додайте до `app/AGENTS.md` секцію `## Skills`, що перелічує всі три скіли
   цього завдання з коротким описом (поки що можна лише цей перший — інші
   допишете після Task B/C).
5. **Перевірте**: у новому чаті попросіть агента «додай widget `spinner`» (без
   деталей структури) і подивіться, чи він сам знайшов і застосував скіл.

**Перевірка:** `SKILL.md` має реальний frontmatter і конкретні (не generic)
інструкції; `app/AGENTS.md` містить секцію Skills.

> Порада: `description` — єдине, що агент бачить ЗАВЖДИ (навіть коли скіл не
> застосовується). Занадто широкий опис = скіл підвантажується не там, де
> треба; занадто вузький = не підвантажується там, де треба.

---

## Task B — skill з `references/`: `architecture-deep-dive` _(~30 хв)_

**Мета:** відчути прогресивне розкриття (progressive disclosure) — SKILL.md
лишається коротким, а глибина живе окремо і підвантажується лише за потреби.

1. Створіть `.agents/skills/architecture-deep-dive/SKILL.md` — коротко:
   метадані + коли використовувати (напр. «коли просять пояснити архітектуру
   або де саме реалізовувати нову фічу»).
2. Створіть `.agents/skills/architecture-deep-dive/references/architecture.md`
   за шаблоном `docs/templates/reference-template.md` — тут і живе глибина:
   опис `registry.ts`, межі модулів, чому widgets саме так влаштовані.
   Звірте кожне твердження проти реального коду `app/src/core/registry.ts` і
   `app/src/widgets/**` — не вигадуйте API.
3. **Перевірте**: попросіть агента «поясни архітектуру цього проєкту» у
   новому чаті — переконайтесь, що відповідь відповідає вашому reference-файлу
   (значить, скіл підвантажив саме його), а не є загальною відповіддю моделі.

**Перевірка:** `SKILL.md` короткий; `references/architecture.md` містить
реальну, перевірену глибину (не дублює SKILL.md і не є порожнім).

---

## Task C — skill зі `scripts/`: `analyzing-bundle-size` _(~30 хв)_

**Мета:** дати скілу здатність робити те, що LLM робить погано з нуля —
запускати реальну команду і читати реальне число.

1. Створіть `.agents/skills/analyzing-bundle-size/SKILL.md` — коротко: коли
   викликати цей скіл (напр. «коли просять оцінити розмір бандла або перевірити
   вплив зміни на bundle size»).
2. Створіть виконуваний скрипт у
   `.agents/skills/analyzing-bundle-size/scripts/` (шаблон —
   `docs/templates/script-template.mjs`), який реально запускає `npm run
   build` у `app/` і читає розмір `app/dist/bundle.js` — не вигадує число.
3. **Запустіть скрипт самостійно** (`node
   .agents/skills/analyzing-bundle-size/scripts/<name>.mjs` або еквівалент) і
   переконайтесь, що він видає реальний, а не заглушковий, результат.
4. **Перевірте**: попросіть агента «яка зараз вага бандла?» і подивіться, чи
   він викликав скрипт, а не здогадався число.

**Перевірка:** скрипт справді виконує `npm run build` + читає файл; ви
особисто запускали його хоча б раз і бачили реальний вивід.

> CodeRabbit не запускає код (у пісочниці рев'ю немає встановлених
> залежностей) — статичний рев'ю коду скрипта достатній для авто-грейдингу,
> але ваша власна перевірка (крок 3) — те, що доводить, що скіл реально працює.

---

## Task D — A/B-валідація скіла _(~20 хв)_

**Мета:** довести, що скіл справді змінює поведінку AI (єдиний надійний
спосіб — порівняти зі скілом і без нього).

1. Візьміть промпт із `materials/ab-task.md` (додати `alert` widget). **Не
   переформульовуйте його між прогонами.**
2. **A (скіл доступний):** дайте цей промпт у **новому** чаті → збережіть, що
   зробив AI (чи знайшов правильну структуру, чи викликав `register()`, чи
   додав тест, чи оновив `widgets/index.ts`).
3. **B (скіл прибрано):** тимчасово ПЕРЕМІСТІТЬ теку **повністю за межі**
   `.agents/skills/` (напр. `git rm -r .agents/skills/creating-widget` —
   потім `git checkout -- .agents/skills/creating-widget` поверне її назад).
   ⚠️ Просте перейменування на місці (напр. додати суфікс `.off`) НЕ надійне —
   деякі інструменти шукають будь-який `SKILL.md` під `.agents/skills/`
   рекурсивно, тож перейменована, але й досі вкладена тека може підхопитися.
   **Той самий** промпт, **новий** чат → збережіть результат.
4. Заповніть `docs/ab-validation.md` (шаблон —
   `docs/templates/ab-validation.md`): результат A, результат B, таблиця
   відмінностей, висновок.
5. Якщо лишаєте зміну (варіант A) як реальний коміт — переконайтесь, що
   `cd app && npm test` зелений. Якщо ні — `git checkout -- app/src/widgets/`
   (і відкотіть `widgets/index.ts`) після фіксації обох результатів.

**Перевірка:** `docs/ab-validation.md` показує **конкретну** різницю зі скілом
vs без нього (не плейсхолдери); `cd app && npm test` зелений.

---

## Task E (bonus) — оберіть один шлях _(~15 хв)_

**Мета:** відчути крос-tool переносність скілів АБО спробувати community skill.

Заповніть **один** розділ у `docs/task-e-bonus.md` (шаблон —
`docs/templates/task-e-bonus.md`):

- **Шлях 1 — крос-tool перевірка:** той самий скіл, без змін, у **другому**
  інструменті (напр. скопіюйте `.agents/skills/creating-widget/` у
  `.claude/skills/creating-widget/`). Той самий промпт в обох — підхопився без
  доробок?
- **Шлях 2 — community skill:** встановіть один скіл із
  [github.com/anthropics/skills](https://github.com/anthropics/skills),
  спробуйте його в цьому репо, задокументуйте, що знадобилось адаптувати.

**Перевірка:** `docs/task-e-bonus.md` заповнений для ОДНОГО шляху повністю (не
обидва наполовину). Необов'язкове; відсутність — не помилка.

---

## Definition of Done

- [ ] **Task A:** `.agents/skills/creating-widget/SKILL.md` + `app/AGENTS.md` секція «## Skills»
- [ ] **Task B:** `.agents/skills/architecture-deep-dive/SKILL.md` + `references/architecture.md`
- [ ] **Task C:** `.agents/skills/analyzing-bundle-size/SKILL.md` + `scripts/*` (реально виконується)
- [ ] **Task D:** `docs/ab-validation.md` — реальна різниця зі скілом vs без нього
- [ ] **Task E (bonus):** `docs/task-e-bonus.md` (опціонально)
- [ ] `cd app && npm test` зелений
- [ ] Жодних реальних секретів/PII у PR

## Здача

```bash
git add -A
git commit -m "WS5: <ім'я> — agent skills"
git push -u origin ws05/<github-username>
gh pr create --title "WS5: <ім'я>" --fill
```

CodeRabbit автоматично відрев'ює PR за цим чек-лістом. Питання — у чат курсу
(фідбек до 2 тижнів). Сертифікат — за умови виконання всіх домашок курсу.
