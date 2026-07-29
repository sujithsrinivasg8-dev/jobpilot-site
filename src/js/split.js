/* hand-rolled line/char splitter — wraps text in overflow-hidden masks */

export function splitLines(el) {
  if (el.dataset.splitDone) return [...el.querySelectorAll('.ln-in')]
  const segs = el.innerHTML.split(/<br\s*\/?>/i)
  el.innerHTML = segs
    .map(seg => seg.trim().split(/\s+/).filter(Boolean)
      .map(w => `<span class="w" style="display:inline-block">${w}</span>`).join(' '))
    .join('<br>')
  const words = [...el.querySelectorAll('.w')]
  const lines = []
  let last = null
  words.forEach(w => {
    const t = w.offsetTop
    if (t !== last) { lines.push([]); last = t }
    lines[lines.length - 1].push(w.textContent)
  })
  el.innerHTML = lines
    .map(ws => `<span class="ln"><span class="ln-in">${ws.join(' ')}</span></span>`)
    .join('')
  el.dataset.splitDone = 'lines'
  return [...el.querySelectorAll('.ln-in')]
}

export function splitChars(el) {
  if (el.dataset.splitDone === 'chars') return [...el.querySelectorAll('.ch-in')]
  splitLines(el)
  el.querySelectorAll('.ln').forEach(ln => {
    const text = ln.textContent
    ln.innerHTML = [...text]
      .map(c => c === ' ' ? ' ' : `<span class="ch"><span class="ch-in">${c}</span></span>`)
      .join('')
  })
  el.dataset.splitDone = 'chars'
  return [...el.querySelectorAll('.ch-in')]
}
