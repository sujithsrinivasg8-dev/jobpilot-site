/* Portal adapters — live discovery straight from the browser.
   Greenhouse, Lever and Ashby publish CORS-open job-board APIs (they exist to
   be embedded in career pages), so the cockpit can sweep them with no server. */

const strip = html => {
  const doc = new DOMParser().parseFromString(html || '', 'text/html')
  return (doc.body.textContent || '').replace(/\n{3,}/g, '\n\n').trim()
}
const decode = s => strip(`<div>${s || ''}</div>`)  // greenhouse double-escapes content

async function j(url, opts) {
  const r = await fetch(url, opts)
  if (!r.ok) throw new Error(`${r.status}`)
  return r.json()
}

const ADAPTERS = {
  greenhouse: {
    /* light list only — big boards (Stripe, Databricks) are thousands of jobs;
       the JD is fetched per-job at pull-in time via jdRef */
    async fetch(slug) {
      const data = await j(`https://boards-api.greenhouse.io/v1/boards/${slug}/jobs`)
      return (data.jobs || []).map(job => ({
        title: job.title,
        url: job.absolute_url,
        location: job.location?.name || '',
        postedAt: job.first_published || job.updated_at || null,
        jd: null,
        jdRef: { source: 'greenhouse', slug, jobId: job.id },
      }))
    },
  },
  lever: {
    async fetch(slug) {
      const data = await j(`https://api.lever.co/v0/postings/${slug}?mode=json`)
      return (data || []).map(p => ({
        title: p.text,
        url: p.hostedUrl,
        location: p.categories?.location || '',
        postedAt: p.createdAt ? new Date(p.createdAt).toISOString() : null,
        jd: [p.descriptionPlain || strip(p.description), ...(p.lists || []).map(l => `${l.text}\n${strip(l.content)}`)]
          .join('\n\n').slice(0, 40000),
      }))
    },
  },
  ashby: {
    async fetch(slug) {
      const data = await j(`https://api.ashbyhq.com/posting-api/job-board/${slug}?includeCompensation=true`)
      return (data.jobs || []).map(job => ({
        title: job.title,
        url: job.jobUrl || job.applyUrl,
        location: job.location || '',
        postedAt: job.publishedAt || null,
        jd: strip(job.descriptionHtml || '').slice(0, 40000) || job.title,
      }))
    },
  },
}

/* lazy JD fetch for adapters that don't ship it in the list */
export async function fetchJd(job) {
  if (job.jd) return job.jd
  if (job.jdRef?.source === 'greenhouse') {
    const data = await j(`https://boards-api.greenhouse.io/v1/boards/${job.jdRef.slug}/jobs/${job.jdRef.jobId}`)
    return decode(data.content).slice(0, 40000)
  }
  throw new Error('no job description available for this posting')
}

/* try each portal until one answers for this company slug */
export async function detectSource(slug) {
  for (const source of ['greenhouse', 'lever', 'ashby']) {
    try {
      const jobs = await ADAPTERS[source].fetch(slug)
      if (jobs.length) return { source, count: jobs.length }
    } catch { /* try the next portal */ }
  }
  return null
}

export async function sweepBoard(entry) {
  try {
    const jobs = await ADAPTERS[entry.source].fetch(entry.slug)
    return {
      ok: true,
      jobs: jobs.map(job => ({ ...job, company: entry.label, source: entry.source, slug: entry.slug })),
    }
  } catch (e) {
    return { ok: false, error: String(e.message || e), jobs: [] }
  }
}

export function matchesTargets(title, targets) {
  const words = (targets || '').toLowerCase().split(/[,;]+/).map(w => w.trim()).filter(Boolean)
  if (!words.length) return true
  const t = title.toLowerCase()
  return words.some(w => t.includes(w))
}

export const daysAgo = iso => {
  if (!iso) return '—'
  const d = Math.floor((Date.now() - new Date(iso).getTime()) / 864e5)
  return d <= 0 ? 'today' : d === 1 ? 'yesterday' : `${d}d ago`
}
