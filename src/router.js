/**
 * Хеш-роутер: #/шлях/:параметр
 * Хеш (а не History API) — щоб працювало на GitHub Pages без налаштувань сервера
 * і щоб PWA завжди відкривалась з index.html.
 */
const routes = []
let notFound = null

// Наближений стек переходів у межах застосунку: щоб знати, чи можна зробити history.back()
// і чи поточний перехід — це «назад» (для відновлення прокрутки).
const stack = []

/** Реєструє маршрут. view(params) повертає Node (або Promise<Node>). Порядок реєстрації важливий. */
export function route(pattern, view) {
  const keys = []
  const regex = new RegExp(
    '^' + pattern.replace(/\/:(\w+)/g, (_, key) => (keys.push(key), '/([^/]+)')) + '/?$',
  )
  routes.push({ regex, keys, view })
}

export function fallback(view) {
  notFound = view
}

export function currentPath() {
  return location.hash.slice(1) || '/'
}

export function canGoBack() {
  return stack.length > 1
}

export function navigate(path, { replace = false } = {}) {
  if (replace) {
    // заміна запису історії — скасувати її через history.go не вийде, тож питаємо заздалегідь
    if (guard && guard.path !== path) {
      if (!guard.canLeave()) return
      guard = null
    }
    stack.pop()
    location.replace('#' + path)
  } else location.hash = path
}

/** Назад у межах застосунку або на запасний шлях, якщо історії немає. */
export function goBack(fallbackPath) {
  if (canGoBack()) history.back()
  else navigate(fallbackPath, { replace: true })
}

let onChange = () => {}

/**
 * Перемальовує поточний екран (напр. після зміни даних без зміни шляху).
 * refresh({ keepScroll: true }) — зберегти позицію прокрутки.
 */
export function refresh(opts = {}) {
  onChange(opts)
}

// ---------- Захист від виходу з незбереженими змінами ----------
let guard = null // { path, canLeave: () => boolean }
let restoring = null // шлях, на який повертаємось після скасованого виходу

/**
 * Поточний екран має незбережені зміни: canLeave() повертає true, якщо можна йти
 * (напр. змін немає або користувач підтвердив). Знімається при виході з екрана.
 */
export function setLeaveGuard(canLeave) {
  guard = { path: currentPath(), canLeave }
}

export function clearLeaveGuard() {
  guard = null
}

/** Чи можна зараз покинути екран (для перезавантаження при оновленні тощо). */
export function confirmLeave() {
  return !guard || guard.canLeave()
}

/**
 * Запускає роутер. render(node, { path, isBack, keepScroll }) викликається на кожну зміну маршруту.
 * renderError(err) повертає вузол екрана помилки, якщо екран не вдалося побудувати.
 */
export function startRouter(render, { renderError } = {}) {
  let seq = 0
  onChange = async (opts = {}) => {
    const path = currentPath()
    const isBack = stack.length > 1 && stack[stack.length - 2] === path

    // повернулись на екран після скасованого виходу — нічого не перемальовуємо
    if (restoring !== null) {
      const wasRestoring = restoring === path
      restoring = null
      if (wasRestoring) return
    }
    if (guard && guard.path !== path) {
      if (!guard.canLeave()) {
        restoring = guard.path
        history.go(isBack ? 1 : -1) // скасовуємо перехід, не чіпаючи стек
        return
      }
      guard = null
    }

    if (isBack) stack.pop()
    else if (stack[stack.length - 1] !== path) stack.push(path)

    const my = ++seq
    let node = null
    try {
      for (const { regex, keys, view } of routes) {
        const m = path.match(regex)
        if (m) {
          const params = Object.fromEntries(keys.map((k, i) => [k, decodeURIComponent(m[i + 1])]))
          node = await view(params)
          break
        }
      }
      if (!node && notFound) node = await notFound()
    } catch (err) {
      console.error(err)
      node = renderError?.(err) ?? null
    }
    if (my === seq && node) render(node, { path, isBack, keepScroll: !!opts.keepScroll })
  }
  window.addEventListener('hashchange', () => onChange())
  onChange()
}
