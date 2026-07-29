import gsap from 'gsap'
import { REDUCED, lockScroll, unlockScroll } from './scroll.js'

let isOpen = false
let tl = null

export function menuIsOpen() { return isOpen }

export function initMenu() {
  const btn = document.getElementById('menuBtn')
  const overlay = document.getElementById('menuOverlay')
  if (!btn || !overlay) return

  const links = overlay.querySelectorAll('.menu-nav > ul > li')
  const edges = overlay.querySelectorAll('.menu-edge')

  // mask each top-level item
  links.forEach(li => { li.style.overflow = 'hidden' })

  function build() {
    tl = gsap.timeline({ paused: true, defaults: { ease: 'veil' } })
    if (REDUCED) {
      tl.set(overlay, { visibility: 'visible' })
        .fromTo(overlay, { opacity: 0 }, { opacity: 1, duration: 0.3 })
      return
    }
    tl.set(overlay, { visibility: 'visible' })
      .fromTo(overlay, { clipPath: 'inset(0 0 100% 0)' }, { clipPath: 'inset(0% 0% 0% 0%)', duration: 0.8 })
      .fromTo(links.length ? [...links].map(li => li.children) : [],
        { yPercent: 110 },
        { yPercent: 0, duration: 0.9, ease: 'expo.out', stagger: 0.07 }, 0.25)
      .fromTo(edges, { opacity: 0 }, { opacity: 1, duration: 0.4, ease: 'silk' }, 0.55)
  }
  build()

  function open() {
    if (isOpen) return
    isOpen = true
    btn.classList.add('is-open')
    btn.setAttribute('aria-expanded', 'true')
    overlay.setAttribute('aria-hidden', 'false')
    lockScroll()
    tl.timeScale(1).play()
    firstLink()?.focus({ preventScroll: true })
  }

  function close(instant = false) {
    if (!isOpen) return
    isOpen = false
    btn.classList.remove('is-open')
    btn.setAttribute('aria-expanded', 'false')
    overlay.setAttribute('aria-hidden', 'true')
    unlockScroll()
    if (instant) { tl.progress(0).pause(); gsap.set(overlay, { visibility: 'hidden' }) }
    else tl.timeScale(1 / 0.65).reverse()
    btn.focus({ preventScroll: true })
  }

  const firstLink = () => overlay.querySelector('a')

  btn.addEventListener('click', () => (isOpen ? close() : open()))
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && isOpen) close()
    if (e.key === 'Tab' && isOpen) {
      const focusables = [btn, ...overlay.querySelectorAll('a, button')]
      const first = focusables[0], last = focusables[focusables.length - 1]
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus() }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus() }
    }
  })

  // close (instantly hide) when a nav link is chosen — transition takes over
  overlay.addEventListener('click', e => {
    if (e.target.closest('a')) close(true)
  })

  return { open, close }
}

export function markCurrentNav() {
  const here = location.pathname.replace(/\/index\.html$/, '/').replace(/\.html$/, '')
  document.querySelectorAll('.menu-overlay a, .foot-nav a, .foot-col a').forEach(a => {
    const path = new URL(a.href, location.origin).pathname
      .replace(/\/index\.html$/, '/').replace(/\.html$/, '')
    if (path === here) a.setAttribute('aria-current', 'page')
    else a.removeAttribute('aria-current')
  })
}
