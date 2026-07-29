import Lenis from 'lenis'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

export const REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches

export let lenis = null

const silkEase = t => 1 - Math.pow(1 - t, 4)

export function initScroll() {
  if (REDUCED) return null
  lenis = new Lenis({
    lerp: 0.09,
    wheelMultiplier: 1,
    touchMultiplier: 1.4,
    smoothWheel: true
  })
  lenis.on('scroll', ScrollTrigger.update)
  gsap.ticker.add(t => lenis.raf(t * 1000))
  gsap.ticker.lagSmoothing(0)
  return lenis
}

export function scrollToTarget(target, opts = {}) {
  if (lenis) lenis.scrollTo(target, { duration: 1.4, easing: silkEase, ...opts })
  else if (typeof target === 'number') window.scrollTo(0, target)
  else target?.scrollIntoView?.()
}

export function lockScroll() { lenis?.stop(); document.documentElement.classList.add('lenis-stopped') }
export function unlockScroll() { lenis?.start(); document.documentElement.classList.remove('lenis-stopped') }

/* header hide on scroll-down, reveal on scroll-up */
export function initHeader() {
  const head = document.querySelector('.site-head')
  if (!head || REDUCED) return
  let lastY = 0
  const onScroll = (y) => {
    if (y > lastY + 4 && y > 140) head.classList.add('is-hidden')
    else if (y < lastY - 4) head.classList.remove('is-hidden')
    lastY = y
  }
  if (lenis) lenis.on('scroll', ({ scroll }) => onScroll(scroll))
  else window.addEventListener('scroll', () => onScroll(window.scrollY), { passive: true })
}
