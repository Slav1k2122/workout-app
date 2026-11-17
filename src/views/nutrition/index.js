import { page, emptyState } from '../../components/page.js'
import { icons } from '../../components/icons.js'

export function nutritionView() {
  return page(
    'Їжа',
    emptyState({
      icon: icons.food,
      title: 'Щоденник калорій',
      text: 'Норма калорій, прийоми їжі та графік. (Етап 5)',
    }),
  )
}
