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
    stack.pop()
    location.replace('#' + path)
  } else location.hash = path
}

/** Назад у межах застосунку або на запасний шлях, якщо історії немає. */
export function goBack(fallbackPath) {
  if (canGoBack()) history.back()
  else navigate(fallbackPath, { replace: true })
}

/** Запускає роутер. render(node, { path, isBack }) викликається на кожну зміну маршруту. */
export function startRouter(render) {
  let seq = 0
  const onChange = async () => {
    const path = currentPath()
    const isBack = stack.length > 1 && stack[stack.length - 2] === path
    if (isBack) stack.pop()
    else if (stack[stack.length - 1] !== path) stack.push(path)

    const my = ++seq
    let node = null
    for (const { regex, keys, view } of routes) {
      const m = path.match(regex)
      if (m) {
        const params = Object.fromEntries(keys.map((k, i) => [k, decodeURIComponent(m[i + 1])]))
        node = await view(params)
        break
      }
    }
    if (!node && notFound) node = await notFound()
    if (my === seq && node) render(node, { path, isBack })
  }
  window.addEventListener('hashchange', onChange)
  onChange()
}
