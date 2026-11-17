import { h } from '../../lib/dom.js'
import { page } from '../../components/page.js'

const isStandalone = () =>
  window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true

const row = (label, value) =>
  h('div', { class: 'list-row' }, h('span', null, label), h('span', { class: 'muted' }, value))

export function moreView() {
  const swStatus = h('span', { class: 'muted' }, '…')
  const swRow = h('div', { class: 'list-row' }, h('span', null, 'Офлайн-режим'), swStatus)

  if (!('serviceWorker' in navigator)) swStatus.textContent = 'не підтримується'
  else if (!window.isSecureContext) swStatus.textContent = 'потрібен HTTPS'
  else
    navigator.serviceWorker.getRegistration().then((reg) => {
      swStatus.textContent = reg?.active ? 'готовий ✓' : 'ще не активний'
    })

  return page(
    'Ще',
    h(
      'div',
      { class: 'list' },
      row('Версія', __APP_VERSION__),
      row('Запущено як застосунок', isStandalone() ? 'так ✓' : 'ні (вкладка Safari)'),
      swRow,
    ),
    h(
      'p',
      { class: 'muted small', style: { margin: '16px 4px' } },
      'Профіль, експорт та імпорт даних з’являться тут на наступних етапах.',
    ),
  )
}
