import { h, svg } from '../../lib/dom.js'
import { page, iconButton, emptyState } from '../../components/page.js'
import { icons } from '../../components/icons.js'
import { ring } from '../../components/ring.js'
import { segmented } from '../../components/segmented.js'
import { refresh } from '../../router.js'
import { getProfile, mealsByDate, dailyTotals } from '../../db/nutrition.js'
import { calcTargets, sumMeals, MEAL_TYPES } from '../../lib/nutrition.js'
import { barChart, whenConnected } from '../../lib/charts.js'
import { toISODate, parseISODate, formatDateLong, formatNum } from '../../lib/format.js'
import { openMealSheet } from './meal-sheet.js'

// Вибраний день і період графіка зберігаються, поки застосунок відкритий
const state = { date: null, range: 7 }

const shiftDate = (iso, days) => {
  const d = parseISODate(iso)
  d.setDate(d.getDate() + days)
  return toISODate(d)
}

function dayLabel(iso) {
  const today = toISODate()
  if (iso === today) return 'Сьогодні'
  if (iso === shiftDate(today, -1)) return 'Вчора'
  return formatDateLong(iso)
}

const kcal = (n) => formatNum(Math.round(n))
const reload = () => refresh({ keepScroll: true })

// ---------- Перемикач дня ----------
function dateNav() {
  const today = toISODate()
  const go = (iso) => {
    state.date = iso
    reload()
  }
  const picker = h('input', {
    type: 'date',
    class: 'date-picker',
    value: state.date,
    max: today,
    'aria-label': 'Вибрати дату',
    onchange: (e) => e.target.value && go(e.target.value),
  })
  return h(
    'div',
    { class: 'date-nav' },
    h('button', { type: 'button', class: 'icon-btn', 'aria-label': 'Попередній день', onclick: () => go(shiftDate(state.date, -1)) }, svg(icons.chevronLeft)),
    h('label', { class: 'date-label' }, dayLabel(state.date), picker),
    h(
      'button',
      {
        type: 'button',
        class: 'icon-btn',
        'aria-label': 'Наступний день',
        disabled: state.date >= today,
        onclick: () => go(shiftDate(state.date, 1)),
      },
      svg(icons.chevronRight),
    ),
  )
}

// ---------- Підсумок дня ----------
function macroBar(label, value, target) {
  const pct = target ? Math.min(100, (value / target) * 100) : 0
  return h(
    'div',
    { class: 'macro' },
    h('div', { class: 'macro-head' }, h('span', null, label), h('span', { class: 'macro-val' }, `${formatNum(Math.round(value))}${target ? ' / ' + target : ''} г`)),
    h('div', { class: 'macro-track' }, h('div', { class: 'macro-fill' + (target && value > target ? ' over' : ''), style: { width: pct + '%' } })),
  )
}

function summaryCard(totals, targets) {
  const center = h(
    'div',
    null,
    h('div', { class: 'ring-value-text' }, kcal(totals.kcal)),
    h('div', { class: 'ring-sub' }, targets ? `з ${kcal(targets.kcal)} ккал` : 'ккал'),
  )

  let status
  if (!targets) {
    status = h(
      'div',
      { class: 'summary-status' },
      h('p', { class: 'muted small' }, 'Норма не задана'),
      h('a', { class: 'btn btn-primary', href: '#/nutrition/profile', style: { marginTop: '8px' } }, 'Розрахувати'),
    )
  } else {
    const diff = targets.kcal - totals.kcal
    status = h(
      'div',
      { class: 'summary-status' },
      h('div', { class: 'summary-label' }, diff >= 0 ? 'Залишилось' : 'Перевищено на'),
      h('div', { class: 'summary-num' + (diff < 0 ? ' over' : '') }, kcal(Math.abs(diff)), h('span', null, ' ккал')),
      h('div', { class: 'summary-label', style: { marginTop: '6px' } }, `${Math.round((totals.kcal / targets.kcal) * 100)}% від норми`),
    )
  }

  return h(
    'div',
    { class: 'card' },
    h('div', { class: 'summary' }, ring({ value: totals.kcal, max: targets?.kcal, center }), status),
    h(
      'div',
      { class: 'macros' },
      macroBar('Білки', totals.protein, targets?.protein),
      macroBar('Жири', totals.fat, targets?.fat),
      macroBar('Вуглеводи', totals.carbs, targets?.carbs),
    ),
  )
}

// ---------- Прийоми їжі ----------
function mealRow(m) {
  const macros = [m.protein != null && `Б ${formatNum(m.protein)}`, m.fat != null && `Ж ${formatNum(m.fat)}`, m.carbs != null && `В ${formatNum(m.carbs)}`]
    .filter(Boolean)
    .join(' · ')
  return h(
    'button',
    { type: 'button', class: 'list-row picker-row meal-row', onclick: () => openMealSheet({ meal: m, onSaved: reload }) },
    h('div', { class: 'row-main' }, h('div', { class: 'row-title' }, m.name), h('div', { class: 'row-sub' }, [m.time, macros].filter(Boolean).join(' · '))),
    h('span', { class: 'meal-kcal' }, kcal(m.kcal)),
  )
}

function mealsList(meals) {
  if (!meals.length) {
    return emptyState({ icon: icons.food, title: 'Ще нічого не записано', text: 'Додай перший прийом їжі за цей день.' })
  }
  return MEAL_TYPES.map((t) => [t, meals.filter((m) => m.type === t.id)])
    .filter(([, list]) => list.length)
    .map(([t, list]) =>
      h(
        'div',
        { class: 'section' },
        h('h3', { class: 'section-title' }, t.name, h('span', { class: 'count' }, `${kcal(sumMeals(list).kcal)} ккал`)),
        h('div', { class: 'list' }, list.map(mealRow)),
      ),
    )
}

// ---------- Історія ----------
function historyCard(totalsByDate, targets) {
  const canvas = h('canvas', { role: 'img', 'aria-label': 'Калорії по днях' })
  const box = h('div', { class: 'chart-box' }, canvas)
  const avgEl = h('div', { class: 'chart-headline' })

  const today = toISODate()
  const days = Array.from({ length: state.range }, (_, i) => shiftDate(today, i - state.range + 1))
  const values = days.map((d) => Math.round(totalsByDate.get(d)?.kcal ?? 0))
  const filled = values.filter((v) => v > 0)
  const avg = filled.length ? filled.reduce((a, b) => a + b, 0) / filled.length : 0

  avgEl.append(
    h('span', { class: 'chart-value' }, filled.length ? `${kcal(avg)} ккал` : '—'),
    h('span', { class: 'chart-delta' }, filled.length ? `в середньому за ${filled.length} ${filled.length === 1 ? 'день' : filled.length < 5 ? 'дні' : 'днів'} із записами` : 'немає записів за період'),
  )

  const short = new Intl.DateTimeFormat('uk-UA', state.range <= 7 ? { weekday: 'short' } : { day: 'numeric' })
  const labels = days.map((d) => short.format(parseISODate(d)))

  whenConnected(canvas, () =>
    barChart(canvas, {
      labels,
      values,
      target: targets?.kcal,
      targetLabel: targets ? `норма ${kcal(targets.kcal)}` : undefined,
      highlight: days.indexOf(state.date),
      formatY: (v) => formatNum(v),
      tooltip: {
        title: (i) => formatDateLong(days[i]),
        label: (i) => (values[i] ? `${kcal(values[i])} ккал` : 'немає записів'),
        footer: (i) => (targets && values[i] ? `${Math.round((values[i] / targets.kcal) * 100)}% від норми` : ''),
      },
      onClick: (i) => {
        state.date = days[i]
        refresh()
      },
    }),
  )

  const rangeSwitch = segmented(
    [
      { id: 7, label: '7 днів' },
      { id: 14, label: '14 днів' },
      { id: 30, label: '30 днів' },
    ],
    state.range,
    (id) => {
      state.range = id
      reload()
    },
    { size: 'sm' },
  )

  // Список днів із записами (новіші зверху)
  const rows = [...days]
    .reverse()
    .filter((d) => totalsByDate.has(d))
    .map((d) => {
      const t = totalsByDate.get(d)
      return h(
        'button',
        {
          type: 'button',
          class: 'list-row picker-row',
          onclick: () => {
            state.date = d
            refresh()
          },
        },
        h('div', { class: 'row-main' }, h('div', { class: 'row-title' }, dayLabel(d)), h('div', { class: 'row-sub' }, `${t.count} ${t.count === 1 ? 'запис' : t.count < 5 ? 'записи' : 'записів'}`)),
        h('span', { class: 'meal-kcal' }, kcal(t.kcal), targets && h('span', { class: 'pct' }, ` · ${Math.round((t.kcal / targets.kcal) * 100)}%`)),
      )
    })

  return [
    h('div', { class: 'card chart-card' }, rangeSwitch, avgEl, box, h('p', { class: 'chart-note' }, 'Натисни на стовпчик, щоб відкрити день')),
    rows.length > 0 && h('div', { class: 'list', style: { marginTop: '12px' } }, rows),
  ]
}

export async function nutritionView() {
  state.date ??= toISODate()
  const today = toISODate()
  const from = shiftDate(today, -29)

  const [profile, meals, totalsByDate] = await Promise.all([getProfile(), mealsByDate(state.date), dailyTotals(from, today)])
  const targets = profile ? calcTargets(profile) : null
  const totals = sumMeals(meals)

  return page(
    {
      title: 'Харчування',
      actions: [iconButton(icons.target, 'Норма калорій', { href: '#/nutrition/profile' })],
      headerExtra: [dateNav()],
    },
    summaryCard(totals, targets),
    h('div', { style: { marginTop: '16px' } }, mealsList(meals)),
    h(
      'button',
      { class: 'btn btn-primary btn-block btn-lg', style: { marginTop: '16px' }, onclick: () => openMealSheet({ date: state.date, onSaved: reload }) },
      svg(icons.plus),
      'Додати прийом їжі',
    ),
    h('h2', { class: 'block-title' }, 'Історія'),
    historyCard(totalsByDate, targets),
  )
}
