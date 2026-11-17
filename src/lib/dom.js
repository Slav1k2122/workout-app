/**
 * Мінімальний хелпер для створення DOM-елементів.
 *
 *   h('button', { class: 'btn', onclick: fn }, 'Текст')
 *   h('div', { dataset: { id: 1 }, style: { color: 'red' } }, child1, [child2, child3])
 *
 * - атрибути `on*` з функцією стають слухачами подій
 * - `class` / `className` — клас, `html` — innerHTML (лише для довірених рядків, напр. іконок)
 * - `value` встановлюється як властивість після додавання дітей (працює для select і textarea)
 * - діти: рядки, числа, вузли, масиви; null/undefined/false ігноруються
 */
export function h(tag, props, ...children) {
  const el = document.createElement(tag)
  let value
  if (props) {
    for (const [key, val] of Object.entries(props)) {
      if (val == null || val === false) continue
      if (key === 'value') value = val
      else if (key === 'class' || key === 'className') el.className = val
      else if (key === 'html') el.innerHTML = val
      else if (key === 'dataset') Object.assign(el.dataset, val)
      else if (key === 'style' && typeof val === 'object') Object.assign(el.style, val)
      else if (key.startsWith('on') && typeof val === 'function') el.addEventListener(key.slice(2).toLowerCase(), val)
      else if (key in el && typeof val !== 'string') el[key] = val
      else el.setAttribute(key, val === true ? '' : val)
    }
  }
  append(el, children)
  if (value != null) el.value = value
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
