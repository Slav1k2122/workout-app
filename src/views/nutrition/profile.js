import { h } from '../../lib/dom.js'
import { page } from '../../components/page.js'
import { segmented } from '../../components/segmented.js'
import { toast } from '../../components/toast.js'
import { goBack } from '../../router.js'
import { getProfile, saveProfile } from '../../db/nutrition.js'
import { getLatestWeight } from '../../db/weight.js'
import { ACTIVITY, GOALS, calcTargets, isProfileValid } from '../../lib/nutrition.js'
import { parseNum, toInputNum, formatNum } from '../../lib/format.js'

/** Калькулятор добової норми (Mifflin-St Jeor) + збереження профілю. */
export async function nutritionProfileView() {
  const [saved, latestWeight] = await Promise.all([getProfile(), getLatestWeight()])
  const p = {
    sex: 'male',
    age: null,
    height: null,
    weight: latestWeight,
    activity: 'moderate',
    goal: 'maintain',
    customKcal: null,
    ...saved,
  }

  const num = (key, placeholder, mode = 'numeric') => {
    const input = h('input', {
      class: 'input',
      type: 'text',
      inputmode: mode,
      autocomplete: 'off',
      placeholder,
      value: toInputNum(p[key]),
      oninput: (e) => {
        p[key] = parseNum(e.target.value)
        update()
      },
    })
    return input
  }

  // Рівень активності — список варіантів
  const activityList = h('div', { class: 'option-list' })
  const renderActivity = () =>
    activityList.replaceChildren(
      ...ACTIVITY.map((a) =>
        h(
          'button',
          {
            type: 'button',
            class: 'option' + (p.activity === a.id ? ' active' : ''),
            onclick: () => {
              p.activity = a.id
              renderActivity()
              update()
            },
          },
          h('span', { class: 'option-title' }, a.name),
          h('span', { class: 'option-desc' }, a.desc),
        ),
      ),
    )
  renderActivity()

  // Своя норма
  const customInput = num('customKcal', 'напр. 2200')
  const customWrap = h('label', { class: 'field', style: { display: p.customKcal ? '' : 'none' } }, h('span', { class: 'field-label' }, 'Своя норма, ккал'), customInput)
  const customToggle = h('input', {
    type: 'checkbox',
    class: 'switch',
    checked: !!p.customKcal,
    onchange: (e) => {
      customWrap.style.display = e.target.checked ? '' : 'none'
      if (!e.target.checked) {
        p.customKcal = null
        customInput.value = ''
      }
      update()
    },
  })

  // Результат
  const result = h('div', { class: 'card result-card' })
  function update() {
    const t = calcTargets(p)
    if (!t) {
      result.replaceChildren(h('p', { class: 'muted small' }, 'Заповни стать, вік, зріст і вагу — норма порахується автоматично.'))
      return
    }
    const row = (label, value, strong) => h('div', { class: 'result-row' + (strong ? ' strong' : '') }, h('span', null, label), h('span', null, value))
    result.replaceChildren(
      row('Базовий обмін', `${formatNum(t.bmr)} ккал`),
      row('Витрати з активністю', `${formatNum(t.tdee)} ккал`),
      row(p.customKcal ? 'Твоя норма' : 'Норма для цілі', `${formatNum(t.kcal)} ккал`, true),
      h(
        'div',
        { class: 'result-macros' },
        h('div', null, h('b', null, `${t.protein} г`), h('span', null, 'білки')),
        h('div', null, h('b', null, `${t.fat} г`), h('span', null, 'жири')),
        h('div', null, h('b', null, `${t.carbs} г`), h('span', null, 'вуглеводи')),
      ),
      h('p', { class: 'chart-note', style: { marginTop: '10px' } }, 'Білки 1,8–2 г/кг, жири 0,9 г/кг, решта — вуглеводи. Це орієнтир, а не медична рекомендація.'),
    )
  }

  let busy = false // захист від подвійного натискання (подвійний goBack)
  async function save() {
    if (busy) return
    if (!isProfileValid(p)) {
      toast('Перевір вік (14–100), зріст (120–230) і вагу (30–300)')
      return
    }
    busy = true
    try {
      await saveProfile({
        sex: p.sex,
        age: Math.round(p.age),
        height: p.height,
        weight: p.weight,
        activity: p.activity,
        goal: p.goal,
        customKcal: p.customKcal > 0 ? Math.round(p.customKcal) : null,
      })
    } catch (err) {
      busy = false
      throw err
    }
    toast('Норму збережено')
    goBack('/nutrition')
  }

  update()

  return page(
    { title: 'Норма калорій', back: { label: 'Харчування', href: '/nutrition' } },
    h(
      'div',
      { class: 'form' },
      h(
        'div',
        { class: 'field' },
        h('span', { class: 'field-label' }, 'Стать'),
        segmented(
          [
            { id: 'male', label: 'Чоловік' },
            { id: 'female', label: 'Жінка' },
          ],
          p.sex,
          (id) => {
            p.sex = id
            update()
          },
        ),
      ),
      h(
        'div',
        { class: 'macro-inputs' },
        h('label', { class: 'field' }, h('span', { class: 'field-label' }, 'Вік'), num('age', 'років')),
        h('label', { class: 'field' }, h('span', { class: 'field-label' }, 'Зріст'), num('height', 'см')),
        h('label', { class: 'field' }, h('span', { class: 'field-label' }, 'Вага'), num('weight', 'кг', 'decimal')),
      ),
      h('div', { class: 'field' }, h('span', { class: 'field-label' }, 'Активність'), activityList),
      h(
        'div',
        { class: 'field' },
        h('span', { class: 'field-label' }, 'Ціль'),
        segmented(
          GOALS.map((g) => ({ id: g.id, label: g.name })),
          p.goal,
          (id) => {
            p.goal = id
            update()
          },
        ),
      ),
      h('label', { class: 'switch-row' }, h('span', null, 'Задати свою норму вручну'), customToggle),
      customWrap,
      result,
      h('button', { type: 'button', class: 'btn btn-primary btn-block btn-lg', onclick: save }, 'Зберегти'),
    ),
  )
}
