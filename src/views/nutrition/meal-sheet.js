import { h } from '../../lib/dom.js'
import { openSheet } from '../../components/sheet.js'
import { segmented } from '../../components/segmented.js'
import { toast } from '../../components/toast.js'
import { saveMeal, deleteMeal, recentMeals } from '../../db/nutrition.js'
import { MEAL_TYPES, defaultMealType, kcalFromMacros } from '../../lib/nutrition.js'
import { parseNum, toInputNum, formatNum } from '../../lib/format.js'

const pad = (n) => String(n).padStart(2, '0')
const nowHHMM = () => {
  const d = new Date()
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`
}

const numInput = (placeholder, value, label) =>
  h('input', {
    class: 'input num-input',
    type: 'text',
    inputmode: 'decimal',
    autocomplete: 'off',
    placeholder,
    'aria-label': label,
    value: toInputNum(value),
  })

/**
 * Нижня панель додавання/редагування прийому їжі.
 *   openMealSheet({ meal?, date, onSaved })
 */
export async function openMealSheet({ meal, date, onSaved }) {
  const editing = !!meal?.id
  const recent = editing ? [] : await recentMeals()
  let type = meal?.type ?? defaultMealType()

  const nameInput = h('input', {
    class: 'input',
    type: 'text',
    placeholder: 'Напр. Вівсянка з бананом',
    autocapitalize: 'sentences',
    maxlength: 80,
    value: meal?.name ?? '',
  })
  const kcalInput = numInput('ккал', meal?.kcal, 'Калорії')
  kcalInput.inputMode = 'numeric'
  const pInput = numInput('г', meal?.protein, 'Білки, г')
  const fInput = numInput('г', meal?.fat, 'Жири, г')
  const cInput = numInput('г', meal?.carbs, 'Вуглеводи, г')
  const timeInput = h('input', { class: 'input', type: 'time', value: meal?.time ?? nowHHMM() })

  // Якщо калорії не введено — підказуємо суму з БЖВ
  const hint = h('span', { class: 'field-hint' }, 'Якщо не знаєш калорій — заповни БЖВ, порахую сам')
  const updateHint = () => {
    const k = kcalFromMacros(parseNum(pInput.value), parseNum(fInput.value), parseNum(cInput.value))
    kcalInput.placeholder = k > 0 ? `≈ ${k}` : 'ккал'
  }
  for (const el of [pInput, fInput, cInput]) el.addEventListener('input', updateHint)
  updateHint()

  const typeSwitch = segmented(
    MEAL_TYPES.map((t) => ({ id: t.id, label: t.name })),
    type,
    (id) => (type = id),
    { size: 'sm' },
  )

  const fill = (m) => {
    nameInput.value = m.name
    kcalInput.value = toInputNum(m.kcal)
    pInput.value = toInputNum(m.protein)
    fInput.value = toInputNum(m.fat)
    cInput.value = toInputNum(m.carbs)
    updateHint()
  }

  const recentBlock =
    recent.length > 0 &&
    h(
      'div',
      { class: 'field' },
      h('span', { class: 'field-label' }, 'Нещодавні'),
      h(
        'div',
        { class: 'chips scroll-x' },
        recent.map((m) => h('button', { type: 'button', class: 'chip', onclick: () => fill(m) }, `${m.name} · ${formatNum(m.kcal)}`)),
      ),
    )

  let close
  async function save(e) {
    e.preventDefault()
    const name = nameInput.value.trim()
    const protein = parseNum(pInput.value)
    const fat = parseNum(fInput.value)
    const carbs = parseNum(cInput.value)
    let kcal = parseNum(kcalInput.value)
    if (kcal == null) {
      const k = kcalFromMacros(protein, fat, carbs)
      kcal = k > 0 ? k : null
    }
    if (!name) {
      toast('Вкажи назву')
      return
    }
    if (kcal == null) {
      toast('Вкажи калорії або БЖВ')
      return
    }
    await saveMeal({
      ...meal,
      date: meal?.date ?? date,
      time: timeInput.value || nowHHMM(),
      type,
      name,
      kcal: Math.round(kcal),
      protein,
      fat,
      carbs,
    })
    close()
    toast(editing ? 'Збережено' : 'Додано')
    onSaved?.()
  }

  async function remove() {
    if (!confirm(`Видалити «${meal.name}»?`)) return
    await deleteMeal(meal.id)
    close()
    toast('Видалено')
    onSaved?.()
  }

  const form = h(
    'form',
    { class: 'form meal-form', onsubmit: save },
    typeSwitch,
    recentBlock,
    h('label', { class: 'field' }, h('span', { class: 'field-label' }, 'Назва'), nameInput),
    h(
      'div',
      { class: 'field-row' },
      h('label', { class: 'field' }, h('span', { class: 'field-label' }, 'Калорії'), kcalInput),
      h('label', { class: 'field' }, h('span', { class: 'field-label' }, 'Час'), timeInput),
    ),
    h(
      'div',
      { class: 'field' },
      h(
        'div',
        { class: 'macro-inputs' },
        h('label', { class: 'field' }, h('span', { class: 'field-label' }, 'Білки'), pInput),
        h('label', { class: 'field' }, h('span', { class: 'field-label' }, 'Жири'), fInput),
        h('label', { class: 'field' }, h('span', { class: 'field-label' }, 'Вуглеводи'), cInput),
      ),
      hint,
    ),
    h('button', { type: 'submit', class: 'btn btn-primary btn-block btn-lg' }, editing ? 'Зберегти' : 'Додати'),
    editing && h('button', { type: 'button', class: 'btn btn-danger btn-block', onclick: remove }, 'Видалити'),
  )

  close = openSheet({ title: editing ? 'Редагувати' : 'Додати їжу', full: true, content: form, doneLabel: 'Скасувати' })
}
