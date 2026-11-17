import { openDB } from 'idb'

export const DB_NAME = 'workout-app'
export const DB_VERSION = 1

let dbPromise = null

/** Відкриває (і за потреби створює/мігрує) базу. Усі сховища створюються одразу у v1. */
export function getDB() {
  dbPromise ??= openDB(DB_NAME, DB_VERSION, {
    upgrade(db, oldVersion) {
      if (oldVersion < 1) {
        const exercises = db.createObjectStore('exercises', { keyPath: 'id' })
        exercises.createIndex('group', 'group')

        const workouts = db.createObjectStore('workouts', { keyPath: 'id' })
        workouts.createIndex('date', 'date')
        workouts.createIndex('exerciseIds', 'exerciseIds', { multiEntry: true })

        const meals = db.createObjectStore('meals', { keyPath: 'id' })
        meals.createIndex('date', 'date')

        db.createObjectStore('bodyWeight', { keyPath: 'date' })
        db.createObjectStore('meta') // ключ задається явно: 'profile', 'activeWorkout', …
      }
      // Майбутні міграції: if (oldVersion < 2) { ... }
    },
    blocking() {
      // Відкрилась нова версія застосунку з новішою схемою — звільняємо базу й перезавантажуємось
      dbPromise?.then((db) => db.close())
      location.reload()
    },
  })
  return dbPromise
}

/** Просить браузер не видаляти дані автоматично (особливо важливо для iOS). */
export async function requestPersistence() {
  try {
    if (navigator.storage?.persist && !(await navigator.storage.persisted())) {
      await navigator.storage.persist()
    }
  } catch {
    /* не критично */
  }
}
