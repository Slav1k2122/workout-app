import { h } from '../lib/dom.js'

/**
 * Нижня панель (bottom sheet) поверх екрана.
 *   const close = openSheet({ title, content, full: true })
 * Закривається кнопкою «Готово», тапом по затемненню або зміною маршруту.
 */
export function openSheet({ title, content, full = false, doneLabel = 'Готово' }) {
  const overlay = h('div', {
    class: 'sheet-overlay',
    onclick: (e) => {
      if (e.target === overlay) close()
    },
  })
  const panel = h(
    'div',
    { class: 'sheet' + (full ? ' full' : ''), role: 'dialog', 'aria-modal': 'true', 'aria-label': title },
    h('div', { class: 'sheet-header' }, h('h2', null, title), h('button', { type: 'button', class: 'sheet-close', onclick: () => close() }, doneLabel)),
    h('div', { class: 'sheet-body' }, content),
  )
  overlay.append(panel)
  document.body.append(overlay)
  document.documentElement.classList.add('no-scroll')

  let closed = false
  function close() {
    if (closed) return
    closed = true
    window.removeEventListener('hashchange', close)
    document.documentElement.classList.remove('no-scroll')
    overlay.classList.add('closing')
    setTimeout(() => overlay.remove(), 200)
  }
  window.addEventListener('hashchange', close)
  return close
}

/**
 * Меню дій.
 *   actionSheet('Вправа', [{ label: 'Видалити', danger: true, onClick }])
 */
export function actionSheet(title, actions) {
  let close
  const list = h(
    'div',
    { class: 'action-list' },
    actions.map((a) =>
      h(
        'button',
        {
          type: 'button',
          class: 'action-item' + (a.danger ? ' danger' : ''),
          disabled: a.disabled,
          onclick: () => {
            close()
            a.onClick()
          },
        },
        a.label,
      ),
    ),
  )
  close = openSheet({ title, content: list, doneLabel: 'Скасувати' })
  return close
}
