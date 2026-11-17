# Workout App — PWA для тренувань (iPhone)

Особистий застосунок для тренувань, калорій і ваги тіла. Відкривається в Safari на iPhone
і додається на головний екран. **Без бекенду**: усі дані лише на пристрої (IndexedDB), працює офлайн.

## Стек
- **Vite** + **чистий JS** (ES-модулі, без фреймворку). DOM будуємо хелпером `h()` з `src/lib/dom.js`.
- **vite-plugin-pwa** (Workbox) генерує service worker і manifest. `registerType: 'prompt'` — нова версія
  показує плашку «Оновити» (`main.js`), а не перезавантажує сторінку посеред введення. У dev SW вимкнений.
- **idb**: обгортка над IndexedDB (з етапу 1).
- **Chart.js**: графіки (з етапу 3), імпортувати лише потрібні модулі (tree-shaking).
- Іконки PWA генеруються з `public/icon.svg` командою `npm run icons` (`pwa-assets.config.js`).

## Команди
- `npm run dev`: дев-сервер, доступний у локальній мережі (`--host`), щоб відкрити з iPhone.
- `npm run build`: збірка в `dist/`. Для GitHub Pages потрібен `BASE_PATH=/<repo>/` (його задає workflow).
- `npm run preview`: перегляд збірки.
- Деплой: push у `main` → `.github/workflows/deploy.yml` → GitHub Pages.

## Структура
```
src/
  main.js            # каркас, маршрути, реєстрація SW
  router.js          # хеш-роутер (#/path/:param); хеш, бо GitHub Pages і PWA
  styles/            # tokens.css (CSS-змінні), base.css, components.css
  lib/               # dom.js (h, svg), далі: calc.js, dates.js, backup.js, charts.js
  components/        # tabbar, page (заголовок + порожній стан), toast, icons, далі: BodyMap…
  db/                # IndexedDB: db.js (схема/міграції) + модулі доступу на кожне сховище
  data/              # exercises.json (вбудовані вправи), muscles.js
  views/<розділ>/    # workout, exercises, nutrition, weight, more
```
Нижня навігація: Тренування · Вправи · Їжа · Вага · Ще.

## Домовленості
- **Інтерфейс лише українською.** Ідентифікатори в коді англійською, коментарі коротко українською.
- **Мобільний дизайн під iPhone:** темна тема, кольори лише через CSS-змінні з `tokens.css`. Натискні зони від 48px.
  Шрифт полів ≥ 16px (інакше iOS зумить). Враховувати safe-area (`--safe-top/bottom/left/right`).
- Кожен екран — функція `xxxView(params)`, яка повертає DOM-вузол (може бути async).
- Ніяких зовнішніх CDN під час роботи: усе в бандлі, щоб працювало офлайн.
- Одиниці: кілограми. Крок ваги на степері 2.5 кг (гантелі 1 кг).
- Дати днів зберігаємо рядком `YYYY-MM-DD` у **локальному** часовому поясі (не через `toISOString()`).
- Нові поля в даних додаємо через міграцію з підвищенням версії схеми IndexedDB і `schemaVersion` у бекапі.

## Модель даних (IndexedDB)
| Сховище | Поля | Індекси |
|---|---|---|
| `exercises` | id, name, group, primary[], secondary[], equipment, steps[], mistakes[], custom | group |
| `workouts` | id, date, startedAt, finishedAt, note, exercises: [{exerciseId, sets: [{reps, weight}]}], exerciseIds[] | date, exerciseIds (multiEntry) |
| `meals` | id, date, time, name, kcal, protein?, fat?, carbs? | date |
| `bodyWeight` | date (ключ), kg | — |
| `meta` | profile, activeWorkout (чернетка), schemaVersion | — |

- Вбудовані вправи лежать у `src/data/exercises.json` (у бандлі) зі стабільними id (`bench-press`),
  а в IndexedDB лише власні (`custom: true`). При показі списки об'єднуються.
- Групи для UI (груди, спина, ноги, плечі, біцепс, трицепс, прес…) окремо від анатомічних м'язів для SVG:
  chest, front_delts, side_delts, rear_delts, biceps, triceps, forearms, abs, obliques, traps, lats,
  upper_back, lower_back, glutes, quads, hamstrings, adductors, calves.
- Формули: 1ПМ (Епплі) = w × (1 + reps/30); об'єм = Σ reps × weight;
  Mifflin-St Jeor: ч 10w + 6.25h − 5a + 5, ж … − 161; активність 1.2/1.375/1.55/1.725/1.9;
  ціль: −15% / 0 / +10%.
- Бекап: `{ app: 'workout-app', schemaVersion, exportedAt, data: {...} }`, при імпорті «замінити» або «об'єднати».

## Особливості iOS
- Service worker працює лише через HTTPS, тож по `http://192.168.x.x` офлайн не перевірити.
  Офлайн і «На початковий екран» перевіряємо на задеплоєній версії.
- У застосунку з головного екрана **окреме сховище** від вкладки Safari.
- iOS може вивантажити PWA з пам'яті, тому чернетку тренування зберігаємо після кожної зміни.
- Викликати `navigator.storage.persist()` і нагадувати про експорт бекапу.

## Етапи
- [x] 0. Каркас: Vite, PWA, темна тема, вкладки, safe-area, роутер, іконки, workflow деплою
- [x] 1. База вправ: IndexedDB, exercises.json (~70), бібліотека, пошук, власні вправи
- [x] 2. Тренування: активне тренування, підходи, минулий результат, збереження, історія
- [x] 3. Статистика вправи: графіки (макс. вага, 1ПМ, об'єм), історія
- [x] 4. Інформація про вправу: SVG-силует (спереду/ззаду), техніка, помилки
- [x] 5. Калорії: калькулятор норми, щоденник, історія + графік
- [x] 6. Вага тіла: записи, графік (тиждень/місяць/усе), зміна від початку
- [x] 7. Експорт/імпорт JSON, storage.persist, шліфування
- [ ] 8. (опц.) Таймер відпочинку між підходами — відкладено, не потрібен

## Корисні компоненти та нотатки
- `page({ title, back, actions, headerExtra }, ...content)` — каркас екрана (`components/page.js`).
- `createExerciseBrowser({ exercises, state, renderRow })` — пошук + фільтр груп + список вправ
  (бібліотека й вибір вправи в тренуванні). Пошук завжди по всій базі (фільтр скидається на «Усі»).
  Чип «Мої» (`history` з `exerciseHistoryIndex()`) — виконані вправи, від останньої; типовий, якщо є історія.
- `createWorkoutEditor({ workout, onChange, excludeId, before })` — редактор тренування
  (активне тренування й редагування збереженого). Мутує `workout`, показує минулий результат.
- `openSheet({ title, content, full })` / `actionSheet(title, actions)` — нижні панелі (`components/sheet.js`).
- `lib/format.js` — дати (локальні YYYY-MM-DD), числа з комою, `parseNum`, `plural`, `setsSummary`.
  `lib/calc.js` — об'єм, 1ПМ (Епплі), макс. вага.
- `lib/charts.js` — `lineChart(canvas, { points, formatX, formatY, tooltip })` (Chart.js, лише потрібні модулі),
  `whenConnected`, `destroyCharts()` викликається при кожній зміні екрана. Одна серія = без легенди,
  точки ховаються при >20 значеннях, вертикальний курсор + підказка при дотику.
- `components/segmented.js` — перемикач у стилі iOS. `components/ring.js` — кільце прогресу.
- `lib/nutrition.js` — Mifflin-St Jeor (`calcTargets`), рівні активності, цілі, типи прийомів їжі, `kcalFromMacros`.
  `db/nutrition.js` — профіль (`meta.profile`), прийоми їжі, `dailyTotals`, `recentMeals`.
  `barChart(...)` у `lib/charts.js` — стовпчики по днях + пунктирна лінія норми.
- `db/weight.js` — `saveWeight` (один запис на день, ключ = дата) також оновлює `profile.weight`,
  якщо це найсвіжіший запис — норма калорій підлаштовується під актуальну вагу.
- `lib/backup.js` — експорт (`exportData`, `deliverFile`: Web Share → «Зберегти у Файли», інакше download),
  `parseBackup` (перевірка app/schemaVersion/записів), `importData(backup, "merge" | "replace")`,
  `getBackupStatus` (крапка на вкладці «Ще», якщо копії не було > 7 днів), `wipeAllData`.
  Нове сховище чи поле → додати в `STORES`/валідатори бекапу.
- `refresh({ keepScroll: true })` — перемалювати екран без скидання прокрутки (після збереження в нижній панелі).
- `components/body-map.js` — `bodyMap({ primary, secondary })` → силует спереду/ззаду, метод `.update()`.
  Координати — ліва половина фігури (x<100), права — дзеркальна копія. Кожен id з `MUSCLES` має
  бути намальований хоча б в одному вигляді (FRONT / BACK). Тап по м’язу → назва в toast.
- Роутер веде стек переходів: `goBack(fallback)`, `refresh()`, прокрутка відновлюється при поверненні.
  Після збереження/видалення на екрані, куди прийшли з іншого, — `goBack`, а не `navigate(replace)`
  (інакше в історії браузера з'являються дублікати).
- Тренування зберігають знімок назви вправи (`name`), тож видалення власної вправи не ламає історію.
- Чернетка активного тренування — `meta['activeWorkout']`, зберігається на кожну зміну;
  порожні підходи (без повторень) відкидаються при завершенні (`cleanWorkout`).
- IndexedDB у headless-Edge з `--virtual-time-budget` не встигає відпрацювати — для автоперевірок
  керувати браузером через CDP (реальний час), а не через `--dump-dom`. Після `location.reload()`
  заново підміняти `window.confirm`, інакше headless зависає на діалозі.

## Як працюємо
- По одному етапу. Після кожного пояснюємо, як запустити й перевірити на iPhone.
- Після кожного етапу: коміт + push у `main` (автодеплой на https://slav1k2122.github.io/workout-app/).
- Оновлювати чекліст етапів у цьому файлі.
