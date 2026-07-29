import gsap from 'gsap'
import { REDUCED } from './scroll.js'
import { splitChars } from './split.js'
import { fluidBurst } from './fluid.js'

const KEY = 'jp_seen'

export function runPreloader(onHeroEnter) {
  const pre = document.getElementById('preloader')
  if (!pre) { onHeroEnter(); return }

  const tag = pre.querySelector('.pre-tag')
  const countEl = document.getElementById('preCount')
  const seen = sessionStorage.getItem(KEY)
  sessionStorage.setItem(KEY, '1')

  if (REDUCED) {
    gsap.to(pre, {
      opacity: 0, duration: 0.6, onComplete() {
        pre.classList.add('is-done')
        onHeroEnter()
      }
    })
    return
  }

  const tl = gsap.timeline()

  if (seen) {
    // micro-loader for repeat visits: veil only, 0.9s
    if (tag) tag.style.opacity = 0
    if (countEl) countEl.parentElement.style.opacity = 0
    tl.to(pre, { clipPath: 'inset(0 0 100% 0)', duration: 0.9, ease: 'veil' }, 0.05)
      .add(() => { fluidBurst(0.5, 0.5, 1); onHeroEnter() }, 0.35)
      .set(pre, { visibility: 'hidden' })
      .add(() => pre.classList.add('is-done'))
    return
  }

  const chars = tag ? splitChars(tag) : []
  gsap.set(chars, { yPercent: 110 })
  const counter = { v: 0 }

  tl
    // 0.2 → 2.4 counter ticks 0 → 100
    .to(counter, {
      v: 100, duration: 2.2, ease: 'power2.inOut',
      onUpdate() { if (countEl) countEl.textContent = String(Math.round(counter.v)) }
    }, 0.2)
    // 0.5 → 1.6 tagline mask-rises per char
    .to(chars, { yPercent: 0, duration: 1.1, ease: 'expo.out', stagger: 0.03 }, 0.5)
    // 2.4 hold; counter fades
    .to(countEl?.parentElement || {}, { opacity: 0, duration: 0.3 }, 2.4)
    .to(chars, { yPercent: -110, duration: 0.7, ease: 'expo.in', stagger: 0.012 }, 2.45)
    // 2.6 → 3.5 the veil parts
    .to(pre, { clipPath: 'inset(0 0 100% 0)', duration: 0.9, ease: 'veil' }, 2.6)
    .add(() => fluidBurst(0.5, 0.5, 1.2), 2.7)
    // 3.0 hero enters while the wipe is still finishing — the overlap is the trick
    .add(() => onHeroEnter(), 3.0)
    .set(pre, { visibility: 'hidden' })
    .add(() => pre.classList.add('is-done'))
}
