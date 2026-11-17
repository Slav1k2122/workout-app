import { h, svg } from '../lib/dom.js'

/** Сторінка з великим «липким» заголовком у стилі iOS. */
export function page(title, ...content) {
  return h(
    'section',
    { class: 'page' },
    h('header', { class: 'page-header' }, h('h1', null, title)),
    ...content,
  )
}

/** Порожній стан: іконка, заголовок, текст, (необов'язково) кнопка. */
export function emptyState({ icon, title, text, action }) {
  return h(
    'div',
    { class: 'empty' },
    icon && svg(icon),
    h('h2', null, title),
    text && h('p', null, text),
    action && h('div', { style: { marginTop: '20px' } }, action),
  )
}
