/* PJAX page transitions — the swap happens under an ink veil */
import gsap from 'gsap'
import { REDUCED, lenis } from './scroll.js'
import { fluidBurst } from './fluid.js'

let busy = false
let onSwapCb = null

function samePage(url) {
  const a = new URL(url, location.href)
  return a.pathname === location.pathname
}

async function navigate(url, push = true) {
  if (busy) return
  busy = true
  document.documentElement.style.pointerEvents = 'none'

  const scrim = document.getElementById('scrim')
  const main = document.querySelector('main')

  const fetchP = fetch(url).then(r => r.text())

  // ── leave ──
  fluidBurst(0.5, 0.15, 1)
  const leave = gsap.timeline()
  if (REDUCED) {
    leave.set(scrim, { visibility: 'visible', clipPath: 'inset(0% 0% 0% 0%)', opacity: 0 })
      .to(scrim, { opacity: 1, duration: 0.3 })
  } else {
    leave.set(scrim, { visibility: 'visible', opacity: 1 })
      .fromTo(scrim, { clipPath: 'inset(100% 0 0 0)' }, { clipPath: 'inset(0% 0% 0% 0%)', duration: 0.9, ease: 'veil' }, 0)
      .to(main, { y: '-4vh', opacity: 0.6, duration: 0.6, ease: 'veil' }, 0)
  }

  let html
  try {
    [html] = await Promise.all([fetchP, leave.then?.() ?? new Promise(res => leave.eventCallback('onComplete', res))])
  } catch {
    location.href = url  // graceful fallback: hard navigation
    return
  }

  // ── swap under cover ──
  const doc = new DOMParser().parseFromString(html, 'text/html')
  const newMain = doc.querySelector('main')
  if (!newMain) { location.href = url; return }
  document.title = doc.title
  main.replaceWith(newMain)
  if (push) history.pushState({}, '', url)
  if (lenis) lenis.scrollTo(0, { immediate: true, force: true })
  window.scrollTo(0, 0)

  const enterTl = onSwapCb ? onSwapCb(newMain) : null

  // ── enter ──
  const enter = gsap.timeline()
  if (REDUCED) {
    enter.to(scrim, { opacity: 0, duration: 0.3 })
      .set(scrim, { visibility: 'hidden' })
  } else {
    enter.to(scrim, { clipPath: 'inset(0 0 100% 0)', duration: 1.0, ease: 'veil' }, 0)
      .set(scrim, { visibility: 'hidden', clipPath: 'inset(100% 0 0 0)' })
    fluidBurst(0.5, 0.85, 0.8)
  }
  if (enterTl) gsap.delayedCall(REDUCED ? 0.1 : 0.55, () => enterTl.play())

  enter.eventCallback('onComplete', () => {
    busy = false
    document.documentElement.style.pointerEvents = ''
  })
}

export function initTransitions(onSwap) {
  onSwapCb = onSwap

  document.addEventListener('click', e => {
    const a = e.target.closest('a[href]')
    if (!a) return
    if (a.target === '_blank' || a.hasAttribute('data-no-transition') || a.hasAttribute('download')) return
    const href = a.getAttribute('href')
    if (href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('tel:')) return
    const url = new URL(a.href, location.href)
    if (url.origin !== location.origin) return
    // the cockpit is a stateful app page — always a full load, both directions
    if (url.pathname.includes('cockpit') || location.pathname.includes('cockpit')) return
    e.preventDefault()
    if (samePage(url.href)) return
    navigate(url.href, true)
  })

  window.addEventListener('popstate', () => {
    if (location.pathname.includes('cockpit')) { location.reload(); return }
    navigate(location.href, false)
  })
}
