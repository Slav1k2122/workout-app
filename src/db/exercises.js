import { getDB } from './db.js'
import { uid } from '../lib/uid.js'
import builtin from '../data/exercises.json'

const builtinMap = new Map(builtin.map((e) => [e.id, e]))

export const isBuiltin = (id) => builtinMap.has(id)

/** Усі вправи: вбудовані + власні, відсортовані за назвою. */
export async function listExercises() {
  const custom = await (await getDB()).getAll('exercises')
  return [...builtin, ...custom].sort((a, b) => a.name.localeCompare(b.name, 'uk'))
}

export async function getExercise(id) {
  return builtinMap.get(id) ?? (await getDB()).get('exercises', id)
}

/** Створює або оновлює власну вправу. Повертає збережений запис. */
export async function saveCustomExercise(data) {
  const now = Date.now()
  const record = {
    id: data.id ?? 'custom-' + uid(),
    name: data.name.trim(),
    group: data.group,
    primary: data.primary ?? [],
    secondary: data.secondary ?? [],
    equipment: data.equipment,
    steps: data.steps ?? [],
    mistakes: data.mistakes ?? [],
    custom: true,
    createdAt: data.createdAt ?? now,
    updatedAt: now,
  }
  if (isBuiltin(record.id)) throw new Error('Вбудовану вправу змінювати не можна')
  await (await getDB()).put('exercises', record)
  return record
}

// Тренування зберігають знімок назви, тож історія не ламається після видалення вправи
export async function deleteCustomExercise(id) {
  if (isBuiltin(id)) return
  await (await getDB()).delete('exercises', id)
}
