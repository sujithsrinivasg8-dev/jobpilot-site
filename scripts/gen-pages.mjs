/* Generates the inner pages from one shared shell so header/menu/footer
   never drift apart. Run: node scripts/gen-pages.mjs */
import { writeFileSync, mkdirSync } from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')

const shellTop = (title, desc, page) => `<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${title}</title>
  <meta name="description" content="${desc}" />
  <style>html{background:#0A0801}body{margin:0;background:#0A0801;color:#D9D7D4}.preloader{position:fixed;inset:0;background:#0A0801;z-index:11}</style>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,500;1,400&family=Shippori+Mincho:wght@400;500&family=Cinzel:wght@400&display=swap" rel="stylesheet">
  <link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Ccircle cx='50' cy='50' r='34' fill='none' stroke='%23D9D7D4' stroke-width='6'/%3E%3C/svg%3E">
</head>
<body data-page="${page}">
  <a class="skip-link" href="#page">skip to content</a>

  <div class="vignette" aria-hidden="true"></div>
  <div class="grain" aria-hidden="true"></div>

  <div class="bands" aria-hidden="true">
    <div class="band-layer band-layer--1"><div class="band-track"><img alt="" /><img alt="" /></div></div>
    <div class="band-layer band-layer--2"><div class="band-track"><img alt="" /><img alt="" /></div></div>
  </div>

  <canvas class="fluid" id="fluid" aria-hidden="true"></canvas>
  <div class="cursor" id="cursor" aria-hidden="true"></div>

  <header class="site-head">
    <a class="brand" href="/index.html">jobpilot<span class="brand-seal" aria-hidden="true"></span></a>
    <button class="menu-btn" id="menuBtn" aria-expanded="false" aria-controls="menuOverlay">
      <span class="mbox"><span class="m-a">menu</span><span class="m-b" aria-hidden="true">close</span></span>
    </button>
  </header>

  <div class="menu-overlay" id="menuOverlay" aria-hidden="true">
    <div class="menu-band" aria-hidden="true"><div class="band-track"><img alt="" /><img alt="" /></div></div>
    <nav class="menu-nav" aria-label="site">
      <ul>
        <li><a class="menu-link" href="/index.html">home</a></li>
        <li><a class="menu-link" href="/philosophy.html">philosophy</a></li>
        <li class="menu-group">
          <span class="menu-label">the practice</span>
          <ul class="menu-sub">
            <li><a href="/pillars/discover.html">01 — discover</a></li>
            <li><a href="/pillars/tailor.html">02 — tailor</a></li>
            <li><a href="/pillars/arrive.html">03 — arrive</a></li>
          </ul>
        </li>
        <li><a class="menu-link" href="/company.html">company</a></li>
        <li><a class="menu-link" href="/contact.html">contact</a></li>
        <li><a class="menu-link" href="/cockpit.html">cockpit</a></li>
      </ul>
    </nav>
    <div class="menu-edge menu-edge--left"><a class="roll" href="/privacy.html">privacy</a></div>
    <div class="menu-edge menu-edge--right">
      <p class="addr">film nagar · hyderabad, ind</p>
      <p class="addr">228 park ave s · new york, usa</p>
    </div>
    <div class="menu-edge menu-edge--social">
      <a class="roll" href="https://github.com" data-no-transition target="_blank" rel="noopener">github</a>
      <a class="roll" href="https://x.com" data-no-transition target="_blank" rel="noopener">x</a>
    </div>
  </div>

  <div class="scrim" id="scrim" aria-hidden="true">
    <div class="scrim-band"><div class="band-track"><img alt="" /><img alt="" /></div></div>
  </div>

  <main id="page">
`

const footer = `
    <footer class="footer">
      <p class="foot-word" data-reveal="chars" aria-label="jobpilot">jobpilot</p>
      <div class="foot-grid">
        <div class="foot-col">
          <p class="eyebrow">site</p>
          <ul class="foot-nav">
            <li><a class="roll" href="/index.html">home</a></li>
            <li><a class="roll" href="/philosophy.html">philosophy</a></li>
            <li><a class="roll" href="/company.html">company</a></li>
            <li><a class="roll" href="/contact.html">contact</a></li>
            <li><a class="roll" href="/cockpit.html">cockpit</a></li>
            <li><a class="roll" href="/privacy.html">privacy</a></li>
          </ul>
        </div>
        <div class="foot-col">
          <p class="eyebrow">the practice</p>
          <ul>
            <li><a class="roll" href="/pillars/discover.html">01 — discover</a></li>
            <li><a class="roll" href="/pillars/tailor.html">02 — tailor</a></li>
            <li><a class="roll" href="/pillars/arrive.html">03 — arrive</a></li>
          </ul>
        </div>
        <div class="foot-col">
          <p class="eyebrow">offices</p>
          <p class="addr">film nagar<br>hyderabad, ind</p>
          <p class="addr">228 park ave s<br>new york, usa</p>
        </div>
      </div>
      <div class="foot-base">
        <span>© 2026 jobpilot</span>
        <span class="clocks" aria-hidden="true">
          <span class="clock" data-clock data-tz="Asia/Kolkata" data-label="ist, hyderabad ind"></span>
          <span class="clock" data-clock data-tz="America/New_York" data-label="et, new york usa"></span>
        </span>
        <button class="roll" data-top>top</button>
      </div>
    </footer>
  </main>

  <div class="preloader" id="preloader" aria-hidden="true">
    <p class="pre-tag">The work remembers.</p>
    <div class="pre-count"><span id="preCount">0</span></div>
  </div>

  <script type="module" src="/src/js/app.js"></script>
</body>
</html>
`

const firstView = (label, h1, kicker) => `
    <section class="fv fv--inner">
      <span class="sect-label" aria-hidden="true">${label}</span>
      <div class="fv-inner">
        <p class="eyebrow fv-eyebrow">${label}</p>
        <h1 class="fv-title">${h1}</h1>
        ${kicker ? `<p class="fv-kicker">${kicker}</p>` : ''}
      </div>
      <div class="fv-seal" aria-hidden="true" data-parallax-speed="0.9"></div>
    </section>
`

const prose = ({ eyebrow, h2, paras, art, alt, flip = false, tone = '' }) => `
    <section class="sect sect--prose ${flip ? 'sect--flip' : ''} ${tone}">
      <div class="sect-inner">
        <div class="prose">
          ${eyebrow ? `<p class="eyebrow" data-reveal="eyebrow">${eyebrow}</p>` : ''}
          <h2 data-reveal="lines">${h2}</h2>
          ${paras.map(p => `<p data-reveal="lines">${p}</p>`).join('\n          ')}
        </div>
        <figure class="frame" data-parallax-speed="0.96"><img data-art="${art}" alt="${alt}" /></figure>
      </div>
    </section>
`

const nextStrip = (href, name, art) => `
    <a class="next-strip" href="${href}">
      <span class="next-eyebrow">next</span>
      <span class="next-name roll">${name}</span>
      <span class="next-art" aria-hidden="true"><img data-art="${art}" alt="" /></span>
    </a>
`

/* ── pages ─────────────────────────────────────────────────────── */
const pages = []

pages.push({
  path: 'philosophy.html',
  title: 'philosophy — jobpilot',
  desc: 'Nothing invented. Everything remembered. The philosophy of jobpilot.',
  page: 'philosophy',
  body:
    firstView('philosophy', 'Truth is the<br>whole design.', 'what the machine may do — and what it may never.') +
    prose({
      eyebrow: 'the invariant',
      h2: 'We reframe.<br>We never invent.',
      paras: [
        'The engine may reorder, re-emphasize, and re-keyword what you have genuinely done. It may never conjure an employer, a date, a tool, or a number that does not exist.',
        'Where a metric is missing, the machine does not imagine one. It leaves a marked absence — a question addressed to you — and refuses to send until you have answered it. Lying is not discouraged here; it is structurally impossible.'
      ],
      art: 'ripple', alt: 'Rings widening on dark water'
    }) +
    prose({
      eyebrow: 'the sentence',
      h2: 'Accomplished X,<br>measured by Y,<br>by doing Z.',
      paras: [
        'The sentence is old and the discipline is rare. Every line of experience is bent toward its outcome: what was achieved, how it was counted, and the craft that produced it.',
        'Keywords arrive only where the work truly used them. A résumé shaped this way is not decoration — it is evidence, arranged.'
      ],
      art: 'threads', alt: 'Threads of light falling through fog', flip: true
    }) +
    prose({
      eyebrow: 'the gate',
      h2: 'A human hand<br>approves every send.',
      paras: [
        'Before anything leaves, you see the difference — line by line, before and beside after — and you choose. Approve, amend, or decline.',
        'The machine proposes. You dispose. Automation that removes your judgment has automated too much.'
      ],
      art: 'stones', alt: 'Stones resting in raked gravel'
    }) +
    nextStrip('/pillars/discover.html', '01 — discover', 'ridge')
})

pages.push({
  path: 'pillars/discover.html',
  title: 'discover — jobpilot',
  desc: 'Every opening, found while it still breathes. The discovery practice.',
  page: 'discover',
  body:
    firstView('practice 01', 'discover', 'every opening, found while it still breathes.') +
    prose({
      eyebrow: 'the sweep',
      h2: 'Searches that<br>never sleep.',
      paras: [
        'Saved searches sweep the public boards and the quiet corners alike — the career pages companies forget anyone reads, the postings that vanish within days.',
        'Duplicates are folded into one. A role seen on three boards is one role, and the truest door to it is chosen for you.'
      ],
      art: 'ridge', alt: 'Layered ridges dissolving into mist'
    }) +
    prose({
      eyebrow: 'the reading',
      h2: 'Read like a recruiter.<br>Scored like one.',
      paras: [
        'Each description is read for what it actually asks — the requirements beneath the wishlist, the screens that reject in six seconds.',
        'Every posting receives an honest verdict against your real history: pursue, stretch, or let it pass. The reasons are kept, and the reasons teach.'
      ],
      art: 'threads', alt: 'Threads of light falling through fog', flip: true
    }) +
    nextStrip('/pillars/tailor.html', '02 — tailor', 'ripple')
})

pages.push({
  path: 'pillars/tailor.html',
  title: 'tailor — jobpilot',
  desc: 'Your truth, arranged for the role. The tailoring practice.',
  page: 'tailor',
  body:
    firstView('practice 02', 'tailor', 'your truth, arranged for the role.') +
    prose({
      eyebrow: 'the work order',
      h2: 'Surgical edits,<br>never a rewrite.',
      paras: [
        'A precise work order is drawn for every line: what to surface, what to compress, which true fact serves which stated need.',
        'The document keeps its face — the same page, the same weight, the same quiet typography. Only the emphasis moves.'
      ],
      art: 'ripple', alt: 'Rings widening on dark water'
    }) +
    prose({
      eyebrow: 'the absence',
      h2: 'What is missing<br>is asked for.',
      paras: [
        'When a claim wants a number the record does not hold, the machine leaves a marked absence and stops. Nothing ships around a blank.',
        'You supply the truth, or the line stays as it was. Either way, every word that leaves is yours.'
      ],
      art: 'stones', alt: 'Stones resting in raked gravel', flip: true
    }) +
    nextStrip('/pillars/arrive.html', '03 — arrive', 'wide')
})

pages.push({
  path: 'pillars/arrive.html',
  title: 'arrive — jobpilot',
  desc: 'Every application, remembered and measured. The tracking practice.',
  page: 'arrive',
  body:
    firstView('practice 03', 'arrive', 'every application, remembered and measured.') +
    prose({
      eyebrow: 'the ledger',
      h2: 'Nothing sent is<br>ever forgotten.',
      paras: [
        'Every application keeps its own timeline — sent, acknowledged, assessed, interviewed, answered. The inbox is read so you do not have to keep the ledger by hand.',
        'Silence is recorded too. After enough of it, a door is quietly marked closed, and reopened the moment it speaks again.'
      ],
      art: 'stones', alt: 'Stones resting in raked gravel'
    }) +
    prose({
      eyebrow: 'the pattern',
      h2: 'The traces<br>become teaching.',
      paras: [
        'Which sources answer. Which scores convert. What the market keeps asking for that the record does not yet hold.',
        'The search stops being a scatter of hope and becomes a practice — measured, adjusted, improving by the week.'
      ],
      art: 'ridge', alt: 'Layered ridges dissolving into mist', flip: true
    }) +
    nextStrip('/company.html', 'company', 'wide')
})

pages.push({
  path: 'company.html',
  title: 'company — jobpilot',
  desc: 'An instrument, not a factory. About jobpilot.',
  page: 'company',
  body:
    firstView('company', 'Built for the one<br>applying.', 'an instrument, not a factory.') +
    prose({
      eyebrow: 'the stance',
      h2: 'Quiet machinery,<br>human judgment.',
      paras: [
        'jobpilot automates the labor of the search — the finding, the shaping, the sending, the remembering — and refuses, by design, to automate the truth.',
        'It moves at a human pace on purpose: rate-limited, respectful of every platform’s rules, patient where patience protects you.'
      ],
      art: 'wide', alt: 'A wide foggy valley of ridgelines and firs'
    }) +
    prose({
      eyebrow: 'the record',
      h2: 'Everything auditable.<br>Nothing hidden.',
      paras: [
        'Every automated act leaves evidence — a timestamp, a screenshot, a line in an immutable ledger. What was sent, where, and why is never a mystery.',
        'Your documents are yours: encrypted at rest, read by no third party, deleted when you say so.'
      ],
      art: 'ridge', alt: 'Layered ridges dissolving into mist', flip: true, tone: 'tone-paper'
    }) +
    nextStrip('/contact.html', 'contact', 'threads')
})

pages.push({
  path: 'contact.html',
  title: 'contact — jobpilot',
  desc: 'Write to jobpilot.',
  page: 'contact',
  body:
    firstView('contact', 'Say the word.', 'we answer within the day.') + `
    <section class="sect">
      <div class="sect-inner" style="max-width: 720px;">
        <form class="contact-form" novalidate>
          <div class="field">
            <input type="text" id="cf-name" name="name" autocomplete="name" />
            <label for="cf-name">your name</label>
          </div>
          <div class="field">
            <input type="email" id="cf-email" name="email" autocomplete="email" />
            <label for="cf-email">your email</label>
          </div>
          <div class="field">
            <textarea id="cf-msg" name="message" rows="4"></textarea>
            <label for="cf-msg">what you are looking for</label>
          </div>
          <button class="roll link-view" type="submit">send the word</button>
          <p class="form-note" role="status" aria-live="polite"></p>
        </form>
      </div>
    </section>
` +
    nextStrip('/index.html', 'home', 'hero')
})

pages.push({
  path: 'privacy.html',
  title: 'privacy — jobpilot',
  desc: 'Privacy at jobpilot.',
  page: 'privacy',
  body:
    firstView('privacy', 'Yours, and<br>only yours.', '') + `
    <section class="sect">
      <div class="sect-inner" style="max-width: 720px;">
        <div class="prose">
          <p data-reveal="lines">Your résumé, your answers, and your correspondence are personal information. They are encrypted at rest, transmitted only where you direct them, and shown to no third party.</p>
          <p data-reveal="lines">Email access is read-only, granted by you, revocable at any moment. No analytics scripts watch you here. No data is sold, shared, or kept past its welcome.</p>
          <p data-reveal="lines">When you leave, everything leaves with you.</p>
        </div>
      </div>
    </section>
` +
    nextStrip('/index.html', 'home', 'hero')
})

/* the cockpit — the working instrument as a page of the site */
pages.push({
  path: 'cockpit.html',
  title: 'cockpit — jobpilot',
  desc: 'The jobpilot instrument itself — resume studio, recruiter-brain scoring, tailoring, review queue, tracker. Everything runs in your own browser.',
  page: 'cockpit',
  script: 'src/js/cockpit-main.js',
  body: `
    <section class="ck">
      <div class="ck-head">
        <p class="eyebrow">the cockpit</p>
        <h1>The instrument itself.</h1>
        <p class="lede">Everything on this page runs in your browser and stays in your browser —
        your resume, your postings, your history. There is no server behind it, and nothing you
        enter ever leaves your hands. Begin in the studio; end with an approval only you can give.</p>
      </div>
      <nav class="ck-tabs" id="ckTabs" aria-label="cockpit sections">
        <button class="ck-tab" data-view="today">today</button>
        <button class="ck-tab" data-view="studio">studio</button>
        <button class="ck-tab" data-view="discovery">discovery</button>
        <button class="ck-tab" data-view="review">review <span class="count"></span></button>
        <button class="ck-tab" data-view="tracker">tracker</button>
        <button class="ck-tab" data-view="settings">settings</button>
      </nav>
      <div id="ckViews">
        <div class="ck-view" data-view="today"></div>
        <div class="ck-view" data-view="studio"></div>
        <div class="ck-view" data-view="discovery"></div>
        <div class="ck-view" data-view="review"></div>
        <div class="ck-view" data-view="tracker"></div>
        <div class="ck-view" data-view="settings"></div>
      </div>
    </section>
`,
})

for (const p of pages) {
  let out = shellTop(p.title, p.desc, p.page) + p.body + footer
  if (p.script) out = out.replace('src/js/app.js', p.script)
  // depth-aware relative links so the site works under any base path
  const prefix = p.path.includes('/') ? '../' : ''
  out = out.replaceAll('href="/', `href="${prefix}`)
           .replaceAll('src="/src/', `src="${prefix}src/`)
  const file = join(root, p.path)
  mkdirSync(dirname(file), { recursive: true })
  writeFileSync(file, out)
  console.log('wrote', p.path)
}
