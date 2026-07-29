/* the two live clocks — the site is never fully still */
const fmts = new Map()
const fmt = tz => {
  if (!fmts.has(tz)) {
    fmts.set(tz, new Intl.DateTimeFormat('en-GB', {
      hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false, timeZone: tz
    }))
  }
  return fmts.get(tz)
}

function tick() {
  const now = new Date()
  document.querySelectorAll('[data-clock]').forEach(el => {
    el.textContent = `${fmt(el.dataset.tz).format(now)} ${el.dataset.label}`
  })
}

let started = false
export function initClocks() {
  if (started) return
  started = true
  tick()
  setInterval(tick, 1000)
}
