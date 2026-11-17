import { h, svg } from '../../lib/dom.js'
import { page, iconButton } from '../../components/page.js'
import { icons } from '../../components/icons.js'
import { createExerciseBrowser, exerciseSubtitle, historySubtitle, historyCount } from '../../components/exercise-browser.js'
import { listExercises } from '../../db/exercises.js'
import { exerciseHistoryIndex } from '../../db/workouts.js'

// Фільтр зберігається, поки застосунок відкритий (повернення з картки вправи не скидає його).
// group: null → за замовчуванням «Мої», якщо вже є виконані вправи.
const state = { group: null, query: '' }

export async function exercisesView() {
  const [exercises, history] = await Promise.all([listExercises(), exerciseHistoryIndex()])

  const exerciseRow = (e, { mine }) => {
    const info = mine && history.get(e.id)
    return h(
      'a',
      { class: 'list-row link', href: '#/exercises/' + encodeURIComponent(e.id) },
      h(
        'div',
        { class: 'row-main' },
        h('div', { class: 'row-title' }, e.name, e.custom && h('span', { class: 'badge' }, 'своя')),
        info
          ? [h('div', { class: 'row-sub' }, historySubtitle(info)), h('div', { class: 'row-sub faint' }, historyCount(info))]
          : h('div', { class: 'row-sub' }, exerciseSubtitle(e)),
      ),
      svg(icons.chevronRight),
    )
  }

  const { controls, list } = createExerciseBrowser({ exercises, state, history, renderRow: exerciseRow })

  return page(
    {
      title: 'Вправи',
      actions: [iconButton(icons.plus, 'Додати свою вправу', { href: '#/exercises/new' })],
      headerExtra: controls,
    },
    list,
  )
}
