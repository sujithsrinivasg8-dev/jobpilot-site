/* Procedural monochrome artwork — every image on the site is synthesized
   at runtime from the two palette colors. No external assets. */

const INK = [10, 8, 1]
const PAPER = [217, 215, 212]

// seeded PRNG so the art is identical on every visit
function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const mix = (t) => {
  const r = Math.round(INK[0] + (PAPER[0] - INK[0]) * t)
  const g = Math.round(INK[1] + (PAPER[1] - INK[1]) * t)
  const b = Math.round(INK[2] + (PAPER[2] - INK[2]) * t)
  return [r, g, b]
}
const rgba = (t, a) => { const [r, g, b] = mix(t); return `rgba(${r},${g},${b},${a})` }

function canvasOf(w, h) {
  const c = document.createElement('canvas')
  c.width = w; c.height = h
  return [c, c.getContext('2d')]
}

/* soft blurred ellipse, drawn at x and wrapped copies for seamless tiling */
function fogBlob(ctx, w, x, y, rx, ry, tone, alpha, wrap = true) {
  const g = [x]
  if (wrap) { g.push(x - w, x + w) }
  for (const gx of g) {
    const grad = ctx.createRadialGradient(gx, y, 0, gx, y, Math.max(rx, ry))
    grad.addColorStop(0, rgba(tone, alpha))
    grad.addColorStop(1, rgba(tone, 0))
    ctx.fillStyle = grad
    ctx.save()
    ctx.translate(gx, y)
    ctx.scale(1, ry / rx)
    ctx.translate(-gx, -y)
    ctx.beginPath()
    ctx.arc(gx, y, rx, 0, Math.PI * 2)
    ctx.fill()
    ctx.restore()
  }
}

function speckle(ctx, w, h, rnd, n = 2600, alpha = 0.03) {
  for (let i = 0; i < n; i++) {
    ctx.fillStyle = rgba(rnd(), alpha * rnd())
    ctx.fillRect(rnd() * w, rnd() * h, 1, 1)
  }
}

/* one fir-tree silhouette */
function tree(ctx, x, baseY, h) {
  const w = h * 0.34
  ctx.beginPath()
  ctx.moveTo(x, baseY - h)
  ctx.lineTo(x + w * 0.20, baseY - h * 0.62)
  ctx.lineTo(x + w * 0.10, baseY - h * 0.62)
  ctx.lineTo(x + w * 0.34, baseY - h * 0.30)
  ctx.lineTo(x + w * 0.18, baseY - h * 0.30)
  ctx.lineTo(x + w * 0.48, baseY)
  ctx.lineTo(x - w * 0.48, baseY)
  ctx.lineTo(x - w * 0.18, baseY - h * 0.30)
  ctx.lineTo(x - w * 0.34, baseY - h * 0.30)
  ctx.lineTo(x - w * 0.10, baseY - h * 0.62)
  ctx.lineTo(x - w * 0.20, baseY - h * 0.62)
  ctx.closePath()
  ctx.fill()
}

function treeline(ctx, w, h, rnd, baseY, tone, maxH, blur) {
  ctx.save()
  if (blur) ctx.filter = `blur(${blur}px)`
  ctx.fillStyle = rgba(tone, 1)
  let x = -40
  while (x < w + 40) {
    const cluster = 0.5 + 0.5 * Math.sin(x * 0.004 + rnd() * 2)
    const th = maxH * (0.35 + 0.65 * rnd()) * (0.55 + 0.45 * cluster)
    const wob = (rnd() - 0.5) * 14
    tree(ctx, x, baseY + wob, th)
    x += 14 + rnd() * 30
  }
  ctx.fillRect(0, baseY, w, h - baseY)
  ctx.restore()
}

function ridgeline(ctx, w, h, rnd, baseY, amp, tone, blur) {
  ctx.save()
  if (blur) ctx.filter = `blur(${blur}px)`
  ctx.fillStyle = rgba(tone, 1)
  ctx.beginPath()
  ctx.moveTo(0, h)
  const p1 = rnd() * 10, p2 = rnd() * 10
  for (let x = 0; x <= w; x += 8) {
    const y = baseY
      + Math.sin(x * 0.004 + p1) * amp
      + Math.sin(x * 0.011 + p2) * amp * 0.4
      + Math.sin(x * 0.027 + p1 * 2) * amp * 0.12
    ctx.lineTo(x, y)
  }
  ctx.lineTo(w, h)
  ctx.closePath()
  ctx.fill()
  ctx.restore()
}

/* ── generators ────────────────────────────────────────────────── */

function makeMist(seed, w = 1500, hgt = 420) {
  /* pure radial gradients + wrapped copies → mathematically seamless tile */
  const [c, ctx] = canvasOf(w, hgt)
  const rnd = mulberry32(seed)
  for (let i = 0; i < 34; i++) {
    fogBlob(ctx, w, rnd() * w, hgt * (0.28 + rnd() * 0.44),
      120 + rnd() * 300, 30 + rnd() * 70, 0.82 + rnd() * 0.18, 0.05 + rnd() * 0.09)
  }
  for (let i = 0; i < 16; i++) {
    fogBlob(ctx, w, rnd() * w, hgt * (0.35 + rnd() * 0.3),
      70 + rnd() * 150, 16 + rnd() * 34, 0.9, 0.04 + rnd() * 0.05)
  }
  return c.toDataURL('image/png')
}

function makeHero(w = 1920, hgt = 1200) {
  const [c, ctx] = canvasOf(w, hgt)
  const rnd = mulberry32(77)
  // foggy sky gradient
  const sky = ctx.createLinearGradient(0, 0, 0, hgt)
  sky.addColorStop(0, rgba(0.44, 1))
  sky.addColorStop(0.45, rgba(0.34, 1))
  sky.addColorStop(0.72, rgba(0.22, 1))
  sky.addColorStop(1, rgba(0.08, 1))
  ctx.fillStyle = sky
  ctx.fillRect(0, 0, w, hgt)
  // a pale breach of light upper-left (the izanami glow)
  fogBlob(ctx, w, w * 0.16, hgt * 0.12, 560, 380, 0.62, 0.5, false)
  // ambient fog field
  for (let i = 0; i < 90; i++) {
    fogBlob(ctx, w, rnd() * w, hgt * (0.15 + rnd() * 0.6),
      120 + rnd() * 380, 40 + rnd() * 120, 0.3 + rnd() * 0.3, 0.04 + rnd() * 0.07, false)
  }
  // three treelines, far → near
  treeline(ctx, w, hgt, rnd, hgt * 0.62, 0.20, 120, 7)
  fogBlob(ctx, w, w * 0.5, hgt * 0.64, w * 0.6, 90, 0.34, 0.5, false)
  fogBlob(ctx, w, w * 0.2, hgt * 0.68, w * 0.4, 70, 0.36, 0.4, false)
  treeline(ctx, w, hgt, rnd, hgt * 0.76, 0.13, 190, 3)
  fogBlob(ctx, w, w * 0.72, hgt * 0.78, w * 0.5, 80, 0.30, 0.5, false)
  fogBlob(ctx, w, w * 0.3, hgt * 0.82, w * 0.45, 90, 0.28, 0.35, false)
  treeline(ctx, w, hgt, rnd, hgt * 0.92, 0.055, 280, 1)
  fogBlob(ctx, w, w * 0.5, hgt * 0.99, w * 0.7, 110, 0.2, 0.4, false)
  speckle(ctx, w, hgt, rnd, 3600, 0.05)
  return c.toDataURL('image/jpeg', 0.86)
}

function makeRidge(w = 1000, hgt = 1330) {
  const [c, ctx] = canvasOf(w, hgt)
  const rnd = mulberry32(21)
  const sky = ctx.createLinearGradient(0, 0, 0, hgt)
  sky.addColorStop(0, rgba(0.4, 1)); sky.addColorStop(1, rgba(0.1, 1))
  ctx.fillStyle = sky; ctx.fillRect(0, 0, w, hgt)
  fogBlob(ctx, w, w * 0.3, hgt * 0.18, 380, 260, 0.55, 0.5, false)
  ridgeline(ctx, w, hgt, rnd, hgt * 0.42, 60, 0.30, 5)
  fogBlob(ctx, w, w * 0.5, hgt * 0.47, w * 0.7, 90, 0.4, 0.55, false)
  ridgeline(ctx, w, hgt, rnd, hgt * 0.58, 80, 0.20, 2)
  fogBlob(ctx, w, w * 0.4, hgt * 0.64, w * 0.6, 100, 0.3, 0.5, false)
  ridgeline(ctx, w, hgt, rnd, hgt * 0.76, 90, 0.10, 0)
  fogBlob(ctx, w, w * 0.5, hgt * 0.9, w * 0.7, 160, 0.2, 0.45, false)
  speckle(ctx, w, hgt, rnd, 2400, 0.05)
  return c.toDataURL('image/jpeg', 0.86)
}

function makeWideRidge(w = 1920, hgt = 830) {
  const [c, ctx] = canvasOf(w, hgt)
  const rnd = mulberry32(33)
  const sky = ctx.createLinearGradient(0, 0, 0, hgt)
  sky.addColorStop(0, rgba(0.38, 1)); sky.addColorStop(1, rgba(0.08, 1))
  ctx.fillStyle = sky; ctx.fillRect(0, 0, w, hgt)
  fogBlob(ctx, w, w * 0.7, hgt * 0.2, 600, 300, 0.55, 0.45, false)
  ridgeline(ctx, w, hgt, rnd, hgt * 0.48, 70, 0.26, 5)
  fogBlob(ctx, w, w * 0.5, hgt * 0.55, w * 0.7, 100, 0.36, 0.55, false)
  treeline(ctx, w, hgt, rnd, hgt * 0.72, 0.15, 150, 3)
  fogBlob(ctx, w, w * 0.3, hgt * 0.78, w * 0.6, 110, 0.28, 0.5, false)
  treeline(ctx, w, hgt, rnd, hgt * 0.92, 0.06, 220, 1)
  speckle(ctx, w, hgt, rnd, 3000, 0.05)
  return c.toDataURL('image/jpeg', 0.86)
}

function makeRipple(w = 1000, hgt = 1250) {
  const [c, ctx] = canvasOf(w, hgt)
  const rnd = mulberry32(55)
  const sky = ctx.createLinearGradient(0, 0, 0, hgt)
  sky.addColorStop(0, rgba(0.16, 1)); sky.addColorStop(0.5, rgba(0.24, 1)); sky.addColorStop(1, rgba(0.07, 1))
  ctx.fillStyle = sky; ctx.fillRect(0, 0, w, hgt)
  fogBlob(ctx, w, w * 0.5, hgt * 0.3, 420, 300, 0.5, 0.35, false)
  // concentric water rings in perspective
  const cx = w * 0.5, cy = hgt * 0.62
  for (let i = 1; i <= 11; i++) {
    const r = i * i * 6.5 + i * 16
    ctx.strokeStyle = rgba(0.6, Math.max(0.02, 0.34 - i * 0.028))
    ctx.lineWidth = 1 + i * 0.28
    ctx.beginPath()
    ctx.ellipse(cx, cy, r, r * 0.32, 0, 0, Math.PI * 2)
    ctx.stroke()
  }
  fogBlob(ctx, w, cx, cy, 90, 34, 0.7, 0.5, false)
  fogBlob(ctx, w, w * 0.5, hgt * 0.95, w * 0.7, 140, 0.16, 0.5, false)
  speckle(ctx, w, hgt, rnd, 2200, 0.05)
  return c.toDataURL('image/jpeg', 0.86)
}

function makeStones(w = 1000, hgt = 1000) {
  const [c, ctx] = canvasOf(w, hgt)
  const rnd = mulberry32(91)
  const sky = ctx.createLinearGradient(0, 0, 0, hgt)
  sky.addColorStop(0, rgba(0.3, 1)); sky.addColorStop(1, rgba(0.12, 1))
  ctx.fillStyle = sky; ctx.fillRect(0, 0, w, hgt)
  // raked gravel arcs
  for (let i = 0; i < 26; i++) {
    ctx.strokeStyle = rgba(0.42, 0.1 + rnd() * 0.1)
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.ellipse(w * 0.52, hgt * 0.66, 120 + i * 26, (120 + i * 26) * 0.42, 0, 0, Math.PI * 2)
    ctx.stroke()
  }
  // stones
  const stones = [
    [0.46, 0.60, 120, 78, 0.06], [0.62, 0.66, 74, 50, 0.09], [0.36, 0.70, 52, 34, 0.08]
  ]
  for (const [sx, sy, rx, ry, tone] of stones) {
    ctx.fillStyle = rgba(tone, 1)
    ctx.beginPath()
    ctx.ellipse(w * sx, hgt * sy, rx, ry, (rnd() - 0.5) * 0.3, 0, Math.PI * 2)
    ctx.fill()
    // top light
    fogBlob(ctx, w, w * sx - rx * 0.2, hgt * sy - ry * 0.55, rx * 0.7, ry * 0.4, 0.4, 0.35, false)
  }
  fogBlob(ctx, w, w * 0.5, hgt * 0.16, 420, 240, 0.5, 0.4, false)
  fogBlob(ctx, w, w * 0.5, hgt * 0.97, w * 0.7, 120, 0.16, 0.45, false)
  speckle(ctx, w, hgt, rnd, 2200, 0.05)
  return c.toDataURL('image/jpeg', 0.86)
}

function makeThreads(w = 1000, hgt = 1330) {
  const [c, ctx] = canvasOf(w, hgt)
  const rnd = mulberry32(13)
  const sky = ctx.createLinearGradient(0, 0, 0, hgt)
  sky.addColorStop(0, rgba(0.34, 1)); sky.addColorStop(1, rgba(0.08, 1))
  ctx.fillStyle = sky; ctx.fillRect(0, 0, w, hgt)
  fogBlob(ctx, w, w * 0.7, hgt * 0.2, 420, 300, 0.52, 0.4, false)
  // falling silk threads
  for (let i = 0; i < 60; i++) {
    const x = rnd() * w
    const len = hgt * (0.2 + rnd() * 0.65)
    const y0 = rnd() * hgt * 0.3
    const grad = ctx.createLinearGradient(x, y0, x + 30, y0 + len)
    grad.addColorStop(0, rgba(0.6, 0))
    grad.addColorStop(0.5, rgba(0.6, 0.05 + rnd() * 0.2))
    grad.addColorStop(1, rgba(0.6, 0))
    ctx.strokeStyle = grad
    ctx.lineWidth = rnd() < 0.15 ? 1.6 : 0.8
    ctx.beginPath()
    ctx.moveTo(x, y0)
    ctx.quadraticCurveTo(x + 10 + rnd() * 20, y0 + len * 0.5, x + 24 + rnd() * 24, y0 + len)
    ctx.stroke()
  }
  fogBlob(ctx, w, w * 0.4, hgt * 0.9, w * 0.6, 160, 0.18, 0.5, false)
  speckle(ctx, w, hgt, rnd, 2200, 0.05)
  return c.toDataURL('image/jpeg', 0.86)
}

function makeGrain(size = 240) {
  const [c, ctx] = canvasOf(size, size)
  const img = ctx.createImageData(size, size)
  const rnd = mulberry32(5)
  for (let i = 0; i < img.data.length; i += 4) {
    const v = Math.floor(rnd() * 255)
    img.data[i] = img.data[i + 1] = img.data[i + 2] = v
    img.data[i + 3] = 255
  }
  ctx.putImageData(img, 0, 0)
  return c.toDataURL('image/png')
}

/* the anchor glyph — a brush-rough enso broken by a rising dart */
export const GLYPH_SVG = `
<svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
  <defs>
    <filter id="jp-rough" x="-20%" y="-20%" width="140%" height="140%">
      <feTurbulence type="fractalNoise" baseFrequency="0.12" numOctaves="2" seed="7" result="n"/>
      <feDisplacementMap in="SourceGraphic" in2="n" scale="3.5"/>
    </filter>
  </defs>
  <g filter="url(#jp-rough)" stroke="currentColor" stroke-linecap="round">
    <path d="M 76 26 A 35 35 0 1 0 83 55" stroke-width="4.5"/>
    <path d="M 36 63 L 66 38" stroke-width="2.6"/>
    <path d="M 66 38 L 55.5 40.5" stroke-width="2.2"/>
    <path d="M 66 38 L 63 48" stroke-width="2.2"/>
  </g>
</svg>`

/* ── cache & population ────────────────────────────────────────── */
const cache = new Map()
function get(kind) {
  if (cache.has(kind)) return cache.get(kind)
  let url
  switch (kind) {
    case 'mist1': url = makeMist(101); break
    case 'mist2': url = makeMist(202, 1500, 520); break
    case 'hero': url = makeHero(); break
    case 'ridge': url = makeRidge(); break
    case 'wide': url = makeWideRidge(); break
    case 'ripple': url = makeRipple(); break
    case 'stones': url = makeStones(); break
    case 'threads': url = makeThreads(); break
    default: url = makeRidge()
  }
  cache.set(kind, url)
  return url
}

export function initSurface() {
  document.documentElement.style.setProperty('--grain-url', `url("${makeGrain()}")`)
  // drifting band layers + any band inside menu/scrim
  document.querySelectorAll('.band-layer--1 img, .menu-band img, .scrim-band img')
    .forEach(img => { img.src = get('mist1') })
  document.querySelectorAll('.band-layer--2 img')
    .forEach(img => { img.src = get('mist2') })
  document.querySelectorAll('.brand-seal').forEach(el => { el.innerHTML = GLYPH_SVG })
}

export function populateArt(scope) {
  scope.querySelectorAll('img[data-art]').forEach(img => { img.src = get(img.dataset.art) })
  scope.querySelectorAll('.fv-seal').forEach(el => { el.innerHTML = GLYPH_SVG })
}
