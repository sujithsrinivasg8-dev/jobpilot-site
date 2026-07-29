import '../styles/main.css'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { CustomEase } from 'gsap/CustomEase'

import { initSurface, populateArt } from './art.js'
import { initScroll, initHeader, scrollToTarget, REDUCED } from './scroll.js'
import {
  initReveals, initParallax, initDeck,
  prepareFirstView, playFirstView, killPageTriggers
} from './reveal.js'
import { initFluid } from './fluid.js'
import { initMenu, markCurrentNav } from './menu.js'
import { initClocks } from './clock.js'
import { initCursor } from './cursor.js'
import { initTransitions } from './transition.js'
import { runPreloader } from './preloader.js'

gsap.registerPlugin(ScrollTrigger, CustomEase)
CustomEase.create('silk', '0.16, 1, 0.3, 1')
CustomEase.create('veil', '0.65, 0, 0.35, 1')

/* every text link becomes a roll link — the label lives twice in the DOM */
function enhanceRollLinks(scope) {
  scope.querySelectorAll('.roll').forEach(el => {
    if (el.querySelector('.roll-box')) return
    const label = el.textContent.trim()
    el.innerHTML =
      `<span class="roll-box"><span class="roll-a">${label}</span>` +
      `<span class="roll-b" aria-hidden="true">${label}</span></span>`
  })
}

function initTopLinks(scope) {
  scope.querySelectorAll('[data-top]').forEach(el =>
    el.addEventListener('click', () => scrollToTarget(0)))
}

function initContactForm(scope) {
  const form = scope.querySelector('.contact-form')
  if (!form) return
  form.querySelectorAll('input, textarea').forEach(input => {
    const sync = () => input.closest('.field')?.classList.toggle('has-value', !!input.value)
    input.addEventListener('input', sync); sync()
  })
  form.addEventListener('submit', e => {
    e.preventDefault()
    const note = form.querySelector('.form-note')
    if (note) note.textContent = 'received. we will answer within the day.'
    form.reset()
    form.querySelectorAll('.field').forEach(f => f.classList.remove('has-value'))
  })
}

/* everything scoped to <main> — runs on load and after every PJAX swap */
function initPage(main) {
  populateArt(main)
  enhanceRollLinks(main)
  prepareFirstView(main)
  initReveals(main)
  initParallax(main)
  initDeck(main)
  initTopLinks(main)
  initContactForm(main)
  markCurrentNav()
  ScrollTrigger.refresh()
}

/* ── boot ──────────────────────────────────────────────────────── */
initSurface()
initScroll()
initHeader()
initFluid()
initCursor()
initMenu()
initClocks()
enhanceRollLinks(document.querySelector('.menu-overlay') || document.body)

const main = document.querySelector('main')
initPage(main)

initTransitions(newMain => {
  killPageTriggers()
  initPage(newMain)
  const tl = playFirstView(newMain)
  tl.pause()
  return tl
})

runPreloader(() => { playFirstView(main) })
