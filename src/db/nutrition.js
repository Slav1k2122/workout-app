import { getDB } from './db.js'
import { uid } from '../lib/uid.js'
import { sumMeals } from '../lib/nutrition.js'

const PROFILE_KEY = 'profile'

/*
 * Профіль (meta['profile']): { sex, age, height, weight, activity, goal, customKcal }
 * Прийом їжі (meals): { id, date: 'YYYY-MM-DD', time: 'HH:MM', type, name, kcal, protein?, fat?, carbs?, createdAt }
 */

export async function getProfile() {
  return (await (await getDB()).get('meta', PROFILE_KEY)) ?? null
}

export async function saveProfile(profile) {
  await (await getDB()).put('meta', { ...profile, updatedAt: Date.now() }, PROFILE_KEY)
}

/** Прийоми їжі за день, за часом. */
export async function mealsByDate(date) {
  const list = await (await getDB()).getAllFromIndex('meals', 'date', date)
  return list.sort((a, b) => (a.time || '').localeCompare(b.time || '') || a.createdAt - b.createdAt)
}

export async function saveMeal(meal) {
  const record = { ...meal, id: meal.id ?? uid(), createdAt: meal.createdAt ?? Date.now() }
  await (await getDB()).put('meals', record)
  return record
}

export async function deleteMeal(id) {
  await (await getDB()).delete('meals', id)
}

/** Суми по днях у діапазоні дат (включно): Map(date → { kcal, protein, fat, carbs, count }). */
export async function dailyTotals(from, to) {
  const list = await (await getDB()).getAllFromIndex('meals', 'date', IDBKeyRange.bound(from, to))
  const byDate = new Map()
  for (const m of list) {
    if (!byDate.has(m.date)) byDate.set(m.date, [])
    byDate.get(m.date).push(m)
  }
  return new Map([...byDate].map(([date, meals]) => [date, { ...sumMeals(meals), count: meals.length }]))
}

/** Нещодавні унікальні страви (за назвою) — для швидкого повторного додавання. */
export async function recentMeals(limit = 15) {
  const all = await (await getDB()).getAll('meals')
  all.sort((a, b) => b.createdAt - a.createdAt)
  const seen = new Set()
  const out = []
  for (const m of all) {
    const key = m.name.trim().toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    out.push(m)
    if (out.length >= limit) break
  }
  return out
}
