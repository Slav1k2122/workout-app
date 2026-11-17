import { page, emptyState } from '../../components/page.js'
import { icons } from '../../components/icons.js'

export function exercisesView() {
  return page(
    'Вправи',
    emptyState({
      icon: icons.list,
      title: 'База вправ',
      text: 'Групи м’язів, ~70 вправ, техніка й власні вправи. (Етап 1)',
    }),
  )
}
