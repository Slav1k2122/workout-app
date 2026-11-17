// Розрахунки для тренувань.

/** Об'єм: Σ повтори × вага. */
export const volume = (sets) => sets.reduce((sum, s) => sum + (s.reps || 0) * (s.weight || 0), 0)

/** Орієнтовний 1ПМ за формулою Епплі. Для 1 повтору — сама вага. */
export function e1rm(weight, reps) {
  if (!weight || !reps) return 0
  if (reps === 1) return weight
  return weight * (1 + reps / 30)
}

/** Максимальна вага серед підходів. */
export const maxWeight = (sets) => sets.reduce((m, s) => Math.max(m, s.weight || 0), 0)

/** Найкращий орієнтовний 1ПМ серед підходів. */
export const bestE1rm = (sets) => sets.reduce((m, s) => Math.max(m, e1rm(s.weight, s.reps)), 0)

/** Загальна кількість підходів у тренуванні. */
export const totalSets = (workout) => workout.exercises.reduce((n, e) => n + e.sets.length, 0)

/** Загальний об'єм тренування. */
export const workoutVolume = (workout) => workout.exercises.reduce((sum, e) => sum + volume(e.sets), 0)
