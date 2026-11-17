import { h } from '../../lib/dom.js'
import { page, emptyState } from '../../components/page.js'
import { icons } from '../../components/icons.js'
import { toast } from '../../components/toast.js'

export function workoutView() {
  return page(
    'Тренування',
    emptyState({
      icon: icons.dumbbell,
      title: 'Немає активного тренування',
      text: 'Почни тренування й додавай вправи та підходи. (Етап 2)',
      action: h('button', { class: 'btn btn-primary', onclick: () => toast('Буде на етапі 2 💪') }, 'Почати тренування'),
    }),
    h('div', { class: 'card' }, h('h2', null, 'Історія'), h('p', { class: 'muted small' }, 'Тут з’являться збережені тренування.')),
  )
}
