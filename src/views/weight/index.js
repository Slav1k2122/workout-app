import { h } from '../../lib/dom.js'
import { page, emptyState } from '../../components/page.js'
import { icons } from '../../components/icons.js'
import { segmented } from '../../components/segmented.js'
import { openSheet } from '../../components/sheet.js'
import { toast } from '../../components/toast.js'
import { refresh } from '../../router.js'
import { listWeights, saveWeight, deleteWeight } from '../../db/weight.js'
import { lineChart, destroyChart, whenConnected } from '../../lib/charts.js'
import { toISODate, parseISODate, formatDateLong, formatDateShort, formatNum, parseNum, toInputNum } from '../../lib/format.js'

const DAY = 86400000
const RANGES = [
  { id: 7, label: 'Тиждень' },
  { id: 30, label: 'Місяць' },
  { id: 'all', label: 'Усе' },
]
const state = { range: 30 }

const kg = (n) => `${formatNum(n, 1)} кг`
const signed = (d) => (Math.abs(d) < 0.05 ? 'без змін' : `${d > 0 ? '▲ +' : '▼ −'}${formatNum(Math.abs(d), 1)} кг`)
const reload = () => refresh({ keepScroll: true })
const validKg = (n) => n != null && n >= 20 && n <= 400

// ---------- Нижня панель: додати / редагувати запис ----------
function openEntrySheet(entry, latestKg) {
  const editing = !!entry
  const dateInput = h('input', { class: 'input', type: 'date', value: entry?.date ?? toISODate(), max: toISODate() })
  const kgInput = h('input', {
    class: 'input num-input big-input',
    type: 'text',
    inputmode: 'decimal',
    autocomplete: 'off',
    placeholder: latestKg ? toInputNum(latestKg) : 'кг',
    value: toInputNum(entry?.kg),
  })

  let close
  async function save(e) {
    e.preventDefault()
    const value = parseNum(kgInput.value)
    if (!validKg(value)) return toast('Вкажи вагу від 20 до 400 кг')
    if (!dateInput.value) return toast('Вкажи дату')
    if (editing && dateInput.value !== entry.date) await deleteWeight(entry.date)
    await saveWeight({ date: dateInput.value, kg: value })
    close()
    toast('Збережено')
    reload()
  }
  async function remove() {
    if (!confirm('Видалити цей запис?')) return
    await deleteWeight(entry.date)
    close()
    toast('Видалено')
    reload()
  }

  close = openSheet({
    title: editing ? 'Редагувати запис' : 'Додати вагу',
    full: true,
    doneLabel: 'Скасувати',
    content: h(
      'form',
      { class: 'form meal-form', onsubmit: save },
      h('label', { class: 'field' }, h('span', { class: 'field-label' }, 'Вага, кг'), kgInput),
      h('label', { class: 'field' }, h('span', { class: 'field-label' }, 'Дата'), dateInput, h('span', { class: 'field-hint' }, 'Один запис на день — повторний перезапише попередній')),
      h('button', { type: 'submit', class: 'btn btn-primary btn-block btn-lg' }, 'Зберегти'),
      editing && h('button', { type: 'button', class: 'btn btn-danger btn-block', onclick: remove }, 'Видалити'),
    ),
  })
}

// ---------- Швидке введення ваги за сьогодні ----------
function quickAdd(entries) {
  const today = toISODate()
  const todayEntry = entries.find((e) => e.date === today)
  const last = entries.at(-1)
  const input = h('input', {
    class: 'input num-input big-input',
    type: 'text',
    inputmode: 'decimal',
    autocomplete: 'off',
    'aria-label': 'Вага сьогодні, кг',
    placeholder: last ? toInputNum(last.kg) : 'кг',
    value: toInputNum(todayEntry?.kg),
  })
  async function save(e) {
    e.preventDefault()
    const value = parseNum(input.value)
    if (!validKg(value)) return toast('Вкажи вагу від 20 до 400 кг')
    await saveWeight({ date: today, kg: value })
    toast(todayEntry ? 'Оновлено' : 'Збережено')
    reload()
  }
  return h(
    'form',
    { class: 'card quick-add', onsubmit: save },
    h('div', { class: 'quick-add-label' }, h('b', null, 'Вага сьогодні'), h('span', null, todayEntry ? 'вже записано — можна оновити' : 'краще зранку, натщесерце')),
    h('div', { class: 'quick-add-row' }, input, h('button', { type: 'submit', class: 'btn btn-primary' }, todayEntry ? 'Оновити' : 'Зберегти')),
  )
}

// ---------- Графік ----------
function chartCard(entries) {
  const headline = h('div', { class: 'chart-headline' })
  const canvas = h('canvas', { role: 'img', 'aria-label': 'Графік ваги тіла' })
  const box = h('div', { class: 'chart-box' }, canvas)
  let drawn = false

  function draw() {
    const from = state.range === 'all' ? '' : toISODate(new Date(Date.now() - (state.range - 1) * DAY))
    const pts = entries.filter((e) => e.date >= from).map((e) => ({ x: parseISODate(e.date).getTime(), y: e.kg, e }))

    if (!pts.length) {
      headline.replaceChildren(h('span', { class: 'chart-delta' }, 'Немає записів за цей період'))
      box.replaceChildren(h('div', { class: 'chart-empty' }, 'Додай вагу, щоб побачити графік'))
      return
    }
    box.replaceChildren(canvas)
    headline.replaceChildren(
      h('span', { class: 'chart-value' }, kg(pts.at(-1).y)),
      pts.length > 1 && h('span', { class: 'chart-delta' }, `${signed(pts.at(-1).y - pts[0].y)} за період`),
    )

    const span = pts.at(-1).x - pts[0].x
    const fmtX = (ts) =>
      new Intl.DateTimeFormat('uk-UA', span > 300 * DAY ? { month: 'short', year: '2-digit' } : { day: 'numeric', month: 'short' }).format(new Date(ts))

    const prevOf = new Map(entries.map((e, i) => [e.date, entries[i - 1]]))
    const make = () =>
      lineChart(canvas, {
        points: pts,
        formatX: fmtX,
        formatY: (v) => formatNum(v, 1),
        tooltip: {
          title: (raw) => formatDateLong(raw.e.date),
          label: (raw) => kg(raw.y),
          footer: (raw) => {
            const prev = prevOf.get(raw.e.date)
            return prev ? `${signed(raw.y - prev.kg)} від ${formatDateShort(prev.date)}` : 'перший запис'
          },
        },
      })
    if (drawn) {
      destroyChart(canvas.__chart)
      canvas.__chart = make()
    } else
      whenConnected(canvas, () => {
        drawn = true
        canvas.__chart = make()
      })
  }

  const rangeSwitch = segmented(RANGES, state.range, (id) => {
    state.range = id
    draw()
  }, { size: 'sm' })

  draw()
  return h('div', { class: 'card chart-card' }, rangeSwitch, headline, box)
}

export async function weightView() {
  const entries = await listWeights()

  if (!entries.length) {
    return page(
      'Вага',
      quickAdd(entries),
      emptyState({
        icon: icons.scale,
        title: 'Ще немає записів',
        text: 'Записуй вагу регулярно — тут з’являться графік і зміна від початку.',
        action: h('button', { class: 'btn btn-ghost', onclick: () => openEntrySheet(null, null) }, 'Додати запис за іншу дату'),
      }),
    )
  }

  const first = entries[0]
  const last = entries.at(-1)
  const min = entries.reduce((a, b) => (b.kg < a.kg ? b : a))
  const max = entries.reduce((a, b) => (b.kg > a.kg ? b : a))
  const tile = (label, value, sub) =>
    h('div', { class: 'stat' }, h('div', { class: 'stat-value' }, value), h('div', { class: 'stat-label' }, label), sub && h('div', { class: 'stat-sub' }, sub))

  // Список записів, новіші зверху, зі зміною відносно попереднього
  const rows = [...entries].reverse().map((e, i, arr) => {
    const prev = arr[i + 1]
    return h(
      'button',
      { type: 'button', class: 'list-row picker-row', onclick: () => openEntrySheet(e, last.kg) },
      h('div', { class: 'row-main' }, h('div', { class: 'row-title' }, formatDateLong(e.date)), prev && h('div', { class: 'row-sub' }, signed(e.kg - prev.kg))),
      h('span', { class: 'meal-kcal' }, kg(e.kg)),
    )
  })

  return page(
    { title: 'Вага' },
    quickAdd(entries),
    h(
      'div',
      { class: 'stats stats-3', style: { marginTop: '12px' } },
      tile('Старт', kg(first.kg), formatDateShort(first.date)),
      tile('Від початку', entries.length > 1 ? signed(last.kg - first.kg).replace(' кг', '') : '—', entries.length > 1 ? 'кг' : null),
      tile('Мін / макс', `${formatNum(min.kg, 1)}–${formatNum(max.kg, 1)}`, 'кг'),
    ),
    chartCard(entries),
    h(
      'div',
      { class: 'section', style: { marginTop: '20px' } },
      h('h3', { class: 'section-title' }, 'Записи', h('span', { class: 'count' }, entries.length)),
      h('div', { class: 'list' }, rows),
    ),
    h('button', { class: 'btn btn-ghost btn-block', style: { marginTop: '12px' }, onclick: () => openEntrySheet(null, last.kg) }, 'Додати запис за іншу дату'),
  )
}
