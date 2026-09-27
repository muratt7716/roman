// Aşama 4 — tüm sayfaları canlıda gerçek oturumla tara. Geçici veri kurar, sonunda siler.
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs'
import { chromium } from 'playwright-core'
import { createClient } from '@supabase/supabase-js'

const ROOT = new URL('../../', import.meta.url).pathname.replace(/^\/(\w:)/, '$1')
const OUT = new URL('./out/', import.meta.url).pathname.replace(/^\//, '')
mkdirSync(OUT, { recursive: true })
const env = Object.fromEntries(readFileSync(`${ROOT}/.env.local`, 'utf8').split('\n').filter(l => l.includes('=') && !l.startsWith('#')).map(l => [l.slice(0, l.indexOf('=')).trim(), l.slice(l.indexOf('=') + 1).trim()]))
const SITE = process.env.SITE ?? 'https://writersquad.vercel.app'
const URL_ = env.NEXT_PUBLIC_SUPABASE_URL, ANON = env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const ref = new URL(URL_).hostname.split('.')[0]
const admin = createClient(URL_, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
const tag = Date.now().toString(36)
const users = []
const must = r => { if (r.error) throw new Error(JSON.stringify(r.error)); return r.data }

async function mkUser(n, display) {
  const email = `kbcr${n}${tag}@mailinator.com`
  const u = must(await admin.auth.admin.createUser({ email, password: 'Test1234!x', email_confirm: true, user_metadata: { username: `kb${n}${tag}`, full_name: display } })).user
  users.push(u.id)
  await admin.from('profiles').update({ consent_at: new Date().toISOString(), consent_version: '2026-09-26', display_name: display, bio: 'Test yazarı' }).eq('id', u.id)
  const db = createClient(URL_, ANON, { auth: { persistSession: false } })
  const { data: { session } } = await db.auth.signInWithPassword({ email, password: 'Test1234!x' })
  const val = 'base64-' + Buffer.from(JSON.stringify(session)).toString('base64url')
  const name = `sb-${ref}-auth-token`
  const chunks = val.length <= 3180 ? [[name, val]] : val.match(/.{1,3180}/g).map((c, i) => [`${name}.${i}`, c])
  const username = (await admin.from('profiles').select('username').eq('id', u.id).single()).data.username
  return { id: u.id, db, username, chunks, cookie: chunks.map(([k, v]) => `${k}=${v}`).join('; ') }
}
const api = (who, path, method = 'GET', body) => fetch(SITE + path, { method, headers: { cookie: who.cookie, 'content-type': 'application/json' }, body: body ? JSON.stringify(body) : undefined }).then(r => r.json().catch(() => null))

const report = []
let browser
const O = await mkUser('o', 'Deniz Yazar'), M = await mkUser('m', 'Ece Editör'), S = await mkUser('s', 'Ali Öğrenci')
try {
  // ── Fixture ──
  const slug = 'tarama-' + tag
  const project = must(await admin.from('projects').insert({ owner_id: O.id, title: 'Tarama Romanı', slug, genre: 'Fantastik', synopsis: 'Bir test romanının kısa özeti.', visibility: 'published', tags: ['test'] }).select('id').single())
  const role = must(await admin.from('project_roles').insert({ project_id: project.id, name: 'Editör', description: 'Düzenler' }).select('id').single())
  must(await admin.from('project_members').insert({ project_id: project.id, user_id: M.id, role_id: role.id }))
  const ch = must(await admin.from('chapters').insert({ project_id: project.id, title: 'Birinci Bölüm', order_index: 0, created_by: O.id, status: 'final', word_count: 12 }).select('id').single())
  must(await admin.from('chapter_versions').insert({ chapter_id: ch.id, author_id: O.id, content: '<p>Gece yarısı kapı çaldı. '.repeat(3) + '</p>', word_count: 12 }))
  const sug = must(await admin.from('chapter_suggestions').insert({ chapter_id: ch.id, author_id: M.id, content: '<p>Öneri metni</p>', note: 'Şöyle olsa?' }).select('id').single())
  await admin.from('comments').insert({ chapter_id: ch.id, author_id: M.id, content: 'Güzel başlangıç' })
  await admin.from('character_profiles').insert({ project_id: project.id, name: 'Kahraman', created_by: O.id })
  await admin.from('timeline_events').insert({ project_id: project.id, title: 'Başlangıç', order_index: 0, created_by: O.id })

  const cr = await api(O, '/api/classroom', 'POST', { name: 'Tarama 6-B', school_name: 'Tarama Okulu ' + tag, password: 'gizli123' })
  const classroomId = cr?.classroom?.id
  await api(S, '/api/classroom/join', 'POST', { classroom_id: classroomId, password: 'gizli123' })
  const asg = must(await O.db.from('classroom_assignments').insert({ classroom_id: classroomId, title: 'Bir anı yaz', description: 'Tatil anını anlat.', visibility: 'private', due_date: new Date(Date.now() + 7 * 864e5).toISOString() }).select('id').single())
  const st = await api(S, `/api/classroom/${classroomId}/assignments/${asg.id}/start`, 'POST')
  await S.db.from('chapter_versions').insert({ chapter_id: st.chapter_id, author_id: S.id, content: '<p>Tatilde denize gittik.</p>', word_count: 4 })
  const mag = (await api(O, `/api/classroom/${classroomId}/magazine`, 'POST', { title: 'Sayı 1' }))
  const magazineId = mag?.magazine?.id ?? mag?.id

  const idea = (await admin.from('idea_threads').insert({ user_id: O.id, title: 'Uzay korsanları', seed: 'Bir korsan gemisinde geçen bir hikaye fikri.' }).select('id').single()).data
  const sprint = await api(O, '/api/sprint', 'POST', { duration_minutes: 15 })
  const sprintId = sprint?.sprint?.id ?? sprint?.id
  writeFileSync(`${OUT}fixture.json`, JSON.stringify({ classroomId, magazine: mag, sprint, idea }, null, 2))

  // ── Rotalar ──
  const P = project.id
  const routes = [
    // [yol, kim, açıklama]
    ['/', null], ['/', O], ['/explore', null], ['/writers', null], ['/kitaplik', null], ['/discover/magazines', null],
    ['/gizlilik-politikasi', null], ['/kullanim-kosullari', null], ['/acik-riza', null],
    ['/login', null], ['/signup', null], ['/forgot-password', null], ['/reset-password', null],
    [`/projects/${slug}`, null], [`/projects/${slug}/read`, null], [`/projects/${slug}/read/${ch.id}`, null], [`/projects/${slug}/read/${ch.id}`, M],
    [`/u/${O.username}`, null], [`/u/${O.username}`, M],
    ['/dashboard', O], ['/dashboard', S], ['/notifications', O], ['/settings', O], ['/projects/new', O],
    [`/projects/${P}/overview`, O], [`/projects/${P}/overview`, M], [`/projects/${P}/write`, O], [`/projects/${P}/write/${ch.id}`, O], [`/projects/${P}/write/${ch.id}`, M],
    [`/projects/${P}/write/${ch.id}/suggest`, M], [`/projects/${P}/write/${ch.id}/suggestions-list`, O], [`/projects/${P}/write/${ch.id}/suggestions/${sug.id}`, O],
    [`/projects/${P}/write/export`, O], [`/projects/${P}/brainstorm`, O], [`/projects/${P}/wiki`, O], [`/projects/${P}/timeline`, O], [`/projects/${P}/history`, O],
    ['/classroom', O], ['/classroom', S], ['/classroom/new', O], ['/classroom/join', S],
    [`/classroom/${classroomId}`, O], [`/classroom/${classroomId}`, S], [`/classroom/${classroomId}/analytics`, O], [`/classroom/${classroomId}/assignments/new`, O],
    [`/classroom/${classroomId}/assignments/${asg.id}`, O], [`/classroom/${classroomId}/assignments/${asg.id}`, S],
    [`/classroom/${classroomId}/assignments/${asg.id}/review/${st.submission_id}`, O],
    [`/projects/${st.project_id}/write/${st.chapter_id}?submission_id=${st.submission_id}`, S],
    [`/classroom/${classroomId}/magazine`, O], [`/classroom/${classroomId}/magazine/new`, O],
    ...(magazineId ? [[`/classroom/${classroomId}/magazine/${magazineId}/edit`, O], [`/classroom/${classroomId}/magazine/${magazineId}`, O]] : []),
    ['/fikir-odasi', O], ...(idea ? [[`/fikir-odasi/${idea.id}`, M]] : []),
    ['/sprint', O], ['/sprint/new', O], ...(sprintId ? [[`/sprint/${sprintId}`, O]] : []),
    ['/jenerator', O], ['/oyun', O], ['/admin', O],
    ['/bu-sayfa-yok', null], ['/onay', O],
  ]

  browser = await chromium.launch({ executablePath: process.env.CHROME_PATH })
  const linkSet = new Map()
  for (const vp of [{ w: 390, h: 844, n: 'm' }, { w: 1440, h: 900, n: 'd' }]) {
    const ctxs = new Map()
    for (const [path, who] of routes) {
      const key = who?.id ?? 'anon'
      if (!ctxs.has(key)) {
        const ctx = await browser.newContext({ viewport: { width: vp.w, height: vp.h }, locale: 'tr-TR' })
        if (who) await ctx.addCookies(who.chunks.map(([name, value]) => ({ name, value, domain: new URL(SITE).hostname, path: '/', secure: true, sameSite: 'Lax' })))
        ctxs.set(key, ctx)
      }
      const page = await ctxs.get(key).newPage()
      const errs = [], failed = []
      page.on('console', m => { if (m.type() === 'error') errs.push(m.text().slice(0, 200)) })
      page.on('pageerror', e => errs.push('PAGEERROR ' + e.message.slice(0, 200)))
      page.on('response', r => { if (r.status() >= 400 && !r.url().includes('/_next/')) failed.push(`${r.status()} ${r.url().replace(SITE, '').slice(0, 120)}`) })
      let status = 0
      try {
        const resp = await page.goto(SITE + path, { waitUntil: 'networkidle', timeout: 45000 })
        status = resp?.status() ?? 0
      } catch (e) { errs.push('GOTO ' + e.message.slice(0, 120)) }
      await page.waitForTimeout(800)
      const info = await page.evaluate(() => {
        const de = document.documentElement
        const wide = [...document.querySelectorAll('body *')].filter(el => { const r = el.getBoundingClientRect(); return r.right > innerWidth + 2 && r.width > 0 && getComputedStyle(el).position !== 'fixed' })
          .slice(0, 4).map(el => `${el.tagName.toLowerCase()}.${String(el.className).slice(0, 60)}`)
        const txt = document.body.innerText
        return {
          url: location.pathname + location.search,
          title: document.title,
          overflow: de.scrollWidth - de.clientWidth,
          wide,
          errorScreen: /Bir şeyler ters gitti|Application error|Unhandled Runtime Error|Internal Server Error/i.test(txt),
          notFound: /404|bulunamadı/i.test(txt) && txt.length < 2500,
          links: [...document.querySelectorAll('a[href^="/"]')].map(a => a.getAttribute('href')),
          imgsBroken: [...document.images].filter(i => i.complete && i.naturalWidth === 0 && i.src).map(i => i.src.slice(0, 80)),
          emptyButtons: [...document.querySelectorAll('button, a')].filter(b => !b.innerText.trim() && !b.getAttribute('aria-label') && !b.getAttribute('title') && !b.querySelector('img[alt]:not([alt=""])')).length,
        }
      }).catch(e => ({ evalError: e.message }))
      for (const l of info.links ?? []) if (!linkSet.has(l)) linkSet.set(l, `${path} (${who ? 'auth' : 'anon'})`)
      const shot = `${vp.n}-${path.replace(/[^a-z0-9]+/gi, '_').slice(0, 60)}-${who ? who.username.slice(0, 4) : 'anon'}.png`
      await page.screenshot({ path: OUT + shot, fullPage: true }).catch(() => {})
      delete info.links
      report.push({ vp: vp.n, path, who: who ? who.username.replace(tag, '') : 'anon', status, errs, failed: [...new Set(failed)].slice(0, 6), shot, ...info })
      await page.close()
    }
    for (const c of ctxs.values()) await c.close()
  }

  // ── İç bağlantılar ──
  const broken = []
  for (const [href, from] of linkSet) {
    if (href.startsWith('/api/') || href.includes('#')) continue
    const r = await fetch(SITE + href, { redirect: 'manual', headers: { cookie: O.cookie } }).catch(() => null)
    if (!r || r.status >= 400) broken.push({ href, status: r?.status, from })
  }
  writeFileSync(`${OUT}report.json`, JSON.stringify({ report, broken }, null, 2))
  console.log('sayfa kontrolü:', report.length, '· link:', linkSet.size, '· kırık link:', broken.length)
} finally {
  await browser?.close()
  for (const id of users) {
    await admin.from('projects').delete().eq('owner_id', id)
    await admin.from('classrooms').delete().eq('owner_id', id)
    await admin.from('idea_threads').delete().eq('user_id', id)
    await admin.auth.admin.deleteUser(id).catch(e => console.log('silinemedi', id, e.message))
  }
  console.log('temizlik — kalan profil:', (await admin.from('profiles').select('id').in('id', users)).data?.length)
}
