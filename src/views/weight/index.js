import { page, emptyState } from '../../components/page.js'
import { icons } from '../../components/icons.js'

export function weightView() {
  return page(
    'Вага',
    emptyState({
      icon: icons.scale,
      title: 'Вага тіла',
      text: 'Записи ваги, графік і зміна від початку. (Етап 6)',
    }),
  )
}
