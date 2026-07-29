/* The cockpit — jobpilot's working instrument, running entirely in this
   browser. Views: today · studio · discovery · review · tracker · settings. */
import { assess, tailor, hasMetric, PLACEHOLDER_RE } from './brain.js'
import { parseDocx, parseText } from './parse.js'
import { daysAgo, detectSource, fetchJd, matchesTargets, sweepBoard } from './sources.js'
import { addEvent, clearAll, load, save } from './store.js'

const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]))
const $ = sel => document.querySelector(sel)

let S = load()
const persist = () => save(S)

const STATUSES = ['APPLIED', 'IN_PROCESS', 'ASSESSMENT', 'INTERVIEW', 'OFFER', 'REJECTED', 'GHOSTED', 'WITHDRAWN']
const FIT_GATE = 65

/* ── view: today ─────────────────────────────────────────────────── */
function renderToday(el) {
  const applied = S.apps.filter(a => a.appliedAt)
  const dayKey = iso => iso.slice(0, 10)
  const todayKey = new Date().toISOString().slice(0, 10)
  const yest = new Date(Date.now() - 864e5).toISOString().slice(0, 10)
  const nToday = applied.filter(a => dayKey(a.appliedAt) === todayKey).length
  const nYest = applied.filter(a => dayKey(a.appliedAt) === yest).length
  const pending = S.apps.filter(a => a.status === 'PENDING_REVIEW').length
  const ledger = {}
  for (const a of applied) (ledger[dayKey(a.appliedAt)] ??= []).push(a)
  const days = Object.keys(ledger).sort().reverse()
  for (const d of days) ledger[d].sort((x, y) => jobOf(x).company.localeCompare(jobOf(y).company))

  el.innerHTML = `
    <div class="ck-kpis">
      <div class="ck-kpi"><span class="n">${nToday}</span><span class="d">${nToday - nYest >= 0 ? '▲' : '▼'} ${Math.abs(nToday - nYest)} vs yesterday</span><div class="l">applications today</div></div>
      <div class="ck-kpi"><span class="n">${pending}</span><div class="l">pending reviews</div></div>
      <div class="ck-kpi"><span class="n">${S.jobs.length}</span><div class="l">jobs discovered</div></div>
      <div class="ck-kpi"><span class="n">${applied.length}</span><div class="l">total applied</div></div>
    </div>
    <p class="ck-note" style="margin-bottom:18px">brain: ${S.settings.apiKey ? 'claude — direct from this browser' : 'stub — add an api key in settings for real scoring'}</p>
    ${days.length === 0 ? '<div class="ck-panel"><p class="ck-empty">nothing applied yet — the ledger begins with your first approval.</p></div>' : ''}
    ${days.map(d => `
      <div class="ck-panel">
        <p class="ck-section-title" style="margin-top:0">${d} — ${ledger[d].length} application(s)</p>
        <table><thead><tr><th>company</th><th>role</th><th>status</th><th>fit</th></tr></thead><tbody>
          ${ledger[d].map(a => { const j = jobOf(a); return `<tr><td>${esc(j.company)}</td><td>${esc(j.title)}</td><td><span class="ck-chip">${a.status.toLowerCase().replace('_', ' ')}</span></td><td class="ck-num">${a.fit?.toFixed(0) ?? '—'}</td></tr>` }).join('')}
        </tbody></table>
      </div>`).join('')}`
}

/* ── view: studio ────────────────────────────────────────────────── */
function renderStudio(el) {
  const r = S.resume
  el.innerHTML = `
    <div class="ck-panel">
      <h3>${r ? 'The master resume' : 'Begin with your master resume'}</h3>
      <p class="ck-note">Upload a .docx / .txt, or paste the text. It is parsed into bullets with stable ids —
      the only facts the Brain is ever allowed to cite. ${r ? `Currently v${r.version}.` : ''}</p>
      <div class="ck-actions">
        <input type="file" class="ck-file" id="ckFile" accept=".docx,.txt,.md" />
        <button class="ck-btn" id="ckUpload">upload file</button>
        <button class="ck-btn" id="ckPasteToggle">paste text</button>
        ${r ? '<button class="ck-btn" id="ckSaveResume" hidden>save edits</button>' : ''}
      </div>
      <div id="ckPasteBox" hidden style="margin-top:18px">
        <div class="ck-field"><textarea id="ckPasteText" rows="8"></textarea><label>paste your resume text here</label></div>
        <button class="ck-btn" id="ckParsePaste">parse it</button>
      </div>
      <p class="ck-note" id="ckStudioMsg" style="margin-top:12px"></p>
    </div>
    <div id="ckBullets">${r ? r.sections.map((s, si) => `
      <p class="ck-section-title">${esc(s.title)}</p>
      ${s.bullets.map((b, bi) => `
        <div class="ck-bullet"><span class="bid">${b.id}</span>
          <textarea data-si="${si}" data-bi="${bi}" rows="1">${esc(b.text)}</textarea></div>`).join('')}
    `).join('') : ''}</div>`

  const msg = t => { $('#ckStudioMsg').textContent = t }
  const ingest = (structured, label) => {
    if (!structured.sections.length) return msg('could not find any content to parse.')
    S.resume = { ...structured, version: (S.resume?.version || 0) + 1 }
    persist(); rerender()
    msg(`parsed ${structured.sections.reduce((n, s) => n + s.bullets.length, 0)} bullets from ${label}.`)
  }
  $('#ckUpload').onclick = () => $('#ckFile').click()
  $('#ckFile').onchange = async e => {
    const f = e.target.files[0]; if (!f) return
    try {
      if (f.name.toLowerCase().endsWith('.docx')) ingest(parseDocx(await f.arrayBuffer()), f.name)
      else ingest(parseText(await f.text()), f.name)
    } catch (err) { msg(String(err.message || err)) }
  }
  $('#ckPasteToggle').onclick = () => { const b = $('#ckPasteBox'); b.hidden = !b.hidden }
  $('#ckParsePaste').onclick = () => ingest(parseText($('#ckPasteText').value), 'pasted text')

  const saveBtn = $('#ckSaveResume')
  el.querySelectorAll('.ck-bullet textarea').forEach(t => {
    autoGrow(t)
    t.addEventListener('input', () => {
      autoGrow(t)
      S.resume.sections[+t.dataset.si].bullets[+t.dataset.bi].text = t.value
      if (saveBtn) saveBtn.hidden = false
    })
  })
  if (saveBtn) saveBtn.onclick = () => {
    S.resume.version++; persist(); saveBtn.hidden = true
    msg(`saved as v${S.resume.version}. re-assess jobs to score against it.`)
  }
}
const autoGrow = t => { t.style.height = 'auto'; t.style.height = t.scrollHeight + 'px' }

/* ── view: discovery ─────────────────────────────────────────────── */
let sweepResults = []      // transient — refreshed on every sweep
let sweepNote = ''

function renderDiscovery(el) {
  el.innerHTML = `
    <div class="ck-panel">
      <h3>The watchlist</h3>
      <p class="ck-note">Company portals the sweep reads — Greenhouse, Lever, and Ashby boards answer the
      browser directly. Add a company by its board name (usually the company name, lowercase).</p>
      <table style="margin:14px 0"><tbody>
        ${S.watchlist.map((w, i) => `
          <tr><td>${esc(w.label)}</td><td><span class="ck-chip">${w.source}</span></td>
          <td style="text-align:right"><button class="ck-btn ck-btn--danger" data-unwatch="${i}">remove</button></td></tr>`).join('')}
        ${S.watchlist.length === 0 ? '<tr><td><p class="ck-empty">the watchlist is empty.</p></td></tr>' : ''}
      </tbody></table>
      <div class="ck-field"><input id="ckWatchSlug" /><label>company board name — e.g. anthropic, stripe, notion</label></div>
      <div class="ck-field has-value"><input id="ckTargets" value="${esc(S.targets)}" /><label>target titles (comma separated — filters the sweep)</label></div>
      <div class="ck-actions">
        <button class="ck-btn" id="ckWatchAdd">add to watchlist</button>
        <button class="ck-btn" id="ckSweep">sweep the portals</button>
      </div>
      <p class="ck-note" id="ckSweepMsg" style="margin-top:10px">${esc(sweepNote)}</p>
    </div>

    ${sweepResults.length ? `
    <div class="ck-panel">
      <h3>Fresh openings — newest first</h3>
      <table><thead><tr><th>posted</th><th>company</th><th>role</th><th>location</th><th></th></tr></thead><tbody>
        ${sweepResults.map((job, i) => `
          <tr>
            <td class="ck-num">${daysAgo(job.postedAt)}</td>
            <td>${esc(job.company)}</td>
            <td><a href="${esc(job.url)}" target="_blank" rel="noreferrer" data-no-transition style="border-bottom:1px dotted var(--paper-40)">${esc(job.title)}</a></td>
            <td class="ck-note">${esc(job.location)}</td>
            <td style="text-align:right">${job.inPipeline
              ? '<span class="ck-note">in pipeline</span>'
              : `<button class="ck-btn" data-pull="${i}">pull in &amp; assess</button>`}</td>
          </tr>`).join('')}
      </tbody></table>
    </div>` : ''}

    <details class="ck-panel">
      <summary class="ck-note" style="cursor:pointer">a posting from somewhere else? paste it manually</summary>
      <div style="margin-top:16px">
        <div class="ck-field"><input id="ckJobCompany" /><label>company</label></div>
        <div class="ck-field"><input id="ckJobTitle" /><label>role title</label></div>
        <div class="ck-field"><input id="ckJobUrl" /><label>posting url (optional)</label></div>
        <div class="ck-field"><textarea id="ckJobJd" rows="7"></textarea><label>paste the full job description</label></div>
        <div class="ck-actions"><button class="ck-btn" id="ckAddJob">add to the pipeline</button></div>
        <p class="ck-note" id="ckJobMsg" style="margin-top:10px"></p>
      </div>
    </details>
    <div class="ck-panel">
      <table><thead><tr><th>company</th><th>role</th><th>status</th><th>score</th><th>verdict</th><th></th></tr></thead>
      <tbody>${S.jobs.length === 0 ? '<tr><td colspan="6"><p class="ck-empty">no postings yet.</p></td></tr>' : ''}
      ${[...S.jobs].reverse().map(j => `
        <tr>
          <td>${esc(j.company)}</td>
          <td>${j.url ? `<a href="${esc(j.url)}" target="_blank" rel="noreferrer" data-no-transition style="border-bottom:1px dotted var(--paper-40)">${esc(j.title)}</a>` : esc(j.title)}</td>
          <td><span class="ck-chip">${j.status.toLowerCase().replace('_', ' ')}</span></td>
          <td class="ck-num">${j.assessment ? j.assessment.scores.composite.toFixed(0) : '—'}</td>
          <td>${j.assessment ? `<span class="ck-chip ${['strong_fit', 'fit'].includes(j.assessment.verdict) ? 'hi' : ''}">${j.assessment.verdict.replace('_', ' ')}</span>` : '—'}</td>
          <td style="text-align:right">
            ${j.status === 'DISCOVERED' ? `<button class="ck-btn" data-assess="${j.id}">assess</button>` : ''}
            ${j.status === 'SCORED' ? `<button class="ck-btn" data-tailor="${j.id}">tailor</button>` : ''}
            ${j.status === 'ARCHIVED' ? '<span class="ck-note">below the gate</span>' : ''}
          </td>
        </tr>
        ${j.assessment ? `<tr><td colspan="6"><p class="ck-note">“${esc(j.assessment.first_impression)}”</p></td></tr>` : ''}
      `).join('')}</tbody></table>
    </div>`

  /* watchlist */
  el.querySelectorAll('[data-unwatch]').forEach(b => b.onclick = () => {
    S.watchlist.splice(+b.dataset.unwatch, 1); persist(); rerender()
  })
  $('#ckTargets').addEventListener('change', () => { S.targets = $('#ckTargets').value; persist() })
  const sweepMsg = t => { const n = $('#ckSweepMsg'); if (n) n.textContent = t }
  $('#ckWatchAdd').onclick = async () => {
    const slug = $('#ckWatchSlug').value.trim().toLowerCase().replace(/\s+/g, '')
    if (!slug) return
    if (S.watchlist.some(w => w.slug === slug)) return sweepMsg('already on the watchlist.')
    sweepMsg('listening at the portals…')
    const hit = await detectSource(slug)
    if (!hit) return sweepMsg(`no greenhouse, lever, or ashby board answers to “${slug}” — check the board name.`)
    S.watchlist.push({ source: hit.source, slug, label: slug.charAt(0).toUpperCase() + slug.slice(1) })
    persist(); rerender()
    sweepNote = `${slug} added — a ${hit.source} board with ${hit.count} open roles.`
    sweepMsg(sweepNote)
  }

  /* the sweep — newest openings across every watched portal */
  $('#ckSweep').onclick = async () => {
    S.targets = $('#ckTargets').value; persist()
    const btn = $('#ckSweep'); btn.innerHTML = '<span class="ck-spin"></span>'
    const results = await Promise.all(S.watchlist.map(sweepBoard))
    const failed = S.watchlist.filter((_, i) => !results[i].ok).map(w => w.label)
    const seen = new Set(S.jobs.map(j => j.url).filter(Boolean))
    sweepResults = results.flatMap(r => r.jobs)
      .filter(job => matchesTargets(job.title, S.targets))
      .sort((a, b) => new Date(b.postedAt || 0) - new Date(a.postedAt || 0))
      .slice(0, 40)
      .map(job => ({ ...job, inPipeline: seen.has(job.url) }))
    sweepNote = `${sweepResults.length} matching opening(s) across ${S.watchlist.length} portal(s)` +
      (failed.length ? ` — ${failed.join(', ')} did not answer` : '') + '.'
    rerender()
  }

  /* pull a fresh opening into the pipeline and score it immediately */
  el.querySelectorAll('[data-pull]').forEach(b => b.onclick = async () => {
    const job = sweepResults[+b.dataset.pull]
    if (!job || S.jobs.some(x => x.url === job.url)) return
    b.innerHTML = '<span class="ck-spin"></span>'
    let jd
    try { jd = await fetchJd(job) } catch (e) { sweepMsg('could not read that posting: ' + e.message); rerender(); return }
    const key = (job.company + '|' + job.title).toLowerCase().replace(/[^a-z0-9|]/g, '')
    const row = { id: ++S.seq.job, key, company: job.company, title: job.title, url: job.url, jd, status: 'DISCOVERED', assessment: null }
    S.jobs.push(row)
    job.inPipeline = true
    persist()
    if (S.resume) await doAssess(row.id, null)
    else { rerender(); alert('Pulled in. Upload a master resume in the studio so the brain can score it.') }
  })

  /* manual paste fallback */
  const msg = t => { $('#ckJobMsg').textContent = t }
  $('#ckAddJob').onclick = () => {
    const company = $('#ckJobCompany').value.trim(), title = $('#ckJobTitle').value.trim()
    const jd = $('#ckJobJd').value.trim(), url = $('#ckJobUrl').value.trim()
    if (!company || !title || jd.length < 60) return msg('company, title, and a real job description are required.')
    const key = (company + '|' + title).toLowerCase().replace(/[^a-z0-9|]/g, '')
    if (S.jobs.some(j => j.key === key)) return msg('already in the pipeline — the dedupe invariant blocked a duplicate.')
    S.jobs.push({ id: ++S.seq.job, key, company, title, url, jd, status: 'DISCOVERED', assessment: null })
    persist(); rerender()
  }
  el.querySelectorAll('[data-assess]').forEach(b => b.onclick = () => doAssess(+b.dataset.assess, b))
  el.querySelectorAll('[data-tailor]').forEach(b => b.onclick = () => doTailor(+b.dataset.tailor, b))
}

async function doAssess(jobId, btn) {
  const j = S.jobs.find(x => x.id === jobId)
  if (!S.resume) return alert('Upload a master resume in the studio first — the brain judges (job × resume) pairs.')
  if (btn) btn.innerHTML = '<span class="ck-spin"></span>'
  try {
    const { result, model } = await assess(j.jd, S.resume, S.settings)
    j.assessment = result; j.model = model
    j.status = result.scores.composite >= FIT_GATE ? 'SCORED' : 'ARCHIVED'
    persist(); rerender()
  } catch (e) { alert('assessment failed: ' + e.message); rerender() }
}

async function doTailor(jobId, btn) {
  const j = S.jobs.find(x => x.id === jobId)
  btn.innerHTML = '<span class="ck-spin"></span>'
  try {
    const { result } = await tailor(S.resume, j.assessment, S.settings)
    const changes = result.changes || []
    const tailored = structuredClone(S.resume)
    const byId = new Map(changes.map(c => [c.bullet_id, c.after]))
    let placeholders = 0
    for (const s of tailored.sections) for (const b of s.bullets) {
      if (byId.has(b.id)) b.text = byId.get(b.id)
      if (PLACEHOLDER_RE.test(b.text)) placeholders++
    }
    const app = {
      id: ++S.seq.app, jobId, changes, placeholders, tailored,
      fit: j.assessment.scores.composite, status: 'PENDING_REVIEW', appliedAt: null, events: [],
    }
    addEvent(app, '', 'PENDING_REVIEW', 'the machine')
    S.apps.push(app)
    j.status = 'PENDING_REVIEW'
    persist(); rerender(); switchTab('review')
  } catch (e) { alert('tailoring failed: ' + e.message); rerender() }
}

/* ── view: review ────────────────────────────────────────────────── */
const markPh = t => esc(t).replace(/(\[METRIC NEEDED[^\]]*\])/g, '<span class="ph">$1</span>')

function renderReview(el) {
  const queue = S.apps.filter(a => a.status === 'PENDING_REVIEW').sort((a, b) => b.fit - a.fit)
  el.innerHTML = `
    ${queue.length === 0 ? '<div class="ck-panel"><p class="ck-empty">the queue is clear — tailored variants arrive here for your hand.</p></div>' : ''}
    ${queue.map(a => { const j = jobOf(a); return `
      <div class="ck-panel">
        <h3>${esc(j.company)} — ${esc(j.title)} <span class="ck-num" style="font-size:.9em">· ${a.fit.toFixed(0)}</span></h3>
        <p class="ck-note">“${esc(j.assessment?.first_impression || '')}”</p>
        ${a.placeholders > 0 ? `<div class="ck-warn">${a.placeholders} unresolved [metric needed] placeholder(s) block approval —
          supply the real numbers in the studio, then re-tailor. the machine never invents them for you.</div>` : ''}
        ${a.changes.map(c => `
          <div class="ck-diff"><div class="tag">${c.bullet_id} · ${c.directive_applied.replace('_', ' ')}</div>
            <div class="before">${esc(c.before)}</div><div class="after">${markPh(c.after)}</div></div>`).join('')}
        ${a.changes.length === 0 ? '<p class="ck-note">no bullet changes — the resume already fits.</p>' : ''}
        <div class="ck-actions">
          <button class="ck-btn" data-download="${a.id}">download tailored resume</button>
          ${j.url ? `<a class="ck-btn" href="${esc(j.url)}" target="_blank" rel="noreferrer" data-no-transition>open the application page</a>` : ''}
          <button class="ck-btn" data-approve="${a.id}" ${a.placeholders > 0 ? 'disabled' : ''}>approve &amp; mark applied</button>
          <button class="ck-btn ck-btn--danger" data-reject="${a.id}">decline</button>
        </div>
      </div>` }).join('')}`

  el.querySelectorAll('[data-approve]').forEach(b => b.onclick = () => {
    const a = S.apps.find(x => x.id === +b.dataset.approve)
    if (a.placeholders > 0) return
    addEvent(a, 'PENDING_REVIEW', 'APPROVED')
    addEvent(a, 'APPROVED', 'APPLIED')
    a.appliedAt = new Date().toISOString()
    jobOf(a).status = 'APPLIED'
    persist(); rerender()
  })
  el.querySelectorAll('[data-reject]').forEach(b => b.onclick = () => {
    const a = S.apps.find(x => x.id === +b.dataset.reject)
    addEvent(a, 'PENDING_REVIEW', 'WITHDRAWN')
    jobOf(a).status = 'ARCHIVED'
    persist(); rerender()
  })
  el.querySelectorAll('[data-download]').forEach(b => b.onclick = () => downloadResume(+b.dataset.download))
}

function downloadResume(appId) {
  const a = S.apps.find(x => x.id === appId)
  const j = jobOf(a)
  const lines = []
  for (const s of a.tailored.sections) {
    lines.push(s.title.toUpperCase(), '─'.repeat(s.title.length + 2))
    for (const b of s.bullets) lines.push('• ' + b.text)
    lines.push('')
  }
  const blob = new Blob([lines.join('\n')], { type: 'text/plain' })
  const url = URL.createObjectURL(blob)
  const link = Object.assign(document.createElement('a'), {
    href: url, download: `resume — ${j.company} — ${j.title}.txt`.replace(/[\\/:*?"<>|]/g, '-'),
  })
  link.click(); URL.revokeObjectURL(url)
}

/* ── view: tracker ───────────────────────────────────────────────── */
function renderTracker(el) {
  const rows = [...S.apps].reverse()
  el.innerHTML = `
    <div class="ck-panel">
      <table><thead><tr><th>company</th><th>role</th><th>applied</th><th>fit</th><th>status</th><th></th></tr></thead>
      <tbody>${rows.length === 0 ? '<tr><td colspan="6"><p class="ck-empty">no applications tracked yet.</p></td></tr>' : ''}
      ${rows.map(a => { const j = jobOf(a); return `
        <tr>
          <td>${esc(j.company)}</td><td>${esc(j.title)}</td>
          <td class="ck-num">${a.appliedAt ? a.appliedAt.slice(0, 10) : '—'}</td>
          <td class="ck-num">${a.fit.toFixed(0)}</td>
          <td><select data-status="${a.id}">
            ${[a.status, ...STATUSES.filter(s => s !== a.status)].map(s => `<option>${s}</option>`).join('')}
          </select></td>
          <td><button class="ck-btn" data-timeline="${a.id}">timeline</button></td>
        </tr>
        <tr data-tl-row="${a.id}" hidden><td colspan="6">
          <div class="ck-timeline">${a.events.map(e => `
            <div class="ev">${e.at.slice(0, 19).replace('T', ' · ')} — ${e.from ? esc(e.from) + ' → ' : ''}<strong>${esc(e.to)}</strong> <span style="opacity:.6">by ${esc(e.actor)}</span></div>`).join('')}
          </div></td></tr>` }).join('')}</tbody></table>
    </div>`

  el.querySelectorAll('[data-status]').forEach(sel => sel.onchange = () => {
    const a = S.apps.find(x => x.id === +sel.dataset.status)
    addEvent(a, a.status, sel.value)
    persist(); rerender()
  })
  el.querySelectorAll('[data-timeline]').forEach(b => b.onclick = () => {
    const row = el.querySelector(`[data-tl-row="${b.dataset.timeline}"]`)
    row.hidden = !row.hidden
  })
}

/* ── view: settings ──────────────────────────────────────────────── */
function renderSettings(el) {
  el.innerHTML = `
    <div class="ck-panel">
      <h3>The brain</h3>
      <p class="ck-note">Without a key, a deterministic stub runs the whole pipeline. With an Anthropic API key,
      scoring and tailoring become real Claude calls made <em>directly from this browser</em> —
      the key is stored only here, sent only to Anthropic, and visible to no one else.</p>
      <div class="ck-field ${S.settings.apiKey ? 'has-value' : ''}"><input type="password" id="ckKey" value="${esc(S.settings.apiKey)}" autocomplete="off" /><label>anthropic api key</label></div>
      <div class="ck-field has-value"><input id="ckModel" value="${esc(S.settings.model)}" /><label>model</label></div>
      <div class="ck-actions"><button class="ck-btn" id="ckSaveSettings">save</button></div>
      <p class="ck-note" id="ckSetMsg" style="margin-top:10px"></p>
    </div>
    <div class="ck-panel">
      <h3>Your data</h3>
      <p class="ck-note">Resume, postings, applications, and key live in this browser's local storage —
      nothing is ever sent to any server of ours (there isn't one). Clearing is permanent.</p>
      <div class="ck-actions"><button class="ck-btn ck-btn--danger" id="ckClear">erase everything</button></div>
    </div>`
  $('#ckSaveSettings').onclick = () => {
    S.settings.apiKey = $('#ckKey').value.trim()
    S.settings.model = $('#ckModel').value.trim() || 'claude-sonnet-4-6'
    persist(); $('#ckSetMsg').textContent = S.settings.apiKey ? 'saved — the real brain is on.' : 'saved — running on the stub brain.'
  }
  $('#ckClear').onclick = () => {
    if (confirm('Erase the resume, all postings, and all applications from this browser? This cannot be undone.')) {
      clearAll(); S = load(); rerender()
    }
  }
  el.querySelectorAll('.ck-field input').forEach(i =>
    i.addEventListener('input', () => i.closest('.ck-field').classList.toggle('has-value', !!i.value)))
}

/* ── shell ───────────────────────────────────────────────────────── */
const jobOf = a => S.jobs.find(j => j.id === a.jobId) || { company: '?', title: '?' }

const VIEWS = { today: renderToday, studio: renderStudio, discovery: renderDiscovery, review: renderReview, tracker: renderTracker, settings: renderSettings }
let current = 'today'

function switchTab(name) {
  current = name
  document.querySelectorAll('.ck-tab').forEach(t => t.classList.toggle('is-on', t.dataset.view === name))
  document.querySelectorAll('.ck-view').forEach(v => v.classList.toggle('is-on', v.dataset.view === name))
  rerender()
}

function rerender() {
  const pending = S.apps.filter(a => a.status === 'PENDING_REVIEW').length
  const badge = document.querySelector('.ck-tab[data-view="review"] .count')
  if (badge) badge.textContent = pending ? String(pending) : ''
  const el = document.querySelector(`.ck-view[data-view="${current}"]`)
  if (el) VIEWS[current](el)
}

export function initCockpit() {
  const tabs = document.getElementById('ckTabs')
  if (!tabs) return
  tabs.addEventListener('click', e => {
    const t = e.target.closest('.ck-tab')
    if (t) switchTab(t.dataset.view)
  })
  switchTab(S.resume ? 'today' : 'studio')
}
