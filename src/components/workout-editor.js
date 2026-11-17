import { h, svg } from '../lib/dom.js'
import { icons } from './icons.js'
import { iconButton, emptyState } from './page.js'
import { openSheet, actionSheet } from './sheet.js'
import { createExerciseBrowser, exerciseSubtitle, historySubtitle } from './exercise-browser.js'
import { listExercises } from '../db/exercises.js'
import { getLastSession, exerciseHistoryIndex } from '../db/workouts.js'
import { navigate } from '../router.js'
import { formatDateShort, setsSummary, toInputNum, parseNum } from '../lib/format.js'

// Фільтр у виборі вправи зберігається між відкриттями (зручно в день «груди»)
// group: null → «Мої», якщо вже є виконані вправи
const pickerState = { group: null, query: '' }

const hasData = (entry) => entry.sets.some((s) => s.reps != null || s.weight != null)

/**
 * Редактор тренування: картки вправ із підходами, минулий результат, додавання вправ.
 * Мутує переданий об'єкт workout і викликає onChange(workout) після кожної зміни.
 *
 * @param workout    { exercises: [{ exerciseId, name, sets: [{ reps, weight }] }] }
 * @param onChange   (workout) => void
 * @param excludeId  id тренування, яке не враховувати при пошуку минулого результату
 * @param before     шукати минулий результат лише серед тренувань, що почались раніше (timestamp)
 */
export function createWorkoutEditor({ workout, onChange, excludeId, before }) {
  const root = h('div', { class: 'editor' })
  const exMap = new Map()
  const lastResolved = new Map() // exerciseId → { date, sets } | null
  const lastPending = new Map()

  function loadLast(id) {
    if (!lastPending.has(id)) {
      lastPending.set(
        id,
        getLastSession(id, { excludeId, before }).then((last) => {
          lastResolved.set(id, last)
          return last
        }),
      )
    }
    return lastPending.get(id)
  }

  const changed = (structural) => {
    onChange?.(workout)
    if (structural) render()
  }

  function move(idx, dir) {
    const list = workout.exercises
    const [item] = list.splice(idx, 1)
    list.splice(idx + dir, 0, item)
    changed(true)
  }

  // ---------- Рядок підходу ----------
  function setRow(entry, set, i, lastSets) {
    const ph = lastSets?.[i]
    const weight = h('input', {
      class: 'set-input',
      type: 'text',
      inputmode: 'decimal',
      autocomplete: 'off',
      enterkeyhint: 'next',
      'aria-label': `Вага, підхід ${i + 1}`,
      placeholder: ph ? toInputNum(ph.weight) : 'кг',
      value: toInputNum(set.weight),
      oninput: (e) => {
        set.weight = parseNum(e.target.value)
        changed(false)
      },
    })
    const reps = h('input', {
      class: 'set-input',
      type: 'text',
      inputmode: 'numeric',
      pattern: '[0-9]*',
      autocomplete: 'off',
      enterkeyhint: 'done',
      'aria-label': `Повторення, підхід ${i + 1}`,
      placeholder: ph ? String(ph.reps) : 'повт',
      value: set.reps ?? '',
      oninput: (e) => {
        const n = parseNum(e.target.value)
        set.reps = n == null ? null : Math.round(n)
        changed(false)
      },
    })
    return h(
      'div',
      { class: 'set-row' },
      h('span', { class: 'set-num' }, i + 1),
      weight,
      h('span', { class: 'set-x' }, '×'),
      reps,
      h(
        'button',
        {
          type: 'button',
          class: 'set-del',
          'aria-label': `Видалити підхід ${i + 1}`,
          onclick: () => {
            entry.sets.splice(i, 1)
            changed(true)
          },
        },
        svg(icons.close),
      ),
    )
  }

  // ---------- Картка вправи ----------
  function exerciseCard(entry, idx) {
    const id = entry.exerciseId
    const name = exMap.get(id)?.name ?? entry.name ?? 'Вправа'
    const href = '#/exercises/' + encodeURIComponent(id)

    const setsEl = h('div', { class: 'sets' })
    const renderSets = () => {
      const last = lastResolved.get(id)
      setsEl.replaceChildren(
        h(
          'div',
          { class: 'set-row set-head' },
          h('span', null, '#'),
          h('span', null, 'кг'),
          h('span'),
          h('span', null, 'повт.'),
          h('span'),
        ),
        ...entry.sets.map((s, i) => setRow(entry, s, i, last?.sets)),
      )
    }

    const lastEl = h('button', { type: 'button', class: 'last-result', disabled: true }, 'Минулий результат…')
    const renderLast = (last) => {
      if (!last) {
        lastEl.disabled = true
        lastEl.replaceChildren(h('span', { class: 'last-label' }, 'Вперше — успіхів! 💪'))
        return
      }
      lastEl.disabled = false
      lastEl.replaceChildren(
        h('span', { class: 'last-label' }, 'Минулого разу · ' + formatDateShort(last.date)),
        h('span', { class: 'last-sets' }, setsSummary(last.sets)),
        h('span', { class: 'last-hint' }, 'Натисни, щоб повторити'),
      )
    }
    lastEl.addEventListener('click', () => {
      const last = lastResolved.get(id)
      if (!last) return
      if (hasData(entry) && !confirm('Замінити поточні підходи минулим результатом?')) return
      entry.sets = last.sets.map((s) => ({ reps: s.reps, weight: s.weight }))
      changed(true)
    })

    if (lastResolved.has(id)) renderLast(lastResolved.get(id))
    else
      loadLast(id).then((last) => {
        renderLast(last)
        renderSets()
      })
    renderSets()

    const addSet = h(
      'button',
      {
        type: 'button',
        class: 'btn btn-ghost btn-block add-set',
        onclick: () => {
          const prev = entry.sets.at(-1)
          entry.sets.push({ reps: prev?.reps ?? null, weight: prev?.weight ?? null })
          changed(true)
        },
      },
      svg(icons.plus),
      'Додати підхід',
    )

    const menu = iconButton(icons.more, 'Дії з вправою', {
      type: 'button',
      onclick: () =>
        actionSheet(name, [
          { label: 'Перемістити вище', disabled: idx === 0, onClick: () => move(idx, -1) },
          { label: 'Перемістити нижче', disabled: idx === workout.exercises.length - 1, onClick: () => move(idx, 1) },
          { label: 'Техніка та статистика', onClick: () => navigate('/exercises/' + encodeURIComponent(id)) },
          {
            label: 'Прибрати з тренування',
            danger: true,
            onClick: () => {
              if (hasData(entry) && !confirm(`Прибрати «${name}» з тренування разом із підходами?`)) return
              workout.exercises.splice(idx, 1)
              changed(true)
            },
          },
        ]),
    })

    return h(
      'div',
      { class: 'card exercise-card' },
      h('div', { class: 'exercise-card-head' }, h('a', { class: 'exercise-name', href }, name), menu),
      lastEl,
      setsEl,
      addSet,
    )
  }

  // ---------- Вибір вправи ----------
  function openPicker() {
    pickerState.query = ''
    const added = new Set(workout.exercises.map((e) => e.exerciseId))
    let close
    const { controls, list } = createExerciseBrowser({
      exercises: [...exMap.values()],
      state: pickerState,
      history,
      renderRow: (e, { mine }) =>
        h(
          'button',
          {
            type: 'button',
            class: 'list-row picker-row',
            disabled: added.has(e.id),
            onclick: () => {
              workout.exercises.push({ exerciseId: e.id, name: e.name, sets: [{ reps: null, weight: null }] })
              close()
              changed(true)
              // прокрутити до щойно доданої вправи
              const cards = root.querySelectorAll('.exercise-card')
              cards[cards.length - 1]?.scrollIntoView({ behavior: 'smooth', block: 'center' })
            },
          },
          h(
            'div',
            { class: 'row-main' },
            h('div', { class: 'row-title' }, e.name, added.has(e.id) && h('span', { class: 'badge' }, 'додано')),
            h('div', { class: 'row-sub' }, mine && history.has(e.id) ? historySubtitle(history.get(e.id)) : exerciseSubtitle(e)),
          ),
          svg(icons.plus),
        ),
    })
    close = openSheet({ title: 'Додати вправу', full: true, content: [h('div', { class: 'sheet-controls' }, controls), list] })
  }

  // ---------- Рендер ----------
  function render() {
    root.replaceChildren(
      ...(workout.exercises.length
        ? workout.exercises.map(exerciseCard)
        : [emptyState({ icon: icons.dumbbell, title: 'Додай першу вправу', text: 'Обери групу м’язів і вправу зі списку.' })]),
      h('button', { type: 'button', class: 'btn btn-primary btn-block add-exercise', onclick: openPicker }, svg(icons.plus), 'Додати вправу'),
    )
  }

  // Зведення по виконаних вправах — для фільтра «Мої» у виборі вправи
  let history = new Map()

  Promise.all([listExercises(), exerciseHistoryIndex()]).then(([all, hist]) => {
    for (const e of all) exMap.set(e.id, e)
    history = hist
    render()
  })
  return root
}
