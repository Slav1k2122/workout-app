import { h, svg } from '../../lib/dom.js'
import { page } from '../../components/page.js'
import { icons } from '../../components/icons.js'
import { toast } from '../../components/toast.js'
import { openSheet } from '../../components/sheet.js'
import { refresh } from '../../router.js'
import {
  exportData,
  backupFileName,
  deliverFile,
  parseBackup,
  importData,
  markBackupDone,
  getBackupStatus,
  wipeAllData,
} from '../../lib/backup.js'
import { formatDateShort, formatTime, toISODate, plural, formatNum } from '../../lib/format.js'

const isStandalone = () => window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true

const row = (label, value) => h('div', { class: 'list-row' }, h('span', null, label), h('span', { class: 'muted' }, value))
const DAY = 86400000

function lastBackupText(ts) {
  if (!ts) return 'ще жодного разу'
  const days = Math.floor((Date.now() - ts) / DAY)
  if (days === 0) return `сьогодні о ${formatTime(ts)}`
  return `${formatDateShort(toISODate(new Date(ts)))} (${days} ${plural(days, ['день', 'дні', 'днів'])} тому)`
}

// ---------- Експорт ----------
async function doExport() {
  const backup = await exportData()
  const result = await deliverFile(JSON.stringify(backup), backupFileName())
  if (result === 'cancelled') return
  await markBackupDone()
  toast(result === 'shared' ? 'Копію створено' : 'Файл завантажено')
  refresh({ keepScroll: true })
}

// ---------- Імпорт ----------
function pickFile() {
  const input = h('input', {
    type: 'file',
    accept: '.json,application/json,text/plain',
    style: { display: 'none' },
    onchange: async () => {
      const file = input.files?.[0]
      input.remove()
      if (!file) return
      const parsed = parseBackup(await file.text())
      if (!parsed.ok) {
        alert(parsed.error)
        return
      }
      openImportSheet(parsed, file.name)
    },
  })
  document.body.append(input)
  input.click()
}

function openImportSheet({ backup, counts, skipped }, fileName) {
  const exported = backup.exportedAt ? new Date(backup.exportedAt) : null
  const line = (label, n) => row(label, formatNum(n))

  let close
  async function run(mode) {
    const msg =
      mode === 'replace'
        ? 'Усі поточні дані на цьому пристрої буде ЗАМІНЕНО даними з файлу. Продовжити?'
        : 'Дані з файлу буде додано до поточних (записи з тими ж id оновляться). Продовжити?'
    if (!confirm(msg)) return
    await importData(backup, mode)
    close()
    toast('Дані відновлено')
    refresh()
  }

  close = openSheet({
    title: 'Відновлення з копії',
    full: true,
    doneLabel: 'Скасувати',
    content: h(
      'div',
      { class: 'form meal-form' },
      h(
        'div',
        { class: 'list' },
        row('Файл', fileName),
        exported && row('Створено', `${formatDateShort(toISODate(exported))}, ${formatTime(exported.getTime())}`),
        line('Тренувань', counts.workouts),
        line('Прийомів їжі', counts.meals),
        line('Записів ваги', counts.bodyWeight),
        line('Власних вправ', counts.exercises),
      ),
      skipped > 0 && h('p', { class: 'field-hint' }, `Пропущено пошкоджених записів: ${skipped}`),
      h('button', { type: 'button', class: 'btn btn-primary btn-block btn-lg', onclick: () => run('merge') }, 'Об’єднати з поточними'),
      h('p', { class: 'field-hint' }, 'Нічого не видаляє: додає записи з файлу, однакові — оновлює.'),
      h('button', { type: 'button', class: 'btn btn-danger btn-block', onclick: () => run('replace') }, 'Замінити всі дані'),
      h('p', { class: 'field-hint' }, 'Видаляє поточні дані на пристрої й записує дані з файлу.'),
    ),
  })
}

// ---------- Видалення всіх даних ----------
async function doWipe() {
  if (!confirm('Видалити ВСІ дані: тренування, харчування, вагу, власні вправи й налаштування?')) return
  if (!confirm('Точно? Дію не можна скасувати. Радимо спершу зробити резервну копію.')) return
  await wipeAllData()
  toast('Усі дані видалено')
  refresh()
}

export async function moreView() {
  const status = await getBackupStatus()
  const { counts } = status

  // Сховище
  const storageRow = h('span', { class: 'muted' }, '…')
  const persistRow = h('span', { class: 'muted' }, '…')
  navigator.storage?.estimate?.().then(({ usage }) => {
    storageRow.textContent = usage != null ? `${formatNum(usage / 1024 / 1024, 1)} МБ` : '—'
  })
  if (navigator.storage?.persisted) navigator.storage.persisted().then((p) => (persistRow.textContent = p ? 'так ✓' : 'ні'))
  else persistRow.textContent = 'не підтримується'

  // Офлайн-режим
  const swStatus = h('span', { class: 'muted' }, '…')
  if (!('serviceWorker' in navigator)) swStatus.textContent = 'не підтримується'
  else if (!window.isSecureContext) swStatus.textContent = 'потрібен HTTPS'
  else navigator.serviceWorker.getRegistration().then((reg) => (swStatus.textContent = reg?.active ? 'готовий ✓' : 'ще не активний'))

  const backupCard = h(
    'div',
    { class: 'card backup-card' + (status.needsBackup ? ' warn' : '') },
    h('h2', null, 'Резервна копія'),
    h('p', { class: 'muted small' }, `Остання копія: ${lastBackupText(status.lastBackupAt)}`),
    status.needsBackup &&
      h('p', { class: 'backup-warn' }, 'Дані зберігаються лише на цьому телефоні. Якщо видалити застосунок або очистити дані Safari — вони зникнуть. Зроби копію й збережи у «Файли» або iCloud.'),
    h(
      'div',
      { class: 'backup-actions' },
      h('button', { class: 'btn btn-primary', onclick: doExport }, 'Створити копію'),
      h('button', { class: 'btn', onclick: pickFile }, 'Відновити'),
    ),
  )

  const installHint =
    !isStandalone() &&
    h(
      'div',
      { class: 'card' },
      h('h2', null, 'Встанови на головний екран'),
      h('p', { class: 'muted small' }, 'У Safari натисни «Поділитися» → «На початковий екран». Так застосунок працюватиме офлайн і на весь екран. Зверни увагу: дані у вкладці Safari і в застосунку з головного екрана зберігаються окремо.'),
    )

  return page(
    'Ще',
    installHint,
    backupCard,
    h('h3', { class: 'section-title', style: { marginTop: '20px' } }, 'Дані'),
    h(
      'div',
      { class: 'list' },
      row('Тренувань', formatNum(counts.workouts)),
      row('Прийомів їжі', formatNum(counts.meals)),
      row('Записів ваги', formatNum(counts.bodyWeight)),
      row('Власних вправ', formatNum(counts.exercises)),
      h('div', { class: 'list-row' }, h('span', null, 'Зайнято місця'), storageRow),
      h('div', { class: 'list-row' }, h('span', null, 'Захист від автоочищення'), persistRow),
    ),
    h('h3', { class: 'section-title', style: { marginTop: '20px' } }, 'Про застосунок'),
    h(
      'div',
      { class: 'list' },
      row('Версія', __APP_VERSION__),
      row('Запущено як застосунок', isStandalone() ? 'так ✓' : 'ні (вкладка Safari)'),
      h('div', { class: 'list-row' }, h('span', null, 'Офлайн-режим'), swStatus),
    ),
    h('button', { class: 'btn btn-danger btn-block', style: { marginTop: '28px' }, onclick: doWipe }, svg(icons.trash), 'Видалити всі дані'),
  )
}
