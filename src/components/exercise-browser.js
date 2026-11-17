import { h, svg } from '../lib/dom.js'
import { icons } from './icons.js'
import { emptyState } from './page.js'
import { GROUPS, MUSCLES, EQUIPMENT } from '../data/muscles.js'
import { formatDateShort, setsSummary, plural } from '../lib/format.js'

/** Нормалізація для пошуку: регістр, різні апострофи, ё/є не чіпаємо. */
export const normalize = (s) =>
  s.toLowerCase().replace(/[’'ʼ`]/g, '').replace(/\s+/g, ' ').trim()

export const exerciseSubtitle = (e) =>
  [EQUIPMENT[e.equipment], e.primary.map((m) => MUSCLES[m]).join(', ')].filter(Boolean).join(' · ')

/** Підпис для виконаної вправи: «вчора · 3 × 10 × 60 кг». */
export const historySubtitle = (info) => `${formatDateShort(info.date)} · ${setsSummary(info.sets)}`
export const historyCount = (info) => `${info.count} ${plural(info.count, ['тренування', 'тренування', 'тренувань'])}`

/**
 * Пошук + фільтр за групою + список вправ.
 * Використовується в бібліотеці вправ і у виборі вправи для тренування.
 *
 * @param exercises  масив вправ
 * @param state      { group: 'mine' | 'all' | groupId | null, query } — мутується (щоб фільтр зберігався);
 *                   group: null → «Мої», якщо є історія, інакше «Усі»
 * @param history    Map(exerciseId → { lastTs, date, sets, count }) — для фільтра «Мої»
 * @param renderRow  (exercise, { mine: boolean }) => Node
 * @returns { controls: Node[], list: Node }
 */
export function createExerciseBrowser({ exercises, state, history = new Map(), renderRow }) {
  const list = h('div', { class: 'browser-list' })
  const hasMine = exercises.some((e) => history.has(e.id))
  if (state.group == null || (state.group === 'mine' && !hasMine)) state.group = hasMine ? 'mine' : 'all'

  const search = h('input', {
    type: 'search',
    class: 'search',
    placeholder: 'Пошук вправи',
    enterkeyhint: 'search',
    autocomplete: 'off',
    value: state.query,
    oninput: (e) => {
      state.query = e.target.value
      // Пошук завжди по всій базі — інакше легко «не знайти» вправу через активний фільтр
      if (state.query.trim()) state.group = 'all'
      render()
    },
  })
  const searchWrap = h('label', { class: 'search-wrap' }, svg(icons.search), search)

  const chipDefs = [...(hasMine ? [{ id: 'mine', name: 'Мої' }] : []), { id: 'all', name: 'Усі' }, ...GROUPS]
  const chips = h(
    'div',
    { class: 'chips scroll-x' },
    chipDefs.map((g) =>
      h(
        'button',
        {
          type: 'button',
          class: 'chip' + (g.id === 'mine' ? ' chip-mine' : ''),
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

  function section(title, items, opts = {}) {
    return h(
      'div',
      { class: 'section' },
      title && h('h3', { class: 'section-title' }, title, h('span', { class: 'count' }, items.length)),
      h('div', { class: 'list' }, items.map((e) => renderRow(e, opts))),
    )
  }

  function render() {
    for (const c of chips.children) c.classList.toggle('active', c.dataset.group === state.group)

    const q = normalize(state.query)

    // «Мої»: виконані вправи, від останньої до найдавнішої
    if (state.group === 'mine' && !q) {
      const mine = exercises
        .filter((e) => history.has(e.id))
        .sort((a, b) => history.get(b.id).lastTs - history.get(a.id).lastTs)
      list.replaceChildren(section('Нещодавні', mine, { mine: true }))
      return
    }

    const items = exercises.filter(
      (e) => (state.group === 'all' || state.group === 'mine' || e.group === state.group) && (!q || normalize(e.name).includes(q)),
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
