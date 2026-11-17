import { h } from '../lib/dom.js'
import { MUSCLES } from '../data/muscles.js'
import { toast } from './toast.js'

/*
 * Стилізований силует тіла (спереду і ззаду) з підсвіткою м'язів.
 * Координати описують ЛІВУ половину фігури (x < 100); права половина — дзеркальна копія
 * (translate(200) scale(-1, 1)). Голова й шия малюються один раз по центру.
 * Ключі м'язів = id з data/muscles.js.
 */

const NS = 'http://www.w3.org/2000/svg'
const s = (tag, attrs) => {
  const el = document.createElementNS(NS, tag)
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v)
  return el
}

// ---------- Базовий силует (половина) ----------
const BASE = [
  // тулуб
  'M100 60 L88 60 C80 64 68 66 58 68 C48 70 42 78 42 90 L46 108 L60 114 C62 140 64 168 66 190 C64 202 60 212 60 224 C62 232 70 238 100 242 Z',
  // плече
  'M44 88 C38 98 36 112 36 128 L36 152 C36 160 42 164 50 164 C56 162 58 156 58 148 L60 116 C56 104 52 94 44 88 Z',
  // передпліччя
  'M36 158 C32 178 30 204 30 228 C32 234 44 236 46 230 C48 206 52 184 56 160 Z',
  // кисть
  'M31 232 C27 244 27 258 32 266 C36 270 42 268 44 262 C46 252 46 240 45 232 Z',
  // стегно
  'M60 222 C56 250 56 290 62 320 C66 330 90 332 94 322 C98 292 100 262 100 242 Z',
  // гомілка
  'M64 326 C60 352 62 380 68 402 L88 402 C92 380 94 352 92 326 Z',
  // стопа
  'M68 400 C64 410 64 418 70 420 L88 420 C92 416 90 408 88 400 Z',
]

// ---------- М'язи: спереду ----------
const FRONT = [
  ['traps', 'M89 50 C88 58 82 62 70 66 L90 64 Z'],
  ['side_delts', 'M58 68 C48 70 42 78 42 90 C42 100 44 106 48 110 C48 96 52 80 60 70 Z'],
  ['front_delts', 'M61 70 C53 80 49 96 49 110 L56 114 C60 100 64 84 71 69 Z'],
  ['chest', 'M99 72 L73 69 C65 80 59 96 58 112 C66 122 84 126 99 122 Z'],
  ['biceps', 'M50 116 C44 124 42 138 44 152 C46 158 52 158 56 152 C58 140 58 126 56 116 Z'],
  ['forearms', 'M38 164 C34 182 32 204 32 224 L44 226 C46 206 50 186 54 166 Z'],
  ['abs', 'M99 127 L85 127 C83 152 83 182 87 206 C91 213 96 216 99 216 Z'],
  ['obliques', 'M81 128 C72 132 66 140 64 150 C64 170 66 188 70 200 C76 206 82 208 85 206 C82 180 80 154 81 128 Z'],
  ['quads', 'M64 230 C60 256 60 288 66 316 C72 324 84 324 90 316 C92 290 92 262 90 244 C82 240 72 236 64 230 Z'],
  ['adductors', 'M92 246 L99 246 L98 300 C96 288 94 268 92 246 Z'],
  ['calves', 'M66 340 C64 356 66 372 70 386 L74 386 C72 370 72 354 70 336 Z'],
  ['calves', 'M90 340 C92 356 90 372 86 386 L83 386 C85 370 86 354 86 338 Z'],
]

// Лінії-розділювачі «кубиків» преса (декоративні)
const FRONT_LINES = ['M85 148 L99 148', 'M85 168 L99 168', 'M86 188 L99 188']

// ---------- М'язи: ззаду ----------
const BACK = [
  ['upper_back', 'M72 72 C80 82 88 96 92 108 L84 126 C76 120 66 112 60 104 C60 92 64 80 72 72 Z'],
  ['traps', 'M99 50 L89 50 C88 58 82 62 70 66 C78 72 88 84 94 104 L99 128 Z'],
  ['side_delts', 'M58 68 C48 70 42 78 42 90 C42 100 44 106 48 110 C48 96 52 80 60 70 Z'],
  ['rear_delts', 'M61 70 C53 80 49 96 49 110 L57 112 C59 98 63 84 70 70 Z'],
  ['lats', 'M60 108 C66 116 78 124 86 128 L93 136 C91 160 86 180 76 194 C70 190 66 176 64 160 C62 140 60 122 60 108 Z'],
  ['lower_back', 'M99 132 L95 137 C93 160 89 180 85 200 C90 206 96 208 99 208 Z'],
  ['triceps', 'M50 112 C44 122 40 136 40 150 C42 158 50 160 56 154 C58 140 58 124 56 114 Z'],
  ['forearms', 'M38 164 C34 182 32 204 32 224 L44 226 C46 206 50 186 54 166 Z'],
  ['glutes', 'M62 214 C60 228 62 244 70 254 C80 262 94 262 99 256 L99 214 C88 210 74 210 62 214 Z'],
  ['hamstrings', 'M64 260 C60 282 62 304 68 320 C74 326 86 326 91 318 C93 300 95 282 95 264 C86 268 74 266 64 260 Z'],
  ['adductors', 'M96 264 L99 264 L99 300 C97 290 96 276 96 264 Z'],
  ['calves', 'M66 334 C62 350 64 368 70 380 C76 386 86 386 90 378 C94 364 94 348 90 334 C82 330 72 330 66 334 Z'],
]

function figure(muscles, lines, primary, secondary, label) {
  const svg = s('svg', { viewBox: '22 8 156 416', class: 'body-figure', role: 'img', 'aria-label': label })

  const half = s('g', {})
  for (const d of BASE) half.append(s('path', { d, class: 'bm-base' }))
  for (const [id, d] of muscles) {
    const state = primary.has(id) ? ' is-primary' : secondary.has(id) ? ' is-secondary' : ''
    const p = s('path', { d, class: 'bm-muscle' + state, 'data-muscle': id })
    const title = s('title', {})
    title.textContent = MUSCLES[id]
    p.append(title)
    half.append(p)
  }
  for (const d of lines) half.append(s('path', { d, class: 'bm-line' }))

  const mirror = half.cloneNode(true)
  mirror.setAttribute('transform', 'translate(200 0) scale(-1 1)')

  svg.append(
    half,
    mirror,
    s('rect', { x: 89, y: 44, width: 22, height: 20, rx: 6, class: 'bm-base' }),
    s('circle', { cx: 100, cy: 29, r: 19, class: 'bm-base' }),
  )
  return svg
}

/**
 * Силует спереду і ззаду.
 *   bodyMap({ primary: ['chest'], secondary: ['triceps'] })
 * Повертає елемент з методом update({ primary, secondary }) — для живого прев'ю у формі.
 * Тап по м'язу показує його назву.
 */
export function bodyMap({ primary = [], secondary = [] } = {}) {
  const front = h('div', { class: 'body-view' })
  const back = h('div', { class: 'body-view' })

  const root = h(
    'div',
    {
      class: 'body-map',
      onclick: (e) => {
        const id = e.target.closest?.('[data-muscle]')?.dataset.muscle
        if (id) toast(MUSCLES[id])
      },
    },
    h('div', { class: 'body-views' }, front, back),
    h(
      'div',
      { class: 'body-legend' },
      h('span', null, h('i', { class: 'swatch is-primary' }), 'Основні'),
      h('span', null, h('i', { class: 'swatch is-secondary' }), 'Допоміжні'),
    ),
  )

  root.update = ({ primary = [], secondary = [] }) => {
    const p = new Set(primary)
    const sec = new Set(secondary)
    front.replaceChildren(figure(FRONT, FRONT_LINES, p, sec, 'Вигляд спереду'), h('span', { class: 'body-caption' }, 'Спереду'))
    back.replaceChildren(figure(BACK, [], p, sec, 'Вигляд ззаду'), h('span', { class: 'body-caption' }, 'Ззаду'))
  }
  root.update({ primary, secondary })
  return root
}
