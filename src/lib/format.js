// Форматування дат, чисел і підходів (українська локаль).
const LOCALE = 'uk-UA'
const pad = (n) => String(n).padStart(2, '0')
const capitalize = (s) => s.charAt(0).toUpperCase() + s.slice(1)

/** Дата в локальному часовому поясі у форматі YYYY-MM-DD. */
export function toISODate(d = new Date()) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

export function parseISODate(iso) {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d)
}

const sameYear = (d) => d.getFullYear() === new Date().getFullYear()

/** «Понеділок, 17 листопада» (+ рік, якщо не поточний). */
export function formatDateLong(iso) {
  const d = parseISODate(iso)
  const opts = { weekday: 'long', day: 'numeric', month: 'long' }
  if (!sameYear(d)) opts.year = 'numeric'
  return capitalize(new Intl.DateTimeFormat(LOCALE, opts).format(d))
}

/** «17 лист.» (+ рік, якщо не поточний). Сьогодні/вчора — словами. */
export function formatDateShort(iso) {
  const today = toISODate()
  if (iso === today) return 'сьогодні'
  const y = new Date()
  y.setDate(y.getDate() - 1)
  if (iso === toISODate(y)) return 'вчора'
  const d = parseISODate(iso)
  const opts = { day: 'numeric', month: 'short' }
  if (!sameYear(d)) opts.year = 'numeric'
  return new Intl.DateTimeFormat(LOCALE, opts).format(d)
}

/** «Листопад 2026» */
export function formatMonth(iso) {
  const d = parseISODate(iso)
  const month = new Intl.DateTimeFormat(LOCALE, { month: 'long' }).format(d)
  return `${capitalize(month)} ${d.getFullYear()}`
}

/** Час «14:05». */
export function formatTime(ts) {
  const d = new Date(ts)
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`
}

/** Тривалість «1 год 5 хв» / «45 хв». */
export function formatDuration(ms) {
  const min = Math.max(0, Math.round(ms / 60000))
  const hrs = Math.floor(min / 60)
  return hrs ? `${hrs} год ${min % 60} хв` : `${min} хв`
}

/** Таймер «12:34» / «1:02:03». */
export function formatClock(ms) {
  const s = Math.max(0, Math.floor(ms / 1000))
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  return h ? `${h}:${pad(m)}:${pad(s % 60)}` : `${m}:${pad(s % 60)}`
}

/** Число з комою, до 2 знаків після коми: 62.5 → «62,5». */
export function formatNum(n, digits = 2) {
  return Number(n).toLocaleString(LOCALE, { maximumFractionDigits: digits }).replace(/ /g, ' ')
}

/** Значення для поля вводу: null → '', 62.5 → '62,5'. */
export const toInputNum = (n) => (n == null ? '' : String(n).replace('.', ','))

/** Розбір числа з поля вводу (кома або крапка). Порожнє/некоректне → null. */
export function parseNum(str) {
  const s = String(str).replace(',', '.').trim()
  if (!s) return null
  const n = Number.parseFloat(s)
  return Number.isFinite(n) && n >= 0 ? Math.round(n * 100) / 100 : null
}

/** Відмінювання: plural(5, ['вправа', 'вправи', 'вправ']) → 'вправ'. */
export function plural(n, [one, few, many]) {
  const m10 = n % 10
  const m100 = n % 100
  if (m10 === 1 && m100 !== 11) return one
  if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return few
  return many
}

/**
 * Короткий опис підходів:
 *   однакові          → «3 × 10 × 60 кг»
 *   однакова вага     → «60 кг × 10, 10, 8»
 *   різні             → «60×10, 62,5×8 кг»
 *   без ваги          → «3 × 15 повт.» / «15, 12, 10 повт.»
 */
export function setsSummary(sets) {
  if (!sets?.length) return '—'
  const weights = sets.map((s) => s.weight || 0)
  const reps = sets.map((s) => s.reps)
  const sameW = weights.every((w) => w === weights[0])
  const sameR = reps.every((r) => r === reps[0])

  if (sameW && weights[0] === 0) {
    return sameR ? `${sets.length} × ${reps[0]} повт.` : `${reps.join(', ')} повт.`
  }
  if (sameW && sameR) return `${sets.length} × ${reps[0]} × ${formatNum(weights[0])} кг`
  if (sameW) return `${formatNum(weights[0])} кг × ${reps.join(', ')}`
  return sets.map((s) => `${formatNum(s.weight || 0)}×${s.reps}`).join(', ') + ' кг'
}
