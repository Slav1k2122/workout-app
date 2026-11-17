import { h } from '../../lib/dom.js'
import { page, iconButton, emptyState } from '../../components/page.js'
import { icons } from '../../components/icons.js'
import { toast } from '../../components/toast.js'
import { goBack } from '../../router.js'
import { getExercise, deleteCustomExercise } from '../../db/exercises.js'
import { countWorkoutsWithExercise } from '../../db/workouts.js'
import { plural } from '../../lib/format.js'
import { GROUP_NAMES, MUSCLES, EQUIPMENT } from '../../data/muscles.js'

const back = { label: 'Вправи', href: '/exercises' }

const muscleChips = (ids, cls) =>
  h('div', { class: 'tags' }, ids.map((m) => h('span', { class: 'tag ' + cls }, MUSCLES[m] ?? m)))

export async function exerciseDetailView({ id }) {
  const ex = await getExercise(id)
  if (!ex) {
    return page(
      { title: 'Вправу не знайдено', back },
      emptyState({ icon: icons.list, title: 'Такої вправи немає', text: 'Можливо, її було видалено.' }),
    )
  }

  const actions = ex.custom
    ? [iconButton(icons.edit, 'Редагувати', { href: `#/exercises/${encodeURIComponent(ex.id)}/edit` })]
    : []

  async function remove() {
    const used = await countWorkoutsWithExercise(ex.id)
    const msg = used
      ? `Вправа є в ${used} ${plural(used, ['тренуванні', 'тренуваннях', 'тренуваннях'])}. ` +
        'Записи в історії залишаться, але вправа зникне з бібліотеки й статистики. Видалити?'
      : `Видалити вправу «${ex.name}»?`
    if (!confirm(msg)) return
    await deleteCustomExercise(ex.id)
    toast('Вправу видалено')
    goBack('/exercises')
  }

  return page(
    { title: ex.name, back, actions },
    h(
      'div',
      { class: 'tags', style: { marginBottom: '16px' } },
      h('span', { class: 'tag' }, GROUP_NAMES[ex.group] ?? ex.group),
      EQUIPMENT[ex.equipment] && h('span', { class: 'tag' }, EQUIPMENT[ex.equipment]),
      ex.custom && h('span', { class: 'tag tag-accent' }, 'своя вправа'),
    ),

    h(
      'div',
      { class: 'card' },
      h('h2', null, 'Задіяні м’язи'),
      ex.primary.length
        ? [h('p', { class: 'label' }, 'Основні'), muscleChips(ex.primary, 'tag-primary')]
        : h('p', { class: 'muted small' }, 'Не вказано'),
      ex.secondary.length > 0 && [h('p', { class: 'label' }, 'Допоміжні'), muscleChips(ex.secondary, 'tag-secondary')],
      h('p', { class: 'muted small', style: { marginTop: '12px' } }, 'Силует тіла з підсвіткою з’явиться на етапі 4.'),
    ),

    ex.steps.length > 0 &&
      h('div', { class: 'card' }, h('h2', null, 'Техніка'), h('ol', { class: 'steps' }, ex.steps.map((s) => h('li', null, s)))),

    ex.mistakes.length > 0 &&
      h(
        'div',
        { class: 'card' },
        h('h2', null, 'Типові помилки'),
        h('ul', { class: 'mistakes' }, ex.mistakes.map((s) => h('li', null, s))),
      ),

    h(
      'div',
      { class: 'card' },
      h('h2', null, 'Прогрес'),
      h('p', { class: 'muted small' }, 'Графік ваги, 1ПМ та об’єму — на етапі 3.'),
    ),

    ex.custom &&
      h('button', { class: 'btn btn-danger btn-block', style: { marginTop: '24px' }, onclick: remove }, 'Видалити вправу'),
  )
}
