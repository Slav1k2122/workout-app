// Розрахунок добової норми калорій і БЖВ (Mifflin-St Jeor).

export const ACTIVITY = [
  { id: 'sedentary', factor: 1.2, name: 'Мінімальна', desc: 'Сидяча робота, без тренувань' },
  { id: 'light', factor: 1.375, name: 'Низька', desc: '1–3 тренування на тиждень' },
  { id: 'moderate', factor: 1.55, name: 'Середня', desc: '3–5 тренувань на тиждень' },
  { id: 'high', factor: 1.725, name: 'Висока', desc: '6–7 тренувань на тиждень' },
  { id: 'extreme', factor: 1.9, name: 'Дуже висока', desc: 'Фізична робота + тренування' },
]

export const GOALS = [
  { id: 'lose', factor: 0.85, name: 'Схуднення', desc: '−15% від витрат' },
  { id: 'maintain', factor: 1, name: 'Підтримка', desc: 'Норма = витрати' },
  { id: 'gain', factor: 1.1, name: 'Набір', desc: '+10% до витрат' },
]

export const MEAL_TYPES = [
  { id: 'breakfast', name: 'Сніданок' },
  { id: 'lunch', name: 'Обід' },
  { id: 'dinner', name: 'Вечеря' },
  { id: 'snack', name: 'Перекус' },
]

/** Тип прийому їжі за поточною годиною. */
export function defaultMealType(date = new Date()) {
  const h = date.getHours()
  if (h >= 4 && h < 11) return 'breakfast'
  if (h >= 11 && h < 16) return 'lunch'
  if (h >= 16 && h < 22) return 'dinner'
  return 'snack'
}

/** Чи профіль заповнений коректно для розрахунку. */
export function isProfileValid(p) {
  return (
    p &&
    (p.sex === 'male' || p.sex === 'female') &&
    p.age >= 14 && p.age <= 100 &&
    p.height >= 120 && p.height <= 230 &&
    p.weight >= 30 && p.weight <= 300
  )
}

/** Базовий обмін (BMR). */
export function bmr({ sex, age, height, weight }) {
  return 10 * weight + 6.25 * height - 5 * age + (sex === 'male' ? 5 : -161)
}

const round10 = (n) => Math.round(n / 10) * 10

/**
 * Норма: { bmr, tdee, kcal, protein, fat, carbs } (ккал і грами).
 * Білки: 2 г/кг при схудненні, 1,8 г/кг інакше; жири: 0,9 г/кг; вуглеводи — решта.
 * profile.customKcal (якщо задано) замінює розраховану калорійність.
 */
export function calcTargets(profile) {
  if (!isProfileValid(profile)) return null
  const base = bmr(profile)
  const activity = ACTIVITY.find((a) => a.id === profile.activity) ?? ACTIVITY[2]
  const goal = GOALS.find((g) => g.id === profile.goal) ?? GOALS[1]
  const tdee = base * activity.factor
  const kcal = profile.customKcal > 0 ? Math.round(profile.customKcal) : round10(tdee * goal.factor)

  const protein = Math.round(profile.weight * (goal.id === 'lose' ? 2 : 1.8))
  const fat = Math.round(profile.weight * 0.9)
  const carbs = Math.max(0, Math.round((kcal - protein * 4 - fat * 9) / 4))
  return { bmr: Math.round(base), tdee: Math.round(tdee), kcal, protein, fat, carbs }
}

/** Калорії з БЖВ (4/9/4 ккал на грам). */
export const kcalFromMacros = (p, f, c) => Math.round((p || 0) * 4 + (f || 0) * 9 + (c || 0) * 4)

/** Сума за список прийомів їжі. */
export function sumMeals(meals) {
  return meals.reduce(
    (t, m) => ({
      kcal: t.kcal + (m.kcal || 0),
      protein: t.protein + (m.protein || 0),
      fat: t.fat + (m.fat || 0),
      carbs: t.carbs + (m.carbs || 0),
    }),
    { kcal: 0, protein: 0, fat: 0, carbs: 0 },
  )
}
