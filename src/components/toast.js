import { h } from '../lib/dom.js'

let current = null

/** Коротке спливаюче повідомлення над нижньою навігацією. */
export function toast(message, ms = 2200) {
  current?.remove()
  const el = h('div', { class: 'toast', role: 'status' }, message)
  document.body.append(el)
  current = el
  setTimeout(() => el.remove(), ms)
}
