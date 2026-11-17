// Резервна копія: експорт / імпорт усіх даних у JSON.
import { getDB, DB_VERSION } from '../db/db.js'
import { toISODate } from './format.js'

const APP_ID = 'workout-app'
const STORES = ['exercises', 'workouts', 'meals', 'bodyWeight']
const LAST_BACKUP_KEY = 'lastBackupAt'
// службові ключі meta, які не переносимо між пристроями
const META_SKIP = new Set([LAST_BACKUP_KEY])

/*
 * Формат файлу:
 * {
 *   app: 'workout-app', schemaVersion, exportedAt: ISO,
 *   data: { exercises: [], workouts: [], meals: [], bodyWeight: [], meta: [{ key, value }] }
 * }
 */

export async function exportData() {
  const db = await getDB()
  const data = {}
  for (const store of STORES) data[store] = await db.getAll(store)
  const [keys, values] = await Promise.all([db.getAllKeys('meta'), db.getAll('meta')])
  data.meta = keys.map((key, i) => ({ key, value: values[i] })).filter((m) => !META_SKIP.has(m.key))
  return { app: APP_ID, schemaVersion: DB_VERSION, exportedAt: new Date().toISOString(), data }
}

export const backupFileName = () => `workout-backup-${toISODate()}.json`

/**
 * Віддає файл користувачу: на iPhone — системне меню «Поділитися» (→ «Зберегти у Файли»),
 * інакше — звичайне завантаження. Повертає 'shared' | 'downloaded' | 'cancelled'.
 */
export async function deliverFile(json, name) {
  const file = new File([json], name, { type: 'application/json' })
  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: 'Резервна копія тренувань' })
      return 'shared'
    } catch (e) {
      if (e.name === 'AbortError') return 'cancelled'
      // інша помилка — пробуємо звичайне завантаження
    }
  }
  const url = URL.createObjectURL(file)
  const a = document.createElement('a')
  a.href = url
  a.download = name
  document.body.append(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 10000)
  return 'downloaded'
}

// ---------- Перевірка файлу ----------
const isStr = (v) => typeof v === 'string' && v.length > 0
const isNum = (v) => typeof v === 'number' && Number.isFinite(v)
const VALIDATORS = {
  exercises: (r) => isStr(r?.id) && isStr(r.name) && r.custom === true,
  workouts: (r) => isStr(r?.id) && isStr(r.date) && Array.isArray(r.exercises) && isNum(r.startedAt),
  meals: (r) => isStr(r?.id) && isStr(r.date) && isNum(r.kcal),
  bodyWeight: (r) => isStr(r?.date) && isNum(r.kg),
}

/**
 * Розбирає й перевіряє файл бекапу.
 * Повертає { ok: true, backup, counts, skipped } або { ok: false, error }.
 */
export function parseBackup(text) {
  let obj
  try {
    obj = JSON.parse(text)
  } catch {
    return { ok: false, error: 'Файл пошкоджений або це не JSON.' }
  }
  if (obj?.app !== APP_ID || typeof obj.data !== 'object' || !obj.data) {
    return { ok: false, error: 'Це не резервна копія цього застосунку.' }
  }
  if (obj.schemaVersion > DB_VERSION) {
    return { ok: false, error: 'Копію створено новішою версією застосунку. Спершу онови застосунок.' }
  }

  const data = {}
  const counts = {}
  let skipped = 0
  for (const store of STORES) {
    const list = Array.isArray(obj.data[store]) ? obj.data[store] : []
    data[store] = list.filter(VALIDATORS[store])
    counts[store] = data[store].length
    skipped += list.length - data[store].length
  }
  data.meta = (Array.isArray(obj.data.meta) ? obj.data.meta : []).filter((m) => isStr(m?.key) && !META_SKIP.has(m.key))

  return { ok: true, backup: { ...obj, data }, counts, skipped }
}

/**
 * Записує дані з бекапу.
 * mode: 'replace' — очистити все й записати; 'merge' — додати/оновити записи з тими ж id.
 */
export async function importData(backup, mode) {
  const db = await getDB()
  const tx = db.transaction([...STORES, 'meta'], 'readwrite')
  // при об'єднанні не перезаписуємо поточне активне тренування
  const keepActive = mode === 'merge' && !!(await tx.objectStore('meta').get('activeWorkout'))
  const ops = []
  if (mode === 'replace') {
    for (const store of STORES) ops.push(tx.objectStore(store).clear())
    // профіль і чернетку тренування замінюємо, службові ключі (дата бекапу) лишаємо
    ops.push(tx.objectStore('meta').delete('profile'), tx.objectStore('meta').delete('activeWorkout'))
  }
  for (const store of STORES) for (const rec of backup.data[store]) ops.push(tx.objectStore(store).put(rec))
  for (const { key, value } of backup.data.meta) {
    if (keepActive && key === 'activeWorkout') continue
    ops.push(tx.objectStore('meta').put(value, key))
  }
  await Promise.all([...ops, tx.done])
}

// ---------- Статус і нагадування ----------
export async function markBackupDone() {
  await (await getDB()).put('meta', Date.now(), LAST_BACKUP_KEY)
}

/** { lastBackupAt, counts: { workouts, meals, bodyWeight, exercises }, total, needsBackup } */
export async function getBackupStatus() {
  const db = await getDB()
  const [lastBackupAt, workouts, meals, bodyWeight, exercises] = await Promise.all([
    db.get('meta', LAST_BACKUP_KEY),
    db.count('workouts'),
    db.count('meals'),
    db.count('bodyWeight'),
    db.count('exercises'),
  ])
  const total = workouts + meals + bodyWeight + exercises
  const WEEK = 7 * 86400000
  const needsBackup = total > 0 && (!lastBackupAt || Date.now() - lastBackupAt > WEEK)
  return { lastBackupAt: lastBackupAt ?? null, counts: { workouts, meals, bodyWeight, exercises }, total, needsBackup }
}

/** Видаляє всі дані користувача (база лишається, сховища очищуються). */
export async function wipeAllData() {
  const db = await getDB()
  const tx = db.transaction([...STORES, 'meta'], 'readwrite')
  await Promise.all([...STORES.map((s) => tx.objectStore(s).clear()), tx.objectStore('meta').clear(), tx.done])
}
