// Обгортка над Chart.js: лише потрібні модулі (tree-shaking) + оформлення під темну тему.
import {
  Chart,
  LineController,
  LineElement,
  PointElement,
  LinearScale,
  Tooltip,
  Filler,
  BarController,
  BarElement,
  CategoryScale,
} from 'chart.js'

Chart.register(LineController, LineElement, PointElement, LinearScale, Tooltip, Filler, BarController, BarElement, CategoryScale)

const css = (name) => getComputedStyle(document.documentElement).getPropertyValue(name).trim()

// Усі живі графіки — щоб знищувати їх при зміні екрана (інакше витікають ResizeObserver-и)
const charts = new Set()

export function destroyCharts() {
  for (const c of charts) c.destroy()
  charts.clear()
}

export function destroyChart(chart) {
  if (!chart) return
  chart.destroy()
  charts.delete(chart)
}

/** Вертикальна лінія-курсор біля активної точки. */
const crosshair = {
  id: 'crosshair',
  afterDatasetsDraw(chart) {
    const active = chart.tooltip?.getActiveElements?.()
    if (!active?.length) return
    const { x } = active[0].element
    const { top, bottom } = chart.chartArea
    const { ctx } = chart
    ctx.save()
    ctx.strokeStyle = css('--text-faint')
    ctx.lineWidth = 1
    ctx.setLineDash([3, 3])
    ctx.beginPath()
    ctx.moveTo(x, top)
    ctx.lineTo(x, bottom)
    ctx.stroke()
    ctx.restore()
  },
}

const DAY = 86400000

/**
 * Лінійний графік за часом (одна серія).
 * @param canvas
 * @param points       [{ x: timestamp, y: number, ...будь-які дані для підказки }]
 * @param formatX      (timestamp) => підпис осі X
 * @param formatY      (number) => підпис осі Y
 * @param tooltip      { title(raw), label(raw), footer?(raw) }
 */
export function lineChart(canvas, { points, formatX, formatY, tooltip }) {
  const accent = css('--accent')
  const surface = css('--surface')
  const faint = css('--text-faint')

  // одна точка: розширюємо вісь X, щоб точка була по центру
  const single = points.length === 1
  const xMin = single ? points[0].x - 3 * DAY : undefined
  const xMax = single ? points[0].x + 3 * DAY : undefined

  const chart = new Chart(canvas, {
    type: 'line',
    data: {
      datasets: [
        {
          data: points,
          borderColor: accent,
          borderWidth: 2,
          cubicInterpolationMode: 'monotone', // без «провалів» нижче реальних значень
          // густий ряд — без точок (точка з'являється при дотику), інакше вони зливаються
          pointRadius: points.length > 20 ? 0 : 4,
          pointHoverRadius: 6,
          pointHitRadius: 16,
          pointBackgroundColor: accent,
          pointBorderColor: surface,
          pointBorderWidth: 2,
          fill: 'start',
          backgroundColor: (ctx) => {
            const { chartArea, ctx: c } = ctx.chart
            if (!chartArea) return 'transparent'
            const g = c.createLinearGradient(0, chartArea.top, 0, chartArea.bottom)
            g.addColorStop(0, 'rgba(52, 211, 153, 0.22)')
            g.addColorStop(1, 'rgba(52, 211, 153, 0)')
            return g
          },
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: { duration: 250 },
      interaction: { mode: 'nearest', axis: 'x', intersect: false },
      events: ['mousemove', 'mouseout', 'click', 'touchstart', 'touchmove'],
      layout: { padding: { top: 8, right: 8, left: 0 } },
      scales: {
        x: {
          type: 'linear',
          min: xMin,
          max: xMax,
          grid: { display: false },
          border: { color: css('--border') },
          ticks: { color: faint, font: { size: 11 }, maxTicksLimit: 5, maxRotation: 0, callback: (v) => formatX(v) },
          // прибираємо дублікати підписів (кілька тіків в один день)
          afterBuildTicks: (scale) => {
            const seen = new Set()
            scale.ticks = scale.ticks.filter((t) => {
              const key = formatX(t.value)
              if (seen.has(key)) return false
              seen.add(key)
              return true
            })
          },
        },
        y: {
          grace: '10%',
          grid: { color: 'rgba(255, 255, 255, 0.06)' },
          border: { display: false },
          ticks: { color: faint, font: { size: 11 }, maxTicksLimit: 5, callback: (v) => formatY(v) },
        },
      },
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: css('--surface-2'),
          borderColor: css('--border'),
          borderWidth: 1,
          titleColor: css('--text-dim'),
          titleFont: { size: 12, weight: '500' },
          bodyColor: css('--text'),
          bodyFont: { size: 16, weight: '700' },
          footerColor: css('--text-dim'),
          footerFont: { size: 12, weight: '400' },
          padding: 10,
          displayColors: false,
          callbacks: {
            title: (items) => tooltip.title(items[0].raw),
            label: (item) => tooltip.label(item.raw),
            footer: (items) => tooltip.footer?.(items[0].raw) ?? '',
          },
        },
      },
    },
    plugins: [crosshair],
  })
  charts.add(chart)
  return chart
}

/** Горизонтальна пунктирна лінія цілі (напр. норма калорій) з підписом. */
const targetLine = {
  id: 'targetLine',
  afterDatasetsDraw(chart, _args, opts) {
    if (!opts?.value) return
    const y = chart.scales.y.getPixelForValue(opts.value)
    const { left, right } = chart.chartArea
    const { ctx } = chart
    ctx.save()
    ctx.strokeStyle = css('--text-dim')
    ctx.lineWidth = 1
    ctx.setLineDash([4, 4])
    ctx.beginPath()
    ctx.moveTo(left, y)
    ctx.lineTo(right, y)
    ctx.stroke()
    if (opts.label) {
      ctx.setLineDash([])
      ctx.font = '500 11px ' + css('--font')
      ctx.fillStyle = css('--text-dim')
      ctx.textAlign = 'right'
      ctx.textBaseline = 'bottom'
      ctx.fillText(opts.label, right, y - 3)
    }
    ctx.restore()
  },
}

/**
 * Стовпчиковий графік по категоріях (напр. дні).
 * @param labels     підписи осі X
 * @param values     значення (0 — без стовпчика)
 * @param target     значення лінії цілі (необов'язково) + targetLabel
 * @param highlight  індекс виділеного стовпчика
 * @param tooltip    { title(i), label(i), footer?(i) }
 * @param onClick    (index) => void
 */
export function barChart(canvas, { labels, values, target, targetLabel, highlight, formatY, tooltip, onClick }) {
  const accent = css('--accent')
  const faint = css('--text-faint')
  const chart = new Chart(canvas, {
    type: 'bar',
    data: {
      labels,
      datasets: [
        {
          data: values,
          backgroundColor: values.map((_, i) => (i === highlight ? accent : 'rgba(52, 211, 153, 0.5)')),
          hoverBackgroundColor: accent,
          borderRadius: 4,
          borderSkipped: 'start',
          maxBarThickness: 24,
          categoryPercentage: 0.82,
          barPercentage: 0.92,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: { duration: 250 },
      interaction: { mode: 'index', intersect: false },
      events: ['mousemove', 'mouseout', 'click', 'touchstart', 'touchmove'],
      onClick: (_e, els) => {
        if (els.length) onClick?.(els[0].index)
      },
      layout: { padding: { top: 14 } },
      scales: {
        x: {
          grid: { display: false },
          border: { color: css('--border') },
          ticks: { color: faint, font: { size: 11 }, maxRotation: 0, autoSkip: true, maxTicksLimit: 8 },
        },
        y: {
          beginAtZero: true,
          suggestedMax: target ? target * 1.15 : undefined,
          grid: { color: 'rgba(255, 255, 255, 0.06)' },
          border: { display: false },
          ticks: { color: faint, font: { size: 11 }, maxTicksLimit: 4, callback: (v) => formatY(v) },
        },
      },
      plugins: {
        legend: { display: false },
        targetLine: { value: target, label: targetLabel },
        tooltip: {
          backgroundColor: css('--surface-2'),
          borderColor: css('--border'),
          borderWidth: 1,
          titleColor: css('--text-dim'),
          titleFont: { size: 12, weight: '500' },
          bodyColor: css('--text'),
          bodyFont: { size: 16, weight: '700' },
          footerColor: css('--text-dim'),
          footerFont: { size: 12, weight: '400' },
          padding: 10,
          displayColors: false,
          callbacks: {
            title: (items) => tooltip.title(items[0].dataIndex),
            label: (item) => tooltip.label(item.dataIndex),
            footer: (items) => tooltip.footer?.(items[0].dataIndex) ?? '',
          },
        },
      },
    },
    plugins: [targetLine],
  })
  charts.add(chart)
  return chart
}

/** Викликає fn, щойно елемент з'явиться в DOM (графіку потрібні розміри контейнера). */
export function whenConnected(el, fn, tries = 120) {
  if (el.isConnected) fn()
  else if (tries > 0) requestAnimationFrame(() => whenConnected(el, fn, tries - 1))
}
