import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { splitLines, splitChars } from './split.js'
import { REDUCED } from './scroll.js'

const START = 'top 78%'

/* scroll-triggered reveal grammar — one language everywhere */
export function initReveals(scope) {
  if (REDUCED) {
    scope.querySelectorAll('[data-reveal]').forEach(el => {
      gsap.fromTo(el, { opacity: 0 }, {
        opacity: 1, duration: 0.3,
        scrollTrigger: { trigger: el, start: START, once: true }
      })
    })
    return
  }

  scope.querySelectorAll('[data-reveal="lines"]').forEach(el => {
    const lines = splitLines(el)
    gsap.fromTo(lines, { yPercent: 110, rotation: 0.001 }, {
      yPercent: 0, rotation: 0, duration: 1.1, ease: 'expo.out', stagger: 0.08,
      scrollTrigger: { trigger: el, start: START, once: true }
    })
  })

  scope.querySelectorAll('[data-reveal="chars"]').forEach(el => {
    const chars = splitChars(el)
    gsap.fromTo(chars, { yPercent: 110 }, {
      yPercent: 0, duration: 1.1, ease: 'expo.out', stagger: 0.035,
      scrollTrigger: { trigger: el, start: START, once: true }
    })
  })

  scope.querySelectorAll('[data-reveal="eyebrow"]').forEach(el => {
    gsap.fromTo(el, { opacity: 0, y: 10 }, {
      opacity: 1, y: 0, duration: 0.8, ease: 'silk',
      scrollTrigger: { trigger: el, start: START, once: true }
    })
  })

  scope.querySelectorAll('[data-reveal="fade"]').forEach(el => {
    gsap.fromTo(el, { opacity: 0, y: 24 }, {
      opacity: 1, y: 0, duration: 1, ease: 'silk',
      scrollTrigger: { trigger: el, start: START, once: true }
    })
  })

  scope.querySelectorAll('[data-reveal="hairline"]').forEach(el => {
    gsap.fromTo(el, { scaleX: 0 }, {
      scaleX: 1, duration: 1, ease: 'veil',
      scrollTrigger: { trigger: el, start: START, once: true }
    })
  })

  /* image frames: clip wipe + inner settle; alternate wipe direction */
  scope.querySelectorAll('.frame:not([data-fv])').forEach((el, i) => {
    const img = el.querySelector('img')
    const from = i % 3 === 1 ? 'inset(0 100% 0 0)' : 'inset(0 0 100% 0)'
    gsap.fromTo(el, { clipPath: from }, {
      clipPath: 'inset(0% 0% 0% 0%)', duration: 1.2, ease: 'veil',
      scrollTrigger: { trigger: el, start: START, once: true }
    })
    if (img) {
      gsap.fromTo(img, { scale: 1.24 }, {
        scale: 1.05, duration: 1.6, ease: 'silk',
        scrollTrigger: { trigger: el, start: START, once: true }
      })
    }
  })
}

/* depth: any [data-parallax-speed] drifts against the scroll */
export function initParallax(scope) {
  if (REDUCED) return
  scope.querySelectorAll('[data-parallax-speed]').forEach(el => {
    const speed = parseFloat(el.dataset.parallaxSpeed) || 1
    if (speed === 1) return
    const dist = () => (1 - speed) * window.innerHeight * 0.55
    gsap.fromTo(el, { y: () => -dist() }, {
      y: () => dist(), ease: 'none',
      scrollTrigger: {
        trigger: el.parentElement, start: 'top bottom', end: 'bottom top',
        scrub: true, invalidateOnRefresh: true
      }
    })
  })

  /* masked-image counter-translate — frame and picture at different rates */
  scope.querySelectorAll('.frame img').forEach(img => {
    gsap.fromTo(img, { yPercent: -7 }, {
      yPercent: 7, ease: 'none',
      scrollTrigger: {
        trigger: img.closest('.frame'), start: 'top bottom', end: 'bottom top',
        scrub: true, invalidateOnRefresh: true
      }
    })
  })
}

/* the pinned pillar deck — outgoing panel sinks and dims */
let deckMM = null
export function initDeck(scope) {
  if (deckMM) { deckMM.revert(); deckMM = null }
  const panels = [...scope.querySelectorAll('.deck .panel')]
  if (!panels.length || REDUCED) return
  const mm = gsap.matchMedia()
  deckMM = mm
  mm.add('(min-width: 769px)', () => {
    panels.forEach((panel, i) => {
      if (i === panels.length - 1) return
      gsap.to(panel, {
        scale: 0.94, opacity: 0.9, filter: 'brightness(0.85)', ease: 'none',
        scrollTrigger: {
          trigger: panels[i + 1], start: 'top bottom', end: 'top top', scrub: true
        }
      })
    })
  })
  return mm
}

/* first-view choreography — used by preloader (home) and transitions */
export function prepareFirstView(scope) {
  const fv = scope.querySelector('.fv')
  if (!fv || REDUCED) return
  const title = fv.querySelector('.fv-title')
  if (title) { splitChars(title); gsap.set(title.querySelectorAll('.ch-in'), { yPercent: 110 }) }
  const kicker = fv.querySelector('.fv-kicker')
  if (kicker) { splitLines(kicker); gsap.set(kicker.querySelectorAll('.ln-in'), { yPercent: 110 }) }
  const art = fv.querySelector('.fv-art')
  if (art) gsap.set(art, { opacity: 0, scale: 1.12 })
  fv.querySelectorAll('.fv-bar, .fv-seal, .fv-eyebrow').forEach(el => gsap.set(el, { opacity: 0 }))
  gsap.set('.site-head', { opacity: 0, y: -16 })
}

export function playFirstView(scope) {
  const fv = scope.querySelector('.fv')
  if (!fv) return gsap.timeline()
  if (REDUCED) {
    const tl = gsap.timeline()
    tl.fromTo(fv, { opacity: 0 }, { opacity: 1, duration: 0.3 })
    return tl
  }
  const tl = gsap.timeline({ defaults: { ease: 'silk' } })
  const art = fv.querySelector('.fv-art')
  const title = fv.querySelector('.fv-title')
  const kicker = fv.querySelector('.fv-kicker')
  if (art) tl.to(art, { opacity: 1, scale: 1, duration: 1.4 }, 0)
  if (title) tl.to(title.querySelectorAll('.ch-in'),
    { yPercent: 0, duration: 1.1, ease: 'expo.out', stagger: 0.035 }, 0.15)
  const eyebrow = fv.querySelector('.fv-eyebrow')
  if (eyebrow) tl.to(eyebrow, { opacity: 1, duration: 0.8 }, 0.1)
  if (kicker) tl.to(kicker.querySelectorAll('.ln-in'),
    { yPercent: 0, duration: 1, ease: 'expo.out', stagger: 0.08 }, 0.55)
  tl.to(fv.querySelectorAll('.fv-bar, .fv-seal'), { opacity: 1, duration: 0.9 }, 0.7)
  tl.to('.site-head', { opacity: 1, y: 0, duration: 0.6 }, 0.5)
  return tl
}

export function killPageTriggers() {
  ScrollTrigger.getAll().forEach(t => t.kill())
}
