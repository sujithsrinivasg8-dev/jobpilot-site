import gsap from 'gsap'
import { REDUCED } from './scroll.js'

export function initCursor() {
  if (REDUCED || window.matchMedia('(hover: none)').matches) return
  const dot = document.getElementById('cursor')
  if (!dot) return
  // html-level class so the native arrow stays hidden even while
  // pointer-events are disabled (menu open, page transitions)
  document.documentElement.classList.add('has-cursor')

  let tx = -100, ty = -100, x = -100, y = -100, shown = false
  let scale = 1, targetScale = 1

  window.addEventListener('pointermove', e => {
    tx = e.clientX; ty = e.clientY
    if (!shown) { shown = true; x = tx; y = ty; dot.classList.add('is-on') }
  }, { passive: true })

  // position AND scale live in one transform — the CSS `scale` property would
  // multiply the translation and fling the dot off-screen on hover
  gsap.ticker.add(() => {
    x += (tx - x) * 0.22
    y += (ty - y) * 0.22
    scale += (targetScale - scale) * 0.18
    dot.style.transform =
      `translate(${x}px, ${y}px) translate(-50%, -50%) scale(${scale.toFixed(3)})`
  })

  const HOVER = 'a, button, input, textarea, .frame'
  document.addEventListener('mouseover', e => {
    if (e.target.closest?.(HOVER)) { targetScale = 2.6; dot.classList.add('is-hover') }
  })
  document.addEventListener('mouseout', e => {
    if (e.target.closest?.(HOVER)) { targetScale = 1; dot.classList.remove('is-hover') }
  })
}
