/* Cursor-driven stable-fluids ink simulation (monochrome dye).
   splat → advect → curl/vorticity → divergence → pressure → subtract → dye.
   WebGL2 + EXT_color_buffer_float; bails silently when unsupported. */

import { REDUCED } from './scroll.js'

const CFG = {
  SIM_RES: 128,
  DYE_RES: 512,
  VEL_DISS: 0.98,
  DYE_DISS: 0.955,
  CURL: 25,
  PRESSURE_ITERS: 20,
  RADIUS: 0.0022,
  FORCE: 5500,
  ALPHA_CEIL: 0.22,
  IDLE_MS: 4500
}

const INK = [10 / 255, 8 / 255, 1 / 255]
const PAPER = [217 / 255, 215 / 255, 212 / 255]

const VERT = `
precision highp float;
attribute vec2 aPosition;
varying vec2 vUv, vL, vR, vT, vB;
uniform vec2 texelSize;
void main () {
  vUv = aPosition * 0.5 + 0.5;
  vL = vUv - vec2(texelSize.x, 0.0);
  vR = vUv + vec2(texelSize.x, 0.0);
  vT = vUv + vec2(0.0, texelSize.y);
  vB = vUv - vec2(0.0, texelSize.y);
  gl_Position = vec4(aPosition, 0.0, 1.0);
}`

const FRAG = {
  splat: `
precision highp float;
varying vec2 vUv;
uniform sampler2D uTarget;
uniform float aspectRatio;
uniform vec3 color;
uniform vec2 point;
uniform float radius;
void main () {
  vec2 p = vUv - point;
  p.x *= aspectRatio;
  vec3 splat = exp(-dot(p, p) / radius) * color;
  vec3 base = texture2D(uTarget, vUv).xyz;
  gl_FragColor = vec4(base + splat, 1.0);
}`,
  advection: `
precision highp float;
varying vec2 vUv;
uniform sampler2D uVelocity;
uniform sampler2D uSource;
uniform vec2 texelSize;
uniform float dt;
uniform float dissipation;
void main () {
  vec2 coord = vUv - dt * texture2D(uVelocity, vUv).xy * texelSize;
  gl_FragColor = dissipation * texture2D(uSource, coord);
  gl_FragColor.a = 1.0;
}`,
  divergence: `
precision highp float;
varying vec2 vUv, vL, vR, vT, vB;
uniform sampler2D uVelocity;
void main () {
  float L = texture2D(uVelocity, vL).x;
  float R = texture2D(uVelocity, vR).x;
  float T = texture2D(uVelocity, vT).y;
  float B = texture2D(uVelocity, vB).y;
  vec2 C = texture2D(uVelocity, vUv).xy;
  if (vL.x < 0.0) { L = -C.x; }
  if (vR.x > 1.0) { R = -C.x; }
  if (vT.y > 1.0) { T = -C.y; }
  if (vB.y < 0.0) { B = -C.y; }
  gl_FragColor = vec4(0.5 * (R - L + T - B), 0.0, 0.0, 1.0);
}`,
  curl: `
precision highp float;
varying vec2 vUv, vL, vR, vT, vB;
uniform sampler2D uVelocity;
void main () {
  float L = texture2D(uVelocity, vL).y;
  float R = texture2D(uVelocity, vR).y;
  float T = texture2D(uVelocity, vT).x;
  float B = texture2D(uVelocity, vB).x;
  float vorticity = R - L - T + B;
  gl_FragColor = vec4(0.5 * vorticity, 0.0, 0.0, 1.0);
}`,
  vorticity: `
precision highp float;
varying vec2 vUv, vL, vR, vT, vB;
uniform sampler2D uVelocity;
uniform sampler2D uCurl;
uniform float curl;
uniform float dt;
void main () {
  float L = texture2D(uCurl, vL).x;
  float R = texture2D(uCurl, vR).x;
  float T = texture2D(uCurl, vT).x;
  float B = texture2D(uCurl, vB).x;
  float C = texture2D(uCurl, vUv).x;
  vec2 force = 0.5 * vec2(abs(T) - abs(B), abs(R) - abs(L));
  force /= length(force) + 0.0001;
  force *= curl * C;
  force.y *= -1.0;
  vec2 velocity = texture2D(uVelocity, vUv).xy;
  velocity += force * dt;
  velocity = min(max(velocity, -1000.0), 1000.0);
  gl_FragColor = vec4(velocity, 0.0, 1.0);
}`,
  pressure: `
precision highp float;
varying vec2 vUv, vL, vR, vT, vB;
uniform sampler2D uPressure;
uniform sampler2D uDivergence;
void main () {
  float L = texture2D(uPressure, vL).x;
  float R = texture2D(uPressure, vR).x;
  float T = texture2D(uPressure, vT).x;
  float B = texture2D(uPressure, vB).x;
  float divergence = texture2D(uDivergence, vUv).x;
  float pressure = (L + R + B + T - divergence) * 0.25;
  gl_FragColor = vec4(pressure, 0.0, 0.0, 1.0);
}`,
  gradient: `
precision highp float;
varying vec2 vUv, vL, vR, vT, vB;
uniform sampler2D uPressure;
uniform sampler2D uVelocity;
void main () {
  float L = texture2D(uPressure, vL).x;
  float R = texture2D(uPressure, vR).x;
  float T = texture2D(uPressure, vT).x;
  float B = texture2D(uPressure, vB).x;
  vec2 velocity = texture2D(uVelocity, vUv).xy;
  velocity.xy -= vec2(R - L, T - B);
  gl_FragColor = vec4(velocity, 0.0, 1.0);
}`,
  clear: `
precision highp float;
varying vec2 vUv;
uniform sampler2D uTexture;
uniform float value;
void main () {
  gl_FragColor = value * texture2D(uTexture, vUv);
}`,
  display: `
precision highp float;
varying vec2 vUv;
uniform sampler2D uTexture;
uniform vec3 uColor;
uniform float uCeil;
void main () {
  float d = texture2D(uTexture, vUv).r;
  float a = min(d * 0.5, uCeil);
  gl_FragColor = vec4(uColor, a);
}`
}

let api = { burst: () => {}, setTone: () => {} }

export function initFluid() {
  if (REDUCED) return api
  if (window.matchMedia('(hover: none)').matches) return api
  const canvas = document.getElementById('fluid')
  if (!canvas) return api
  const gl = canvas.getContext('webgl2', { alpha: true, depth: false, stencil: false, antialias: false, premultipliedAlpha: false })
  if (!gl || !gl.getExtension('EXT_color_buffer_float')) return api

  const dpr = Math.min(window.devicePixelRatio || 1, 1.5)
  function sizeCanvas() {
    canvas.width = Math.floor(innerWidth * dpr)
    canvas.height = Math.floor(innerHeight * dpr)
  }
  sizeCanvas()

  function compile(type, src) {
    const s = gl.createShader(type)
    gl.shaderSource(s, src); gl.compileShader(s)
    return s
  }
  const vert = compile(gl.VERTEX_SHADER, VERT)
  function program(fragSrc) {
    const p = gl.createProgram()
    gl.attachShader(p, vert)
    gl.attachShader(p, compile(gl.FRAGMENT_SHADER, fragSrc))
    gl.linkProgram(p)
    const uniforms = {}
    const n = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS)
    for (let i = 0; i < n; i++) {
      const name = gl.getActiveUniform(p, i).name
      uniforms[name] = gl.getUniformLocation(p, name)
    }
    return { p, u: uniforms }
  }
  const progs = {}
  for (const k of Object.keys(FRAG)) progs[k] = program(FRAG[k])

  const quad = gl.createBuffer()
  gl.bindBuffer(gl.ARRAY_BUFFER, quad)
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, -1, 1, 1, 1, 1, -1]), gl.STATIC_DRAW)
  const idx = gl.createBuffer()
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, idx)
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array([0, 1, 2, 0, 2, 3]), gl.STATIC_DRAW)
  gl.enableVertexAttribArray(0)
  gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0)

  function fbo(w, h) {
    const tex = gl.createTexture()
    gl.activeTexture(gl.TEXTURE0)
    gl.bindTexture(gl.TEXTURE_2D, tex)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA16F, w, h, 0, gl.RGBA, gl.HALF_FLOAT, null)
    const fb = gl.createFramebuffer()
    gl.bindFramebuffer(gl.FRAMEBUFFER, fb)
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0)
    gl.clearColor(0, 0, 0, 1); gl.clear(gl.COLOR_BUFFER_BIT)
    return { tex, fb, w, h, attach(unit) { gl.activeTexture(gl.TEXTURE0 + unit); gl.bindTexture(gl.TEXTURE_2D, this.tex); return unit } }
  }
  function doubleFbo(w, h) {
    let a = fbo(w, h), b = fbo(w, h)
    return {
      w, h,
      get read() { return a }, get write() { return b },
      swap() { const t = a; a = b; b = t }
    }
  }

  const simW = CFG.SIM_RES, simH = Math.round(CFG.SIM_RES * innerHeight / innerWidth) || CFG.SIM_RES
  const dyeW = CFG.DYE_RES, dyeH = Math.round(CFG.DYE_RES * innerHeight / innerWidth) || CFG.DYE_RES
  const velocity = doubleFbo(simW, simH)
  const dye = doubleFbo(dyeW, dyeH)
  const pressure = doubleFbo(simW, simH)
  const divergence = fbo(simW, simH)
  const curlFbo = fbo(simW, simH)

  function blit(target) {
    if (target) {
      gl.viewport(0, 0, target.w, target.h)
      gl.bindFramebuffer(gl.FRAMEBUFFER, target.fb)
    } else {
      gl.viewport(0, 0, canvas.width, canvas.height)
      gl.bindFramebuffer(gl.FRAMEBUFFER, null)
    }
    gl.drawElements(gl.TRIANGLES, 6, gl.UNSIGNED_SHORT, 0)
  }

  let lastActive = performance.now()
  const splatQueue = []

  function queueSplat(x, y, dx, dy, dyeAmt) {
    splatQueue.push({ x, y, dx, dy, dyeAmt })
    lastActive = performance.now()
  }

  /* pointer — canvas is pointer-events:none, listen on window */
  let px = -1, py = -1
  window.addEventListener('pointermove', e => {
    const x = e.clientX / innerWidth
    const y = 1 - e.clientY / innerHeight
    if (px >= 0) {
      const dx = (x - px), dy = (y - py)
      const speed = Math.hypot(dx, dy)
      if (speed > 0.0003) {
        queueSplat(x, y, dx * CFG.FORCE, dy * CFG.FORCE, Math.min(speed * 22, 0.6))
      }
    }
    px = x; py = y
  }, { passive: true })

  function applySplat(s) {
    gl.useProgram(progs.splat.p)
    gl.uniform2f(progs.splat.u.texelSize, 1 / velocity.w, 1 / velocity.h)
    gl.uniform1i(progs.splat.u.uTarget, velocity.read.attach(0))
    gl.uniform1f(progs.splat.u.aspectRatio, innerWidth / innerHeight)
    gl.uniform2f(progs.splat.u.point, s.x, s.y)
    gl.uniform3f(progs.splat.u.color, s.dx, s.dy, 0)
    gl.uniform1f(progs.splat.u.radius, CFG.RADIUS)
    blit(velocity.write); velocity.swap()

    gl.uniform1i(progs.splat.u.uTarget, dye.read.attach(0))
    gl.uniform3f(progs.splat.u.color, s.dyeAmt, 0, 0)
    blit(dye.write); dye.swap()
  }

  function step(dt) {
    gl.disable(gl.BLEND)
    while (splatQueue.length) applySplat(splatQueue.shift())

    const texel = [1 / velocity.w, 1 / velocity.h]

    gl.useProgram(progs.curl.p)
    gl.uniform2f(progs.curl.u.texelSize, ...texel)
    gl.uniform1i(progs.curl.u.uVelocity, velocity.read.attach(0))
    blit(curlFbo)

    gl.useProgram(progs.vorticity.p)
    gl.uniform2f(progs.vorticity.u.texelSize, ...texel)
    gl.uniform1i(progs.vorticity.u.uVelocity, velocity.read.attach(0))
    gl.uniform1i(progs.vorticity.u.uCurl, curlFbo.attach(1))
    gl.uniform1f(progs.vorticity.u.curl, CFG.CURL)
    gl.uniform1f(progs.vorticity.u.dt, dt)
    blit(velocity.write); velocity.swap()

    gl.useProgram(progs.divergence.p)
    gl.uniform2f(progs.divergence.u.texelSize, ...texel)
    gl.uniform1i(progs.divergence.u.uVelocity, velocity.read.attach(0))
    blit(divergence)

    gl.useProgram(progs.clear.p)
    gl.uniform2f(progs.clear.u.texelSize, ...texel)
    gl.uniform1i(progs.clear.u.uTexture, pressure.read.attach(0))
    gl.uniform1f(progs.clear.u.value, 0.8)
    blit(pressure.write); pressure.swap()

    gl.useProgram(progs.pressure.p)
    gl.uniform2f(progs.pressure.u.texelSize, ...texel)
    gl.uniform1i(progs.pressure.u.uDivergence, divergence.attach(0))
    for (let i = 0; i < CFG.PRESSURE_ITERS; i++) {
      gl.uniform1i(progs.pressure.u.uPressure, pressure.read.attach(1))
      blit(pressure.write); pressure.swap()
    }

    gl.useProgram(progs.gradient.p)
    gl.uniform2f(progs.gradient.u.texelSize, ...texel)
    gl.uniform1i(progs.gradient.u.uPressure, pressure.read.attach(0))
    gl.uniform1i(progs.gradient.u.uVelocity, velocity.read.attach(1))
    blit(velocity.write); velocity.swap()

    gl.useProgram(progs.advection.p)
    gl.uniform2f(progs.advection.u.texelSize, ...texel)
    gl.uniform1i(progs.advection.u.uVelocity, velocity.read.attach(0))
    gl.uniform1i(progs.advection.u.uSource, velocity.read.attach(0))
    gl.uniform1f(progs.advection.u.dt, dt)
    gl.uniform1f(progs.advection.u.dissipation, CFG.VEL_DISS)
    blit(velocity.write); velocity.swap()

    gl.uniform1i(progs.advection.u.uVelocity, velocity.read.attach(0))
    gl.uniform1i(progs.advection.u.uSource, dye.read.attach(1))
    gl.uniform1f(progs.advection.u.dissipation, CFG.DYE_DISS)
    blit(dye.write); dye.swap()
  }

  let toneColor = PAPER
  function render() {
    gl.enable(gl.BLEND)
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA)
    gl.clearColor(0, 0, 0, 0)
    gl.bindFramebuffer(gl.FRAMEBUFFER, null)
    gl.clear(gl.COLOR_BUFFER_BIT)
    gl.useProgram(progs.display.p)
    gl.uniform2f(progs.display.u.texelSize, 1 / canvas.width, 1 / canvas.height)
    gl.uniform1i(progs.display.u.uTexture, dye.read.attach(0))
    gl.uniform3f(progs.display.u.uColor, ...toneColor)
    gl.uniform1f(progs.display.u.uCeil, CFG.ALPHA_CEIL)
    blit(null)
  }

  let lastT = performance.now()
  function frame(now) {
    requestAnimationFrame(frame)
    if (document.hidden) return
    if (canvas.width !== Math.floor(innerWidth * dpr) || canvas.height !== Math.floor(innerHeight * dpr)) {
      sizeCanvas()
    }
    if (canvas.width === 0 || canvas.height === 0) return
    if (now - lastActive > CFG.IDLE_MS) return   // dye has died; sleep
    const dt = Math.min((now - lastT) / 1000, 1 / 30)
    lastT = now
    step(dt)
    render()
  }
  requestAnimationFrame(frame)

  window.addEventListener('resize', () => { sizeCanvas() })

  /* tone flip: paper dye + screen over ink · ink dye + multiply over paper */
  const setTone = (mode) => {
    if (mode === 'paper-section') {
      toneColor = INK
      canvas.classList.add('fluid--multiply')
    } else {
      toneColor = PAPER
      canvas.classList.remove('fluid--multiply')
    }
  }

  /* watch which tone the viewport center is over */
  setInterval(() => {
    const cy = innerHeight * 0.5
    let over = 'ink-section'
    document.querySelectorAll('.tone-paper').forEach(el => {
      const r = el.getBoundingClientRect()
      if (r.top < cy && r.bottom > cy) over = 'paper-section'
    })
    setTone(over)
  }, 300)

  api = {
    burst(cx = 0.5, cy = 0.5, power = 1) {
      for (let i = 0; i < 7; i++) {
        const a = Math.random() * Math.PI * 2
        queueSplat(
          cx + (Math.random() - 0.5) * 0.12,
          cy + (Math.random() - 0.5) * 0.12,
          Math.cos(a) * CFG.FORCE * 0.28 * power,
          Math.sin(a) * CFG.FORCE * 0.28 * power,
          0.5 * power
        )
      }
    },
    setTone
  }
  return api
}

export function fluidBurst(x, y, p) { api.burst(x, y, p) }
