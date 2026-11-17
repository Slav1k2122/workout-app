import { getDB } from './db.js'
import { getProfile, saveProfile } from './nutrition.js'

/*
 * Вага тіла (bodyWeight): { date: 'YYYY-MM-DD' (ключ — один запис на день), kg, updatedAt }
 */

/** Усі записи, від старих до нових. */
export async function listWeights() {
  return (await getDB()).getAll('bodyWeight') // ключ — дата YYYY-MM-DD, тож порядок уже хронологічний
}

/** Остання записана вага (кг) або null. */
export async function getLatestWeight() {
  const db = await getDB()
  const cursor = await db.transaction('bodyWeight').store.openCursor(null, 'prev')
  return cursor?.value.kg ?? null
}

/**
 * Зберігає вагу за день (перезаписує, якщо вже є).
 * Якщо це найсвіжіший запис — оновлює вагу в профілі харчування (норма калорій перераховується).
 */
export async function saveWeight({ date, kg }) {
  const db = await getDB()
  await db.put('bodyWeight', { date, kg, updatedAt: Date.now() })
  const latest = await db.transaction('bodyWeight').store.openCursor(null, 'prev')
  if (latest?.value.date === date) {
    const profile = await getProfile()
    if (profile && profile.weight !== kg) await saveProfile({ ...profile, weight: kg })
  }
}

export async function deleteWeight(date) {
  await (await getDB()).delete('bodyWeight', date)
}
