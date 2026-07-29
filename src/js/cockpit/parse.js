/* Resume parsing in the browser — plain text or .docx (unzipped with fflate,
   paragraphs read straight out of word/document.xml). */
import { unzipSync, strFromU8 } from 'fflate'

const SECTION_RE = /^(summary|profile|objective|experience|work experience|professional experience|employment|education|skills|technical skills|projects|certifications|awards|publications|volunteering|leadership)\b/i

export function parseText(raw) {
  const sections = []
  let current = null
  let n = 0
  const ensure = () => {
    if (!current) { current = { title: 'Header', bullets: [] }; sections.push(current) }
    return current
  }
  for (let line of raw.split(/\r?\n/)) {
    line = line.trim()
    if (!line) continue
    if (SECTION_RE.test(line) && line.length < 60) {
      current = { title: titleCase(line), bullets: [] }
      sections.push(current)
    } else {
      const text = line.replace(/^[•▪●\-*·]+\s*/, '').trim()
      if (text) ensure().bullets.push({ id: `b${++n}`, text })
    }
  }
  return { sections }
}

export function parseDocx(arrayBuffer) {
  const files = unzipSync(new Uint8Array(arrayBuffer))
  const doc = files['word/document.xml']
  if (!doc) throw new Error('Not a valid .docx file.')
  const xml = new DOMParser().parseFromString(strFromU8(doc), 'application/xml')
  const paras = [...xml.getElementsByTagName('w:p')]
  const lines = paras
    .map(p => [...p.getElementsByTagName('w:t')].map(t => t.textContent).join(''))
    .filter(t => t.trim())
  return parseText(lines.join('\n'))
}

const titleCase = s => s.toLowerCase().replace(/\b\w/g, c => c.toUpperCase())

export function allBullets(resume) {
  return (resume?.sections || []).flatMap(s => s.bullets)
}
