import { h, svg } from '../lib/dom.js'
import { goBack } from '../router.js'
import { icons } from './icons.js'

/**
 * Сторінка з «липким» заголовком у стилі iOS.
 *   page('Назва', ...content)
 *   page({ title, back: { label, href }, actions: [Node], headerExtra: [Node] }, ...content)
 * back — кнопка «назад» (history.back, а якщо історії немає — перехід на href).
 * headerExtra — елементи, що «липнуть» разом із заголовком (пошук, фільтри).
 */
export function page(opts, ...content) {
  if (typeof opts === 'string') opts = { title: opts }
  const { title, back, actions, headerExtra } = opts

  const top =
    (back || actions) &&
    h(
      'div',
      { class: 'header-top' },
      back
        ? h(
            'a',
            {
              class: 'back-btn',
              href: '#' + back.href,
              onclick: (e) => {
                e.preventDefault()
                goBack(back.href)
              },
            },
            svg(icons.chevronLeft),
            back.label,
          )
        : h('span'),
      h('div', { class: 'header-actions' }, actions),
    )

  return h(
    'section',
    { class: 'page' },
    h(
      'header',
      { class: 'page-header' + (back ? ' compact' : '') },
      top,
      h('h1', null, title),
      headerExtra && h('div', { class: 'header-extra' }, headerExtra),
    ),
    ...content,
  )
}

/** Кругла кнопка-іконка для заголовка. */
export function iconButton(icon, label, props = {}) {
  const tag = props.href ? 'a' : 'button'
  return h(tag, { class: 'icon-btn', 'aria-label': label, title: label, ...props }, svg(icon))
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
