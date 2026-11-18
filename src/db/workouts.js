import { getDB, withRetry } from './db.js'
import { uid } from '../lib/uid.js'
import { toISODate } from '../lib/format.js'

const ACTIVE_KEY = 'activeWorkout'

/*
 * Структура тренування:
 * {
 *   id, date: 'YYYY-MM-DD', startedAt, finishedAt, note,
 *   exercises: [{ exerciseId, name, sets: [{ reps, weight }] }],   // name — знімок назви
 *   exerciseIds: [...]                                              // для індексу multiEntry
 * }
 * Чернетка активного тренування лежить у meta['activeWorkout'];
 * у чернетці reps/weight можуть бути null (ще не введено).
 */

// ---------- Активне тренування (чернетка) ----------

export async function getActiveWorkout() {
  return (await (await getDB()).get('meta', ACTIVE_KEY)) ?? null
}

/** Зберегти чернетку; при втраті з'єднання з базою (iOS) — перевідкрити й повторити. */
export async function saveActiveWorkout(workout) {
  await withRetry(async () => (await getDB()).put('meta', workout, ACTIVE_KEY))
}

export async function startWorkout() {
  const now = Date.now()
  const workout = { id: uid(), date: toISODate(new Date(now)), startedAt: now, note: '', exercises: [] }
  await saveActiveWorkout(workout)
  return workout
}

export async function discardActiveWorkout() {
  await (await getDB()).delete('meta', ACTIVE_KEY)
}

/** Чи є в чернетці хоч один заповнений підхід. */
export const hasFilledSets = (workout) => workout.exercises.some((e) => e.sets.some((s) => s.reps > 0))

/** Прибирає порожні підходи/вправи й оновлює exerciseIds. */
export function cleanWorkout(workout) {
  const exercises = workout.exercises
    .map((e) => ({
      exerciseId: e.exerciseId,
      name: e.name,
      sets: e.sets.filter((s) => s.reps > 0).map((s) => ({ reps: s.reps, weight: s.weight || 0 })),
    }))
    .filter((e) => e.sets.length)
  return {
    ...workout,
    note: (workout.note ?? '').trim(),
    exercises,
    exerciseIds: [...new Set(exercises.map((e) => e.exerciseId))],
  }
}

/**
 * Зберігає чернетку як завершене тренування. Повертає збережений запис (або null, якщо чернетки немає).
 * current — актуальна чернетка з пам'яті (надійніше, якщо останні автозбереження не вдалися).
 */
export async function finishActiveWorkout(current) {
  return withRetry(async () => {
    const db = await getDB()
    const active = current ?? (await db.get('meta', ACTIVE_KEY))
    if (!active) return null
    const workout = cleanWorkout({ ...active, finishedAt: Date.now() })
    const tx = db.transaction(['workouts', 'meta'], 'readwrite')
    await Promise.all([tx.objectStore('workouts').put(workout), tx.objectStore('meta').delete(ACTIVE_KEY), tx.done])
    return workout
  })
}

// ---------- Збережені тренування ----------

/** Усі тренування, найновіші першими. */
export async function listWorkouts() {
  const all = await (await getDB()).getAll('workouts')
  return all.sort((a, b) => b.startedAt - a.startedAt)
}

export async function getWorkout(id) {
  return (await getDB()).get('workouts', id)
}

export async function saveWorkout(workout) {
  const clean = cleanWorkout(workout)
  await (await getDB()).put('workouts', clean)
  return clean
}

export async function deleteWorkout(id) {
  await (await getDB()).delete('workouts', id)
}

/** Усі тренування з цією вправою, найновіші першими. */
export async function workoutsWithExercise(exerciseId) {
  const list = await (await getDB()).getAllFromIndex('workouts', 'exerciseIds', exerciseId)
  return list.sort((a, b) => b.startedAt - a.startedAt)
}

/**
 * Зведення по виконаних вправах: Map(exerciseId → { lastTs, date, sets, count }),
 * де date/sets — з останнього тренування.
 */
export async function exerciseHistoryIndex() {
  const map = new Map()
  for (const w of await listWorkouts()) {
    // listWorkouts — від нових до старих, тож перший запис = останній раз
    for (const e of w.exercises) {
      const cur = map.get(e.exerciseId)
      if (cur) cur.count++
      else map.set(e.exerciseId, { lastTs: w.startedAt, date: w.date, sets: e.sets, count: 1 })
    }
  }
  return map
}

export async function countWorkoutsWithExercise(exerciseId) {
  return (await getDB()).countFromIndex('workouts', 'exerciseIds', exerciseId)
}

/**
 * Останній результат вправи: { date, sets } або null.
 * excludeId — не враховувати це тренування; before — лише тренування, що почались раніше.
 */
export async function getLastSession(exerciseId, { excludeId, before } = {}) {
  const list = await workoutsWithExercise(exerciseId)
  const w = list.find((x) => x.id !== excludeId && (before == null || x.startedAt < before))
  if (!w) return null
  const entry = w.exercises.find((e) => e.exerciseId === exerciseId)
  return { date: w.date, sets: entry.sets, workoutId: w.id }
}
