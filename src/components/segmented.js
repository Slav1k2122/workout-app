import { h } from '../lib/dom.js'

/**
 * Сегментований перемикач у стилі iOS.
 *   segmented([{ id, label }], 'id', (id) => ...)
 * size: 'sm' — компактний варіант.
 */
export function segmented(options, value, onChange, { size } = {}) {
  const el = h('div', { class: 'segmented' + (size ? ' ' + size : ''), role: 'tablist' })
  const render = () =>
    el.replaceChildren(
      ...options.map((o) =>
        h(
          'button',
          {
            type: 'button',
            role: 'tab',
            'aria-selected': String(o.id === value),
            class: o.id === value ? 'active' : '',
            onclick: () => {
              if (o.id === value) return
              value = o.id
              render()
              onChange(o.id)
            },
          },
          o.label,
        ),
      ),
    )
  render()
  return el
}
