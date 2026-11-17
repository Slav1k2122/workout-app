import { h } from '../../lib/dom.js'
import { page, emptyState } from '../../components/page.js'
import { icons } from '../../components/icons.js'
import { toast } from '../../components/toast.js'
import { navigate, goBack } from '../../router.js'
import { getExercise, listExercises, saveCustomExercise } from '../../db/exercises.js'
import { GROUPS, MUSCLES, EQUIPMENT } from '../../data/muscles.js'
import { normalize } from '../../components/exercise-browser.js'
import { bodyMap } from '../../components/body-map.js'

const lines = (text) =>
  text
    .split('\n')
    .map((s) => s.trim())
    .filter(Boolean)

const field = (label, control, hint) =>
  h('label', { class: 'field' }, h('span', { class: 'field-label' }, label), control, hint && h('span', { class: 'field-hint' }, hint))

/**
 * Створення (без id) або редагування (з id) власної вправи.
 */
export async function exerciseFormView({ id } = {}) {
  const editing = id ? await getExercise(id) : null
  if (id && !editing?.custom) {
    return page(
      { title: 'Редагування', back: { label: 'Вправи', href: '/exercises' } },
      emptyState({ icon: icons.list, title: 'Цю вправу не можна редагувати', text: 'Редагувати можна лише власні вправи.' }),
    )
  }

  const data = {
    group: editing?.group ?? 'chest',
    equipment: editing?.equipment ?? 'barbell',
    primary: new Set(editing?.primary ?? []),
    secondary: new Set(editing?.secondary ?? []),
  }

  const nameInput = h('input', {
    type: 'text',
    class: 'input',
    placeholder: 'Напр. Жим гантелей на фітболі',
    value: editing?.name ?? '',
    maxlength: 80,
    autocapitalize: 'sentences',
  })

  const groupSelect = h(
    'select',
    { class: 'input', value: data.group, onchange: (e) => (data.group = e.target.value) },
    GROUPS.map((g) => h('option', { value: g.id }, g.name)),
  )

  const equipmentSelect = h(
    'select',
    { class: 'input', value: data.equipment, onchange: (e) => (data.equipment = e.target.value) },
    Object.entries(EQUIPMENT).map(([k, v]) => h('option', { value: k }, v)),
  )

  // Вибір м'язів: основні й допоміжні взаємовиключні
  const pickers = {}
  function musclePicker(kind, other) {
    const wrap = h(
      'div',
      { class: 'chips wrap' },
      Object.entries(MUSCLES).map(([key, name]) =>
        h(
          'button',
          {
            type: 'button',
            class: 'chip',
            dataset: { muscle: key },
            onclick: () => {
              if (data[kind].has(key)) data[kind].delete(key)
              else {
                data[kind].add(key)
                data[other].delete(key)
              }
              refreshPickers()
            },
          },
          name,
        ),
      ),
    )
    pickers[kind] = wrap
    return wrap
  }
  // Живе прев'ю на силуеті
  const preview = bodyMap()
  function refreshPickers() {
    for (const kind of ['primary', 'secondary']) {
      for (const chip of pickers[kind].children) {
        chip.classList.toggle(kind === 'primary' ? 'active' : 'active-soft', data[kind].has(chip.dataset.muscle))
      }
    }
    preview.update({ primary: [...data.primary], secondary: [...data.secondary] })
  }

  const stepsInput = h('textarea', { class: 'input', rows: 5, value: (editing?.steps ?? []).join('\n') })
  const mistakesInput = h('textarea', { class: 'input', rows: 3, value: (editing?.mistakes ?? []).join('\n') })

  async function save(e) {
    e.preventDefault()
    const name = nameInput.value.trim()
    if (!name) {
      toast('Вкажи назву вправи')
      nameInput.focus()
      return
    }
    const all = await listExercises()
    if (all.some((x) => x.id !== editing?.id && normalize(x.name) === normalize(name))) {
      toast('Вправа з такою назвою вже є')
      return
    }
    const saved = await saveCustomExercise({
      ...editing,
      name,
      group: data.group,
      equipment: data.equipment,
      primary: [...data.primary],
      secondary: [...data.secondary],
      steps: lines(stepsInput.value),
      mistakes: lines(mistakesInput.value),
    })
    if (editing) {
      toast('Зміни збережено')
      goBack('/exercises/' + encodeURIComponent(saved.id)) // повертаємось на картку (вона перечитає дані)
    } else {
      toast('Вправу додано')
      navigate('/exercises/' + encodeURIComponent(saved.id), { replace: true })
    }
  }

  const form = h(
    'form',
    { class: 'form', onsubmit: save },
    field('Назва', nameInput),
    h('div', { class: 'field-row' }, field('Група', groupSelect), field('Обладнання', equipmentSelect)),
    h('div', { class: 'card' }, preview),
    h('div', { class: 'field' }, h('span', { class: 'field-label' }, 'Основні м’язи'), musclePicker('primary', 'secondary')),
    h('div', { class: 'field' }, h('span', { class: 'field-label' }, 'Допоміжні м’язи'), musclePicker('secondary', 'primary')),
    field('Кроки техніки', stepsInput, 'Кожен крок з нового рядка (необов’язково)'),
    field('Типові помилки', mistakesInput, 'Кожна помилка з нового рядка (необов’язково)'),
    h('button', { type: 'submit', class: 'btn btn-primary btn-block' }, editing ? 'Зберегти зміни' : 'Додати вправу'),
  )
  refreshPickers()

  return page(
    {
      title: editing ? 'Редагування' : 'Нова вправа',
      back: editing
        ? { label: 'Назад', href: '/exercises/' + encodeURIComponent(editing.id) }
        : { label: 'Вправи', href: '/exercises' },
    },
    form,
  )
}
