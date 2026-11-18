import { h, svg } from '../../lib/dom.js'
import { page, emptyState, iconButton } from '../../components/page.js'
import { icons } from '../../components/icons.js'
import { toast } from '../../components/toast.js'
import { actionSheet } from '../../components/sheet.js'
import { createWorkoutEditor } from '../../components/workout-editor.js'
import { navigate, refresh } from '../../router.js'
import {
  getActiveWorkout,
  saveActiveWorkout,
  startWorkout,
  discardActiveWorkout,
  finishActiveWorkout,
  hasFilledSets,
  listWorkouts,
} from '../../db/workouts.js'
import { workoutVolume } from '../../lib/calc.js'
import { formatClock, formatTime, formatDateLong, formatMonth, formatDuration, formatNum, plural } from '../../lib/format.js'

export async function workoutView() {
  const active = await getActiveWorkout()
  return active ? activeView(active) : startView()
}

// ---------- Немає активного тренування: кнопка старту + історія ----------
async function startView() {
  const workouts = await listWorkouts()

  const start = h(
    'button',
    {
      class: 'btn btn-primary btn-block btn-lg',
      onclick: async () => {
        await startWorkout()
        refresh()
      },
    },
    svg(icons.plus),
    'Почати тренування',
  )

  return page('Тренування', start, h('h2', { class: 'block-title' }, 'Історія'), historyList(workouts))
}

function historyList(workouts) {
  if (!workouts.length) {
    return emptyState({ icon: icons.chart, title: 'Поки порожньо', text: 'Збережені тренування з’являться тут.' })
  }
  const byMonth = new Map()
  for (const w of workouts) {
    const key = w.date.slice(0, 7)
    if (!byMonth.has(key)) byMonth.set(key, [])
    byMonth.get(key).push(w)
  }
  return [...byMonth].map(([key, items]) =>
    h(
      'div',
      { class: 'section' },
      h('h3', { class: 'section-title' }, formatMonth(key + '-01'), h('span', { class: 'count' }, items.length)),
      h('div', { class: 'list' }, items.map(workoutRow)),
    ),
  )
}

function workoutRow(w) {
  const vol = workoutVolume(w)
  const meta = [
    w.finishedAt && formatDuration(w.finishedAt - w.startedAt),
    `${w.exercises.length} ${plural(w.exercises.length, ['вправа', 'вправи', 'вправ'])}`,
    vol > 0 && `${formatNum(Math.round(vol))} кг`,
  ]
    .filter(Boolean)
    .join(' · ')
  return h(
    'a',
    { class: 'list-row link', href: '#/workout/' + w.id },
    h(
      'div',
      { class: 'row-main' },
      h('div', { class: 'row-title' }, formatDateLong(w.date)),
      h('div', { class: 'row-sub' }, w.exercises.map((e) => e.name).join(', ') || 'Без вправ'),
      h('div', { class: 'row-sub faint' }, meta),
    ),
    svg(icons.chevronRight),
  )
}

// ---------- Активне тренування ----------
function activeView(workout) {
  const timer = h('span', { class: 'timer' }, formatClock(Date.now() - workout.startedAt))
  let seen = false
  const tick = setInterval(() => {
    if (timer.isConnected) seen = true
    else if (seen) return clearInterval(tick)
    timer.textContent = formatClock(Date.now() - workout.startedAt)
  }, 1000)

  // Чернетка зберігається на кожну зміну. Якщо запис не вдався — постійне попередження,
  // щоб не тренуватися далі з думкою, що все зберігається.
  const saveWarning = h('div', { class: 'save-warning', role: 'alert', hidden: true }, '⚠️ Зміни не зберігаються на пристрої. Не закривай застосунок — спробую ще раз при наступній зміні.')
  let saveSeq = 0
  const save = () => {
    const my = ++saveSeq
    saveActiveWorkout(workout).then(
      () => {
        if (my === saveSeq) saveWarning.hidden = true
      },
      (err) => {
        console.error(err)
        if (my === saveSeq) saveWarning.hidden = false
      },
    )
  }
  const editor = createWorkoutEditor({ workout, onChange: save })

  const note = h('textarea', {
    class: 'input',
    rows: 2,
    placeholder: 'Нотатка до тренування (необов’язково)',
    value: workout.note ?? '',
    oninput: (e) => {
      workout.note = e.target.value
      save()
    },
  })

  async function cancel() {
    if (!confirm('Скасувати тренування? Усі введені дані буде втрачено.')) return
    await discardActiveWorkout()
    toast('Тренування скасовано')
    refresh()
  }

  let finishing = false
  async function finish() {
    if (!hasFilledSets(workout)) {
      if (confirm('Немає жодного заповненого підходу. Скасувати тренування?')) {
        await discardActiveWorkout()
        toast('Тренування скасовано')
        refresh()
      }
      return
    }
    if (finishing || !confirm('Завершити й зберегти тренування?')) return
    finishing = true
    let saved
    try {
      saved = await finishActiveWorkout(workout)
    } catch (err) {
      finishing = false
      throw err
    }
    if (!saved) return refresh() // чернетку вже прибрали (напр. імпортом)
    toast('Тренування збережено 💪')
    navigate('/workout/' + saved.id, { replace: true })
  }

  const menu = iconButton(icons.more, 'Меню тренування', {
    type: 'button',
    onclick: () => actionSheet('Тренування', [{ label: 'Скасувати тренування', danger: true, onClick: cancel }]),
  })

  return page(
    {
      title: 'Тренування',
      actions: [menu],
      headerExtra: [
        h('div', { class: 'workout-meta' }, svg(icons.clock), timer, h('span', { class: 'muted' }, '· почато о ' + formatTime(workout.startedAt))),
      ],
    },
    saveWarning,
    editor,
    h('div', { class: 'field', style: { marginTop: '20px' } }, note),
    h('button', { class: 'btn btn-finish btn-block btn-lg', style: { marginTop: '16px' }, onclick: finish }, 'Завершити тренування'),
  )
}
