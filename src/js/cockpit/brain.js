/* The Recruiter Brain — browser edition.
   Stub heuristics by default; real Claude calls direct-from-browser when the
   pilot supplies an API key in Settings (key never leaves this browser except
   to Anthropic). Both paths enforce the truthfulness invariant. */

const SKILL_ALIASES = { k8s: 'kubernetes', js: 'javascript', ts: 'typescript', py: 'python', postgres: 'postgresql', gcp: 'google cloud' }
const SKILLS = [
  'python', 'java', 'javascript', 'typescript', 'react', 'node', 'go', 'rust', 'c++', 'c#',
  'sql', 'postgresql', 'mysql', 'mongodb', 'redis', 'kafka', 'spark', 'airflow', 'dbt',
  'aws', 'azure', 'google cloud', 'docker', 'kubernetes', 'terraform', 'ci/cd', 'git',
  'machine learning', 'deep learning', 'pytorch', 'tensorflow', 'nlp', 'llm', 'langchain',
  'fastapi', 'django', 'flask', 'spring', 'graphql', 'rest', 'microservices', 'linux',
  'snowflake', 'bigquery', 'databricks', 'tableau', 'power bi', 'excel', 'pandas', 'numpy',
  'etl', 'data pipeline', 'data warehouse', 'data modeling', 'scala', 'hadoop', 'hive',
  'agile', 'scrum', 'jira', 'html', 'css', 'sass', 'next.js', 'vue', 'angular', 'svelte',
]
const ADJACENT = {
  snowflake: ['bigquery', 'databricks', 'data warehouse'], bigquery: ['snowflake', 'databricks'],
  pytorch: ['tensorflow'], tensorflow: ['pytorch'],
  aws: ['azure', 'google cloud'], azure: ['aws', 'google cloud'], 'google cloud': ['aws', 'azure'],
  vue: ['react', 'angular'], angular: ['react', 'vue'], react: ['vue', 'angular', 'next.js'],
  django: ['flask', 'fastapi'], flask: ['django', 'fastapi'], fastapi: ['django', 'flask'],
  mysql: ['postgresql'], postgresql: ['mysql'],
}
const VERBS = /^(built|led|designed|reduced|increased|launched|migrated|automated|shipped|created|developed|implemented|optimized|delivered|architected|owned|drove|improved|scaled|cut|deployed|engineered|managed|maintained|integrated|streamlined|established|spearheaded|refactored|modernized|accelerated|orchestrated|processed|analyzed|configured|authored|mentored|trained|coordinated|produced|published|resolved|supported|debugged)/i

const EXP_SECTION = /experience|project|employment|work/i
export const PLACEHOLDER_RE = /\[METRIC NEEDED[^\]]*\]/

function foundSkills(text) {
  let t = ' ' + text.toLowerCase().replace(/[^a-z0-9+#./ ]/g, ' ') + ' '
  for (const [a, c] of Object.entries(SKILL_ALIASES)) t = t.replaceAll(` ${a} `, ` ${c} `)
  return SKILLS.filter(s => t.includes(` ${s} `) || t.includes(` ${s},`))
}

export function hasMetric(text) {
  return /\d+(\.\d+)?\s*(%|percent|x\b|k\b|m\b|b\b|ms|s\b|users|records|req|rows|gb|tb)/i.test(text)
    || /[$₹€]\s?\d/.test(text)
    || /\d+\s+(\w+\s+)?(engineers|people|members|developers|analysts|teams|clients|projects|years|markets|countries|regions|stores|reports|dashboards|pipelines|models|services|stakeholders|customers|vendors|applications|endpoints|sources|tables|jobs)/i.test(text)
    || /team of \d+/i.test(text)
}

export function stubAssess(jdText, resume) {
  const jdSkills = foundSkills(jdText).sort()
  const sections = resume.sections || []
  const bullets = sections.flatMap(s => s.bullets)
  const expBullets = sections.filter(s => EXP_SECTION.test(s.title)).flatMap(s => s.bullets)

  const keywordMap = []
  const directives = []
  let present = 0, adjacent = 0
  for (const skill of jdSkills) {
    const evidence = bullets.filter(b => b.text.toLowerCase().includes(skill)).map(b => b.id)
    if (evidence.length) { present++; keywordMap.push({ skill, status: 'present', evidence_bullet_ids: evidence.slice(0, 3), justification: '' }); continue }
    const adj = (ADJACENT[skill] || []).find(a => bullets.some(b => b.text.toLowerCase().includes(a)))
    if (adj) {
      adjacent++
      const ev = bullets.filter(b => b.text.toLowerCase().includes(adj)).map(b => b.id).slice(0, 2)
      keywordMap.push({ skill, status: 'adjacent', evidence_bullet_ids: ev, justification: `transferable from ${adj}` })
      directives.push({ target: ev[0], action: 'add_keyword', serves_requirement: skill, source_facts: `bullet demonstrates ${adj}, adjacent to ${skill}`, metric_instruction: '' })
    } else {
      keywordMap.push({ skill, status: 'missing', evidence_bullet_ids: [], justification: '' })
    }
  }

  const n = Math.max(jdSkills.length, 1)
  const hard = 100 * (present + 0.5 * adjacent) / n
  const metricBullets = bullets.filter(b => hasMetric(b.text)).length
  const impact = Math.min(100, 100 * metricBullets / Math.max(bullets.length, 1) * 2.2)
  const verbBullets = bullets.filter(b => VERBS.test(b.text)).length
  const resp = Math.min(100, 40 + 60 * verbBullets / Math.max(bullets.length, 1))
  const depth = Math.min(100, 55 + 5 * bullets.length / 3)
  const domain = 60, ats = Math.min(100, 50 + 50 * present / n)
  const composite = Math.round((0.25 * hard + 0.20 * depth + 0.20 * resp + 0.15 * impact + 0.10 * domain + 0.10 * ats) * 10) / 10

  for (const b of expBullets.slice(0, 14)) {
    if (!hasMetric(b.text)) directives.push({ target: b.id, action: 'rewrite', serves_requirement: 'impact quality', source_facts: b.text, metric_instruction: 'no metric in source — insert [METRIC NEEDED] placeholder' })
    else if (!VERBS.test(b.text)) directives.push({ target: b.id, action: 're_emphasize', serves_requirement: 'XYZ form', source_facts: b.text, metric_instruction: 'surface existing metric' })
  }

  const verdict = composite >= 85 ? 'strong_fit' : composite >= 70 ? 'fit' : composite >= 50 ? 'stretch' : 'reject'
  const missing = keywordMap.filter(k => k.status === 'missing').map(k => k.skill)
  return {
    job_extraction: { required_skills: jdSkills, screen_out_criteria: missing.slice(0, 4) },
    scores: { hard_skills: r1(hard), experience_depth: r1(depth), responsibility_alignment: r1(resp), impact_quality: r1(impact), domain_fit: domain, ats_readiness: r1(ats), composite },
    keyword_map: keywordMap, gaps: missing.slice(0, 6), red_flags: [],
    tailoring_directives: directives.slice(0, 18),
    verdict, recruiter_pass_probability: Math.round(Math.min(0.95, composite / 110) * 100) / 100,
    first_impression: `${present}/${n} required skills evidenced directly, ${adjacent} adjacent. ` +
      (composite >= 70 ? 'Solid screen — tailor and submit.' : composite >= 50 ? 'A stretch — only worth it with strong tailoring.' : 'Likely screened out on missing must-haves.'),
  }
}
const r1 = x => Math.round(x * 10) / 10

export function stubTailor(resume, assessment) {
  const map = new Map(resume.sections.flatMap(s => s.bullets).map(b => [b.id, b.text]))
  const changes = []
  for (const d of assessment.tailoring_directives || []) {
    const before = map.get(d.target)
    if (!before) continue
    let after = before, keywords = [], placeholder = false
    if (d.action === 'add_keyword') {
      if (!before.toLowerCase().includes(d.serves_requirement.toLowerCase())) {
        after = `${before.replace(/\.$/, '')} — transferable to ${d.serves_requirement}.`
        keywords = [d.serves_requirement]
      }
    } else if (d.action === 'rewrite' || d.action === 're_emphasize') {
      let core = before.replace(/\.$/, '').replace(/^(i\s+|was\s+|responsible for\s+|worked on\s+)/i, '')
      core = core.charAt(0).toUpperCase() + core.slice(1)
      if (!VERBS.test(core)) core = 'Delivered ' + core.charAt(0).toLowerCase() + core.slice(1)
      if (hasMetric(core)) after = core + '.'
      else { after = `${core}, as measured by [METRIC NEEDED: e.g., % improvement, volume, or time saved].`; placeholder = true }
    }
    if (after !== before) {
      changes.push({ bullet_id: d.target, before, after, directive_applied: d.action, keywords_added: keywords, has_placeholder: placeholder, rationale: d.serves_requirement })
      map.set(d.target, after)
    }
  }
  return { changes }
}

/* ── real Claude, direct from the browser ─────────────────────────── */
const ASSESSOR_SYSTEM = `You are "The Recruiter Brain" — a technical recruiter and hiring manager with 20 years of experience. You receive a JOB DESCRIPTION and a MASTER RESUME (structured JSON, bullets keyed by bullet_id). Respond ONLY with JSON: {"job_extraction":{"required_skills":[],"screen_out_criteria":[]},"scores":{"hard_skills":0,"experience_depth":0,"responsibility_alignment":0,"impact_quality":0,"domain_fit":0,"ats_readiness":0,"composite":0},"keyword_map":[{"skill":"","status":"present|adjacent|missing","evidence_bullet_ids":[],"justification":""}],"gaps":[],"red_flags":[],"tailoring_directives":[{"target":"bullet_id","action":"rewrite|re_emphasize|add_keyword","serves_requirement":"","source_facts":"","metric_instruction":""}],"verdict":"strong_fit|fit|stretch|reject","recruiter_pass_probability":0.0,"first_impression":""} Scores 0-100, weights: hard 25/depth 20/responsibility 20/impact 15/domain 10/ats 10; composite = weighted sum. NEVER direct inventing facts or numbers; absent metrics get [METRIC NEEDED: suggestion] placeholders. Judge only from the documents.`
const TAILOR_SYSTEM = `You are an elite technical resume editor executing a recruiter's work order. Rules: 1 TRUTH — only facts in the master resume; never invent; missing metrics become "[METRIC NEEDED: suggestion]". 2 XYZ — Accomplished X, as measured by Y, by doing Z; action verb first; one line. 3 KEYWORDS — JD terms only where source_facts justify. 4 SCOPE — apply only the directives. Respond ONLY with JSON: {"changes":[{"bullet_id":"","before":"","after":"","directive_applied":"","keywords_added":[],"has_placeholder":false,"rationale":""}]}`

async function claude(settings, system, user) {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': settings.apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model: settings.model || 'claude-sonnet-4-6', max_tokens: 8000, temperature: 0.2,
      system, messages: [{ role: 'user', content: user }],
    }),
  })
  if (!res.ok) throw new Error(`Claude API ${res.status}: ${(await res.text()).slice(0, 200)}`)
  const data = await res.json()
  const text = data.content[0].text
  const m = text.match(/\{[\s\S]*\}/)
  return JSON.parse(m ? m[0] : text)
}

export async function assess(jdText, resume, settings) {
  if (!settings.apiKey) return { result: stubAssess(jdText, resume), model: 'stub' }
  const user = `JOB DESCRIPTION:\n${jdText.slice(0, 24000)}\n\nMASTER RESUME:\n${JSON.stringify(resume).slice(0, 24000)}`
  return { result: await claude(settings, ASSESSOR_SYSTEM, user), model: settings.model || 'claude' }
}

export async function tailor(resume, assessment, settings) {
  if (!settings.apiKey) return { result: stubTailor(resume, assessment), model: 'stub' }
  const user = `MASTER RESUME:\n${JSON.stringify(resume).slice(0, 20000)}\n\nJOB EXTRACTION:\n${JSON.stringify(assessment.job_extraction || {})}\n\nTAILORING_DIRECTIVES:\n${JSON.stringify(assessment.tailoring_directives || [])}`
  return { result: await claude(settings, TAILOR_SYSTEM, user), model: settings.model || 'claude' }
}
