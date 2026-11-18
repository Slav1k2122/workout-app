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
    terminated() {
      // iOS іноді обриває з'єднання, коли застосунок довго у фоні, — наступний виклик відкриє нове
      dbPromise = null
    },
  }).catch((err) => {
    dbPromise = null
    throw err
  })
  return dbPromise
}

/** Скинути кешоване з'єднання (після помилки, схожої на втрачене з'єднання). */
export function resetDB() {
  dbPromise = null
}

/** Помилка схожа на «мертве» з'єднання з IndexedDB (відомий баг WebKit). */
export function isConnectionError(err) {
  return (
    err?.name === 'InvalidStateError' ||
    err?.name === 'UnknownError' ||
    /connection.*lost/i.test(err?.message ?? '')
  )
}

/** Виконати операцію з базою; якщо з'єднання втрачено — перевідкрити й повторити один раз. */
export async function withRetry(fn) {
  try {
    return await fn()
  } catch (err) {
    if (!isConnectionError(err)) throw err
    resetDB()
    return fn()
  }
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
