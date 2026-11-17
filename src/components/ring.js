import { h } from '../lib/dom.js'

const NS = 'http://www.w3.org/2000/svg'
const s = (tag, attrs) => {
  const el = document.createElementNS(NS, tag)
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v)
  return el
}

/**
 * Кільце прогресу.
 *   ring({ value, max, center: Node, over: bool })
 * Якщо max не задано — порожнє кільце.
 */
export function ring({ value, max, center, size = 128, stroke = 12 }) {
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  const pct = max > 0 ? Math.min(value / max, 1) : 0
  const over = max > 0 && value > max

  const svg = s('svg', { viewBox: `0 0 ${size} ${size}`, width: size, height: size, class: 'ring-svg', 'aria-hidden': 'true' })
  svg.append(s('circle', { cx: size / 2, cy: size / 2, r, class: 'ring-track', 'stroke-width': stroke, fill: 'none' }))
  // при 0 не малюємо: круглий кінець лінії дав би точку
  if (pct > 0)
    svg.append(
    s('circle', {
      cx: size / 2,
      cy: size / 2,
      r,
      class: 'ring-value' + (over ? ' over' : ''),
      'stroke-width': stroke,
      fill: 'none',
      'stroke-linecap': 'round',
      'stroke-dasharray': `${c * pct} ${c}`,
      transform: `rotate(-90 ${size / 2} ${size / 2})`,
    }),
  )
  return h('div', { class: 'ring', style: { width: size + 'px', height: size + 'px' } }, svg, h('div', { class: 'ring-center' }, center))
}
