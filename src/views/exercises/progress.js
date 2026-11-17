import { h, svg } from '../../lib/dom.js'
import { emptyState } from '../../components/page.js'
import { icons } from '../../components/icons.js'
import { segmented } from '../../components/segmented.js'
import { workoutsWithExercise } from '../../db/workouts.js'
import { volume, maxWeight, bestE1rm } from '../../lib/calc.js'
import { lineChart, destroyChart, whenConnected } from '../../lib/charts.js'
import { formatNum, formatDateLong, formatDateShort, setsSummary, plural } from '../../lib/format.js'

const DAY = 86400000

/** Сесії вправи (по одній на тренування), від старих до нових. */
export async function loadSessions(exerciseId) {
  const workouts = await workoutsWithExercise(exerciseId)
  return workouts
    .map((w) => {
      const sets = w.exercises.find((e) => e.exerciseId === exerciseId).sets
      return {
        ts: w.startedAt,
        date: w.date,
        workoutId: w.id,
        sets,
        maxWeight: maxWeight(sets),
        e1rm: bestE1rm(sets),
        volume: volume(sets),
        maxReps: Math.max(...sets.map((s) => s.reps)),
        totalReps: sets.reduce((n, s) => n + s.reps, 0),
      }
    })
    .sort((a, b) => a.ts - b.ts)
}

const RANGES = [
  { id: '90', label: '3 міс' },
  { id: '180', label: '6 міс' },
  { id: '365', label: 'Рік' },
  { id: 'all', label: 'Усе' },
]

// Вибір показника й періоду зберігається, поки застосунок відкритий
const prefs = { metric: null, range: 'all' }

const kg = (n) => `${formatNum(n, 1)} кг`

const tile = (label, value, sub) =>
  h('div', { class: 'stat' }, h('div', { class: 'stat-value' }, value), h('div', { class: 'stat-label' }, label), sub && h('div', { class: 'stat-sub' }, sub))

/** Секція «Прогрес»: рекорди, графік, історія. */
export function progressView(sessions) {
  if (!sessions.length) {
    return emptyState({
      icon: icons.chart,
      title: 'Ще немає даних',
      text: 'Додай цю вправу в тренування — тут з’являться графік прогресу та історія.',
    })
  }

  const weighted = sessions.some((s) => s.maxWeight > 0)
  const metrics = weighted
    ? [
        { id: 'maxWeight', label: 'Макс. вага', fmt: kg, note: 'Найбільша вага в тренуванні' },
        { id: 'e1rm', label: '1ПМ', fmt: kg, note: 'Орієнтовний максимум на 1 повтор (формула Епплі)' },
        { id: 'volume', label: 'Об’єм', fmt: (n) => `${formatNum(Math.round(n))} кг`, note: 'Сума повторень × вага за тренування' },
      ]
    : [
        { id: 'maxReps', label: 'Макс. повт.', fmt: (n) => `${formatNum(n)} повт.`, note: 'Найбільше повторень в одному підході' },
        { id: 'totalReps', label: 'Усього повт.', fmt: (n) => `${formatNum(n)} повт.`, note: 'Сума повторень за тренування' },
      ]
  if (!metrics.some((m) => m.id === prefs.metric)) prefs.metric = metrics[0].id

  // ---------- Рекорди ----------
  const recordKey = weighted ? 'maxWeight' : 'maxReps'
  const best = sessions.reduce((a, b) => (b[recordKey] > a[recordKey] ? b : a))
  const bestE = sessions.reduce((a, b) => (b.e1rm > a.e1rm ? b : a))
  const tiles = h(
    'div',
    { class: 'stats ' + (weighted ? 'stats-3' : 'stats-2') },
    weighted
      ? [
          tile('Рекорд ваги', kg(best.maxWeight), formatDateShort(best.date)),
          tile('Найкращий 1ПМ', kg(bestE.e1rm), formatDateShort(bestE.date)),
        ]
      : [tile('Рекорд повт.', formatNum(best.maxReps), formatDateShort(best.date))],
    tile(plural(sessions.length, ['Тренування', 'Тренування', 'Тренувань']), sessions.length),
  )

  // ---------- Графік ----------
  const headline = h('div', { class: 'chart-headline' })
  const note = h('p', { class: 'chart-note' })
  const canvas = h('canvas', { role: 'img' })
  const chartBox = h('div', { class: 'chart-box' }, canvas)
  const chartEmpty = h('div', { class: 'chart-empty' }, 'Немає даних за цей період')
  let chart = null

  function drawChart() {
    destroyChart(chart)
    chart = null
    const metric = metrics.find((m) => m.id === prefs.metric)
    const from = prefs.range === 'all' ? -Infinity : Date.now() - Number(prefs.range) * DAY
    const pts = sessions.filter((s) => s.ts >= from && s[metric.id] > 0).map((s) => ({ x: s.ts, y: s[metric.id], s }))

    note.textContent = metric.note
    canvas.setAttribute('aria-label', `Графік: ${metric.label}`)

    if (!pts.length) {
      headline.replaceChildren()
      chartBox.replaceChildren(chartEmpty)
      return
    }
    chartBox.replaceChildren(canvas)

    // Заголовок графіка: останнє значення + зміна за період
    const first = pts[0].y
    const last = pts.at(-1).y
    const delta = last - first
    headline.replaceChildren(
      h('span', { class: 'chart-value' }, metric.fmt(last)),
      pts.length > 1 &&
        h(
          'span',
          { class: 'chart-delta' },
          delta === 0 ? 'без змін' : `${delta > 0 ? '▲ +' : '▼ −'}${metric.fmt(Math.abs(delta))}`,
          ' за період',
        ),
    )

    const span = pts.at(-1).x - pts[0].x
    const fmtX = (ts) => {
      const d = new Date(ts)
      return span > 300 * DAY
        ? new Intl.DateTimeFormat('uk-UA', { month: 'short', year: '2-digit' }).format(d)
        : new Intl.DateTimeFormat('uk-UA', { day: 'numeric', month: 'short' }).format(d)
    }

    whenConnected(canvas, () => {
      chart = lineChart(canvas, {
        points: pts,
        formatX: fmtX,
        formatY: (v) => formatNum(v, 1),
        tooltip: {
          title: (raw) => formatDateLong(raw.s.date),
          label: (raw) => metric.fmt(raw.y),
          footer: (raw) => setsSummary(raw.s.sets),
        },
      })
    })
  }

  const metricSwitch = segmented(
    metrics.map(({ id, label }) => ({ id, label })),
    prefs.metric,
    (id) => {
      prefs.metric = id
      drawChart()
    },
  )
  const rangeSwitch = segmented(RANGES, prefs.range, (id) => {
    prefs.range = id
    drawChart()
  }, { size: 'sm' })

  drawChart()

  // ---------- Історія (новіші зверху), з позначкою рекордів ----------
  let record = 0
  const prFlags = new Map()
  for (const s of sessions) {
    if (record > 0 && s[recordKey] > record) prFlags.set(s.workoutId, true)
    record = Math.max(record, s[recordKey])
  }
  const history = h(
    'div',
    { class: 'list' },
    [...sessions].reverse().map((s) =>
      h(
        'a',
        { class: 'list-row link', href: '#/workout/' + s.workoutId },
        h(
          'div',
          { class: 'row-main' },
          h('div', { class: 'row-title' }, formatDateLong(s.date), prFlags.get(s.workoutId) && h('span', { class: 'badge' }, 'рекорд')),
          h('div', { class: 'row-sub' }, setsSummary(s.sets)),
          weighted && s.e1rm > 0 && h('div', { class: 'row-sub faint' }, `1ПМ ≈ ${kg(s.e1rm)} · об’єм ${formatNum(Math.round(s.volume))} кг`),
        ),
        svg(icons.chevronRight),
      ),
    ),
  )

  return h(
    'div',
    { class: 'progress' },
    tiles,
    h('div', { class: 'card chart-card' }, metricSwitch, headline, chartBox, rangeSwitch, note),
    h('h3', { class: 'section-title', style: { marginTop: '20px' } }, 'Історія', h('span', { class: 'count' }, sessions.length)),
    history,
  )
}
