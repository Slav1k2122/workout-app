import { h, svg } from '../../lib/dom.js'
import { page, iconButton } from '../../components/page.js'
import { icons } from '../../components/icons.js'
import { createExerciseBrowser, exerciseSubtitle } from '../../components/exercise-browser.js'
import { listExercises } from '../../db/exercises.js'

// Фільтр зберігається, поки застосунок відкритий (повернення з картки вправи не скидає його)
const state = { group: 'all', query: '' }

function exerciseRow(e) {
  return h(
    'a',
    { class: 'list-row link', href: '#/exercises/' + encodeURIComponent(e.id) },
    h(
      'div',
      { class: 'row-main' },
      h('div', { class: 'row-title' }, e.name, e.custom && h('span', { class: 'badge' }, 'своя')),
      h('div', { class: 'row-sub' }, exerciseSubtitle(e)),
    ),
    svg(icons.chevronRight),
  )
}

export async function exercisesView() {
  const exercises = await listExercises()
  const { controls, list } = createExerciseBrowser({ exercises, state, renderRow: exerciseRow })

  return page(
    {
      title: 'Вправи',
      actions: [iconButton(icons.plus, 'Додати свою вправу', { href: '#/exercises/new' })],
      headerExtra: controls,
    },
    list,
  )
}
