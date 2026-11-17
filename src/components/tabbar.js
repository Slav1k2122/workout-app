import { h, svg } from '../lib/dom.js'
import { icons } from './icons.js'

export const TABS = [
  { path: '/workout', label: 'Тренування', icon: icons.dumbbell },
  { path: '/exercises', label: 'Вправи', icon: icons.list },
  { path: '/nutrition', label: 'Їжа', icon: icons.food },
  { path: '/weight', label: 'Вага', icon: icons.scale },
  { path: '/more', label: 'Ще', icon: icons.more },
]

export function createTabbar() {
  const links = TABS.map((tab) =>
    h('a', { href: '#' + tab.path, dataset: { path: tab.path } }, svg(tab.icon), h('span', null, tab.label)),
  )
  const nav = h('nav', { class: 'tabbar', 'aria-label': 'Основна навігація' }, links)

  /** Підсвічує вкладку за першим сегментом шляху (#/exercises/123 → «Вправи»). */
  nav.setActive = (path) => {
    const section = '/' + (path.split('/')[1] || '')
    for (const a of links) a.classList.toggle('active', a.dataset.path === section)
  }

  /** Крапка-індикатор на вкладці (напр. є активне тренування). */
  nav.setDot = (path, on) => {
    links.find((a) => a.dataset.path === path)?.classList.toggle('has-dot', on)
  }
  return nav
}
