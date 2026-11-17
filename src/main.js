import './styles/tokens.css'
import './styles/base.css'
import './styles/components.css'

import { registerSW } from 'virtual:pwa-register'
import { h } from './lib/dom.js'
import { route, fallback, startRouter, navigate } from './router.js'
import { createTabbar } from './components/tabbar.js'

import { workoutView } from './views/workout/index.js'
import { exercisesView } from './views/exercises/index.js'
import { nutritionView } from './views/nutrition/index.js'
import { weightView } from './views/weight/index.js'
import { moreView } from './views/more/index.js'

// ---------- Service worker (лише у production-збірці, у dev вимкнено) ----------
registerSW({ immediate: true })

// ---------- Каркас ----------
const view = h('main', { class: 'view', id: 'view' })
const tabbar = createTabbar()
document.getElementById('app').append(view, tabbar)

// ---------- Маршрути ----------
route('/workout', workoutView)
route('/exercises', exercisesView)
route('/nutrition', nutritionView)
route('/weight', weightView)
route('/more', moreView)
fallback(() => {
  navigate('/workout', { replace: true })
  return document.createComment('redirect')
})

startRouter((node, path) => {
  view.replaceChildren(node)
  tabbar.setActive(path)
  window.scrollTo(0, 0)
})
