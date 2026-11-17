import { getDB } from './db.js'

/*
 * Вага тіла (bodyWeight): { date: 'YYYY-MM-DD' (ключ), kg }
 * Повний функціонал — етап 6.
 */

/** Остання записана вага (кг) або null. */
export async function getLatestWeight() {
  const db = await getDB()
  const cursor = await db.transaction('bodyWeight').store.openCursor(null, 'prev')
  return cursor?.value.kg ?? null
}
