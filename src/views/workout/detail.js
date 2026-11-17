import { h } from '../../lib/dom.js'
import { page, iconButton, emptyState } from '../../components/page.js'
import { icons } from '../../components/icons.js'
import { toast } from '../../components/toast.js'
import { goBack } from '../../router.js'
import { getWorkout, deleteWorkout } from '../../db/workouts.js'
import { volume, workoutVolume, totalSets } from '../../lib/calc.js'
import { formatDateLong, formatDuration, formatTime, formatNum } from '../../lib/format.js'

const back = { label: 'Тренування', href: '/workout' }

const stat = (label, value) => h('div', { class: 'stat' }, h('div', { class: 'stat-value' }, value), h('div', { class: 'stat-label' }, label))

export async function workoutDetailView({ id }) {
  const w = await getWorkout(id)
  if (!w) {
    return page({ title: 'Не знайдено', back }, emptyState({ icon: icons.dumbbell, title: 'Тренування не знайдено', text: 'Можливо, його було видалено.' }))
  }

  const vol = workoutVolume(w)
  const timeRange = w.finishedAt ? `${formatTime(w.startedAt)}–${formatTime(w.finishedAt)}` : formatTime(w.startedAt)

  async function remove() {
    if (!confirm('Видалити це тренування? Дію не можна скасувати.')) return
    await deleteWorkout(w.id)
    toast('Тренування видалено')
    goBack('/workout')
  }

  return page(
    {
      title: formatDateLong(w.date),
      back,
      actions: [iconButton(icons.edit, 'Редагувати', { href: `#/workout/${w.id}/edit` })],
      headerExtra: [h('div', { class: 'workout-meta muted' }, timeRange)],
    },
    h(
      'div',
      { class: 'stats' },
      stat('Тривалість', w.finishedAt ? formatDuration(w.finishedAt - w.startedAt) : '—'),
      stat('Вправ', w.exercises.length),
      stat('Підходів', totalSets(w)),
      stat('Об’єм, кг', vol ? formatNum(Math.round(vol)) : '—'),
    ),
    w.exercises.map((e) =>
      h(
        'div',
        { class: 'card' },
        h('a', { class: 'exercise-name', href: '#/exercises/' + encodeURIComponent(e.exerciseId) }, e.name),
        h(
          'div',
          { class: 'set-list' },
          e.sets.map((s, i) =>
            h(
              'div',
              { class: 'set-line' },
              h('span', { class: 'set-num' }, i + 1),
              h('span', null, s.weight ? `${formatNum(s.weight)} кг × ${s.reps}` : `${s.reps} повт.`),
            ),
          ),
        ),
        volume(e.sets) > 0 && h('p', { class: 'muted small', style: { marginTop: '8px' } }, `Об’єм: ${formatNum(Math.round(volume(e.sets)))} кг`),
      ),
    ),
    w.note && h('div', { class: 'card' }, h('h2', null, 'Нотатка'), h('p', { class: 'pre-wrap' }, w.note)),
    h('button', { class: 'btn btn-danger btn-block', style: { marginTop: '24px' }, onclick: remove }, 'Видалити тренування'),
  )
}
