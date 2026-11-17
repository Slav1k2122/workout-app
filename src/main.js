import './styles/tokens.css'
import './styles/base.css'
import './styles/components.css'

import { registerSW } from 'virtual:pwa-register'
import { h } from './lib/dom.js'
import { route, fallback, startRouter, navigate } from './router.js'
import { createTabbar } from './components/tabbar.js'
import { requestPersistence } from './db/db.js'

import { workoutView } from './views/workout/index.js'
import { exercisesView } from './views/exercises/index.js'
import { exerciseDetailView } from './views/exercises/detail.js'
import { exerciseFormView } from './views/exercises/form.js'
import { nutritionView } from './views/nutrition/index.js'
import { weightView } from './views/weight/index.js'
import { moreView } from './views/more/index.js'

// ---------- Service worker (лише у production-збірці, у dev вимкнено) ----------
registerSW({ immediate: true })
requestPersistence()

// ---------- Каркас ----------
const view = h('main', { class: 'view', id: 'view' })
const tabbar = createTabbar()
document.getElementById('app').append(view, tabbar)

// ---------- Маршрути (порядок важливий: конкретні шляхи перед :id) ----------
route('/workout', workoutView)
route('/exercises', exercisesView)
route('/exercises/new', () => exerciseFormView())
route('/exercises/:id/edit', exerciseFormView)
route('/exercises/:id', exerciseDetailView)
route('/nutrition', nutritionView)
route('/weight', weightView)
route('/more', moreView)
fallback(() => {
  navigate('/workout', { replace: true })
  return null
})

// ---------- Рендер із відновленням прокрутки при поверненні назад ----------
const scrollPositions = new Map()
let currentPath = null

startRouter((node, { path, isBack }) => {
  if (currentPath) scrollPositions.set(currentPath, window.scrollY)
  currentPath = path
  view.replaceChildren(node)
  tabbar.setActive(path)
  window.scrollTo(0, isBack ? (scrollPositions.get(path) ?? 0) : 0)
})
