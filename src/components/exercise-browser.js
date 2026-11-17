import { h, svg } from '../lib/dom.js'
import { icons } from './icons.js'
import { emptyState } from './page.js'
import { GROUPS, MUSCLES, EQUIPMENT } from '../data/muscles.js'

/** Нормалізація для пошуку: регістр, різні апострофи, ё/є не чіпаємо. */
export const normalize = (s) =>
  s.toLowerCase().replace(/[’'ʼ`]/g, '').replace(/\s+/g, ' ').trim()

export const exerciseSubtitle = (e) =>
  [EQUIPMENT[e.equipment], e.primary.map((m) => MUSCLES[m]).join(', ')].filter(Boolean).join(' · ')

/**
 * Пошук + фільтр за групою + список вправ.
 * Використовується в бібліотеці вправ і (етап 2) у виборі вправи для тренування.
 *
 * @param exercises  масив вправ
 * @param state      { group: 'all' | groupId, query: string } — мутується (щоб фільтр зберігався)
 * @param renderRow  (exercise) => Node
 * @returns { controls: Node[], list: Node }
 */
export function createExerciseBrowser({ exercises, state, renderRow }) {
  const list = h('div', { class: 'browser-list' })

  const search = h('input', {
    type: 'search',
    class: 'search',
    placeholder: 'Пошук вправи',
    enterkeyhint: 'search',
    autocomplete: 'off',
    value: state.query,
    oninput: (e) => {
      state.query = e.target.value
      render()
    },
  })
  const searchWrap = h('label', { class: 'search-wrap' }, svg(icons.search), search)

  const chips = h(
    'div',
    { class: 'chips scroll-x' },
    [{ id: 'all', name: 'Усі' }, ...GROUPS].map((g) =>
      h(
        'button',
        {
          type: 'button',
          class: 'chip',
          dataset: { group: g.id },
          onclick: (e) => {
            state.group = g.id
            e.currentTarget.scrollIntoView({ block: 'nearest', inline: 'center', behavior: 'smooth' })
            render()
          },
        },
        g.name,
      ),
    ),
  )

  function section(title, items) {
    return h(
      'div',
      { class: 'section' },
      title && h('h3', { class: 'section-title' }, title, h('span', { class: 'count' }, items.length)),
      h('div', { class: 'list' }, items.map(renderRow)),
    )
  }

  function render() {
    for (const c of chips.children) c.classList.toggle('active', c.dataset.group === state.group)

    const q = normalize(state.query)
    const items = exercises.filter(
      (e) => (state.group === 'all' || e.group === state.group) && (!q || normalize(e.name).includes(q)),
    )

    if (!items.length) {
      list.replaceChildren(
        emptyState({ icon: icons.search, title: 'Нічого не знайдено', text: 'Спробуй іншу назву або групу.' }),
      )
    } else if (state.group === 'all' && !q) {
      list.replaceChildren(
        ...GROUPS.map((g) => [g.name, items.filter((e) => e.group === g.id)])
          .filter(([, arr]) => arr.length)
          .map(([name, arr]) => section(name, arr)),
      )
    } else {
      list.replaceChildren(section(null, items))
    }
  }

  render()
  return { controls: [searchWrap, chips], list }
}
