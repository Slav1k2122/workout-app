import { h } from '../lib/dom.js'

let current = null
let timer = 0

/**
 * Коротке спливаюче повідомлення над нижньою навігацією.
 *   toast('Збережено')
 *   toast('Підхід видалено', { action: { label: 'Повернути', onClick }, ms: 5000 })
 */
export function toast(message, opts = {}) {
  const { ms = opts.action ? 5000 : 2200, action } = typeof opts === 'number' ? { ms: opts } : opts
  current?.remove()
  clearTimeout(timer)
  const el = h(
    'div',
    { class: 'toast' + (action ? ' has-action' : ''), role: 'status' },
    h('span', null, message),
    action &&
      h(
        'button',
        {
          type: 'button',
          class: 'toast-action',
          onclick: () => {
            el.remove()
            action.onClick()
          },
        },
        action.label,
      ),
  )
  document.body.append(el)
  current = el
  timer = setTimeout(() => el.remove(), ms)
}

/** Повідомлення про помилку (неочікуваний збій запису/читання). */
export function showError(err, message = 'Не вдалося виконати дію') {
  console.error(err)
  const detail = err?.name === 'QuotaExceededError' ? 'на пристрої закінчилось місце' : err?.message || err?.name
  toast(detail ? `⚠️ ${message}: ${detail}` : `⚠️ ${message}`, 5000)
}
