/* localStorage persistence — the pilot's data never leaves this browser. */
const KEY = 'jp_cockpit_v1'

const blank = () => ({
  resume: null,            // {sections:[{title,bullets:[{id,text}]}], version}
  jobs: [],                // {id, company, title, url, jd, status, assessment, model}
  apps: [],                // {id, jobId, changes, placeholders, status, fit, appliedAt, events:[], tailored}
  settings: { apiKey: '', model: 'claude-sonnet-4-6' },
  targets: 'data engineer, software engineer',   // title keywords the sweep filters by
  watchlist: [                                   // company portals the sweep reads
    { source: 'greenhouse', slug: 'anthropic', label: 'Anthropic' },
    { source: 'greenhouse', slug: 'stripe', label: 'Stripe' },
    { source: 'greenhouse', slug: 'figma', label: 'Figma' },
    { source: 'greenhouse', slug: 'databricks', label: 'Databricks' },
  ],
  seq: { job: 0, app: 0 },
})

export function load() {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) return { ...blank(), ...JSON.parse(raw) }
  } catch { /* corrupted state falls back to blank */ }
  return blank()
}

export function save(state) {
  localStorage.setItem(KEY, JSON.stringify(state))
}

export function clearAll() {
  localStorage.removeItem(KEY)
}

export function addEvent(app, from, to, actor = 'you', meta = {}) {
  app.events.push({ from, to, actor, at: new Date().toISOString(), meta })
  app.status = to
}
