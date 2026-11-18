import { h } from '../../lib/dom.js'
import { page, emptyState } from '../../components/page.js'
import { icons } from '../../components/icons.js'
import { toast } from '../../components/toast.js'
import { createWorkoutEditor } from '../../components/workout-editor.js'
import { goBack, setLeaveGuard, clearLeaveGuard } from '../../router.js'
import { getWorkout, saveWorkout, hasFilledSets } from '../../db/workouts.js'
import { toISODate, parseISODate } from '../../lib/format.js'

/** Редагування збереженого тренування (дата, вправи, підходи, нотатка). */
export async function workoutEditView({ id }) {
  const orig = await getWorkout(id)
  const back = { label: 'Назад', href: '/workout/' + id }
  if (!orig) {
    return page({ title: 'Не знайдено', back }, emptyState({ icon: icons.dumbbell, title: 'Тренування не знайдено' }))
  }

  const workout = structuredClone(orig)

  const dateInput = h('input', {
    type: 'date',
    class: 'input',
    value: workout.date,
    max: toISODate(),
    onchange: (e) => {
      if (!e.target.value) return
      // зсуваємо початок/кінець на новий день, зберігаючи час
      const start = new Date(workout.startedAt)
      const d = parseISODate(e.target.value)
      d.setHours(start.getHours(), start.getMinutes(), start.getSeconds())
      const delta = d.getTime() - workout.startedAt
      workout.date = e.target.value
      workout.startedAt += delta
      if (workout.finishedAt) workout.finishedAt += delta
    },
  })

  const editor = createWorkoutEditor({ workout, excludeId: workout.id, before: orig.startedAt })

  const note = h('textarea', {
    class: 'input',
    rows: 2,
    placeholder: 'Нотатка до тренування (необов’язково)',
    value: workout.note ?? '',
    oninput: (e) => (workout.note = e.target.value),
  })

  // Правки живуть лише в пам'яті — перед виходом без збереження питаємо
  const initial = JSON.stringify(workout)
  setLeaveGuard(() => JSON.stringify(workout) === initial || confirm('Вийти без збереження? Зміни буде втрачено.'))

  let saving = false
  async function save() {
    if (saving) return
    if (!hasFilledSets(workout)) {
      toast('Додай хоча б один підхід')
      return
    }
    saving = true
    try {
      await saveWorkout(workout)
    } catch (err) {
      saving = false
      throw err
    }
    clearLeaveGuard()
    toast('Зміни збережено')
    goBack('/workout/' + id)
  }

  return page(
    { title: 'Редагування', back },
    h('label', { class: 'field', style: { marginBottom: '16px' } }, h('span', { class: 'field-label' }, 'Дата'), dateInput),
    editor,
    h('div', { class: 'field', style: { marginTop: '20px' } }, note),
    h('button', { class: 'btn btn-primary btn-block btn-lg', style: { marginTop: '16px' }, onclick: save }, 'Зберегти зміни'),
  )
}
