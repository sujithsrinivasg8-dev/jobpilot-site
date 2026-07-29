import gsap from 'gsap'
import { REDUCED } from './scroll.js'

export function initCursor() {
  if (REDUCED || window.matchMedia('(hover: none)').matches) return
  const dot = document.getElementById('cursor')
  if (!dot) return
  document.body.classList.add('has-cursor')

  let tx = -100, ty = -100, x = -100, y = -100, shown = false
  window.addEventListener('pointermove', e => {
    tx = e.clientX; ty = e.clientY
    if (!shown) { shown = true; x = tx; y = ty; dot.classList.add('is-on') }
  }, { passive: true })

  gsap.ticker.add(() => {
    x += (tx - x) * 0.16
    y += (ty - y) * 0.16
    dot.style.transform = `translate(${x}px, ${y}px) translate(-50%, -50%)`
  })

  const HOVER = 'a, button, input, textarea, .frame'
  document.addEventListener('mouseover', e => {
    const t = e.target
    if (t.closest?.(HOVER)) dot.classList.add('is-hover')
    if (t.closest?.('.tone-paper')) dot.classList.add('is-ink')
  })
  document.addEventListener('mouseout', e => {
    if (e.target.closest?.(HOVER)) dot.classList.remove('is-hover')
    if (e.target.closest?.('.tone-paper')) dot.classList.remove('is-ink')
  })
}
