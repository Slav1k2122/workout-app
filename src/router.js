/**
 * Хеш-роутер: #/шлях/:параметр
 * Хеш (а не History API) — щоб працювало на GitHub Pages без налаштувань сервера
 * і щоб PWA завжди відкривалась з index.html.
 */
const routes = []
let notFound = null
let onChange = () => {}

/** Реєструє маршрут. view(params) повертає Node (або Promise<Node>). */
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

export function navigate(path, { replace = false } = {}) {
  const url = '#' + path
  if (replace) location.replace(url)
  else location.hash = path
}

/** Запускає роутер. render(node, path) викликається на кожну зміну маршруту. */
export function startRouter(render) {
  onChange = async () => {
    const path = currentPath()
    for (const { regex, keys, view } of routes) {
      const m = path.match(regex)
      if (m) {
        const params = Object.fromEntries(keys.map((k, i) => [k, decodeURIComponent(m[i + 1])]))
        render(await view(params), path)
        return
      }
    }
    if (notFound) render(await notFound(), path)
  }
  window.addEventListener('hashchange', onChange)
  onChange()
}
