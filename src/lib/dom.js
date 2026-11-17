/**
 * Мінімальний хелпер для створення DOM-елементів.
 *
 *   h('button', { class: 'btn', onclick: fn }, 'Текст')
 *   h('div', { dataset: { id: 1 }, style: { color: 'red' } }, child1, [child2, child3])
 *
 * - атрибути `on*` з функцією стають слухачами подій
 * - `class` / `className` — клас, `html` — innerHTML (лише для довірених рядків, напр. іконок)
 * - діти: рядки, числа, вузли, масиви; null/undefined/false ігноруються
 */
export function h(tag, props, ...children) {
  const el = document.createElement(tag)
  if (props) {
    for (const [key, value] of Object.entries(props)) {
      if (value == null || value === false) continue
      if (key === 'class' || key === 'className') el.className = value
      else if (key === 'html') el.innerHTML = value
      else if (key === 'dataset') Object.assign(el.dataset, value)
      else if (key === 'style' && typeof value === 'object') Object.assign(el.style, value)
      else if (key.startsWith('on') && typeof value === 'function') el.addEventListener(key.slice(2).toLowerCase(), value)
      else if (key in el && typeof value !== 'string') el[key] = value
      else el.setAttribute(key, value === true ? '' : value)
    }
  }
  append(el, children)
  return el
}

function append(el, children) {
  for (const child of children) {
    if (child == null || child === false) continue
    if (Array.isArray(child)) append(el, child)
    else el.append(child instanceof Node ? child : String(child))
  }
}

/** Створює елемент з SVG-рядка (для іконок). */
export function svg(markup) {
  const tpl = document.createElement('template')
  tpl.innerHTML = markup.trim()
  return tpl.content.firstElementChild
}
