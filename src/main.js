import './styles/tokens.css'
import './styles/base.css'
import './styles/components.css'

import { registerSW } from 'virtual:pwa-register'
import { h } from './lib/dom.js'
import { route, fallback, startRouter, navigate, refresh, confirmLeave } from './router.js'
import { createTabbar } from './components/tabbar.js'
import { requestPersistence, isConnectionError, resetDB } from './db/db.js'
import { page, emptyState } from './components/page.js'
import { icons } from './components/icons.js'
import { showError } from './components/toast.js'
import { destroyCharts } from './lib/charts.js'
import { getBackupStatus } from './lib/backup.js'

import { workoutView } from './views/workout/index.js'
import { exercisesView } from './views/exercises/index.js'
import { exerciseDetailView } from './views/exercises/detail.js'
import { exerciseFormView } from './views/exercises/form.js'
import { workoutDetailView } from './views/workout/detail.js'
import { workoutEditView } from './views/workout/edit.js'
import { getActiveWorkout } from './db/workouts.js'
import { nutritionView } from './views/nutrition/index.js'
import { nutritionProfileView } from './views/nutrition/profile.js'
import { weightView } from './views/weight/index.js'
import { moreView } from './views/more/index.js'

// ---------- Service worker (лише у production-збірці, у dev вимкнено) ----------
const updateSW = registerSW({
  immediate: true,
  onNeedRefresh() {
    showUpdateBanner(() => updateSW(true))
  },
  onRegisteredSW(_url, registration) {
    // iOS рідко сам перевіряє оновлення — перевіряємо, коли застосунок повертається на екран
    if (!registration) return
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') registration.update().catch(() => {})
    })
  },
})

function showUpdateBanner(onUpdate) {
  if (document.querySelector('.update-banner')) return
  const banner = h(
    'div',
    { class: 'update-banner', role: 'status' },
    h('span', null, 'Доступна нова версія'),
    h(
      'button',
      {
        type: 'button',
        class: 'btn btn-primary',
        onclick: () => {
          if (!confirmLeave()) return
          banner.querySelector('button').textContent = 'Оновлюю…'
          onUpdate()
        },
      },
      'Оновити',
    ),
  )
  document.body.append(banner)
}
requestPersistence()

// ---------- Неперехоплені помилки (збій запису в IndexedDB тощо) — показуємо, а не мовчимо ----------
window.addEventListener('unhandledrejection', (e) => {
  const err = e.reason
  if (isConnectionError(err)) {
    resetDB() // наступна дія відкриє нове з'єднання
    showError(err, 'Зв’язок зі сховищем втрачено, спробуй ще раз')
  } else showError(err)
})

function errorView(err) {
  return page(
    { title: 'Помилка' },
    emptyState({
      icon: icons.dumbbell,
      title: 'Не вдалося відкрити екран',
      text: String(err?.message || err?.name || err),
      action: h(
        'button',
        {
          type: 'button',
          class: 'btn btn-primary',
          onclick: () => {
            if (isConnectionError(err)) resetDB()
            refresh()
          },
        },
        'Спробувати ще',
      ),
    }),
  )
}

// ---------- Каркас ----------
const view = h('main', { class: 'view', id: 'view' })
const tabbar = createTabbar()
document.getElementById('app').append(view, tabbar)

// ---------- Маршрути (порядок важливий: конкретні шляхи перед :id) ----------
route('/workout', workoutView)
route('/workout/:id/edit', workoutEditView)
route('/workout/:id', workoutDetailView)
route('/exercises', exercisesView)
route('/exercises/new', () => exerciseFormView())
route('/exercises/:id/edit', exerciseFormView)
route('/exercises/:id', exerciseDetailView)
route('/nutrition', nutritionView)
route('/nutrition/profile', nutritionProfileView)
route('/weight', weightView)
route('/more', moreView)
fallback(() => {
  navigate('/workout', { replace: true })
  return null
})

// ---------- Рендер із відновленням прокрутки при поверненні назад ----------
const scrollPositions = new Map()
let currentPath = null

startRouter((node, { path, isBack, keepScroll }) => {
  const prevY = window.scrollY
  if (currentPath) scrollPositions.set(currentPath, window.scrollY)
  currentPath = path
  destroyCharts()
  view.replaceChildren(node)
  tabbar.setActive(path)
  window.scrollTo(0, keepScroll ? prevY : isBack ? (scrollPositions.get(path) ?? 0) : 0)
  getActiveWorkout().then((active) => tabbar.setDot('/workout', !!active)).catch(() => {})
  getBackupStatus().then((s) => tabbar.setDot('/more', s.needsBackup)).catch(() => {})
}, { renderError: errorView })
