// Etkileşim testleri için ortak yardımcılar — canlı site, geçici hesaplar.
import { readFileSync } from 'node:fs'
import { chromium } from 'playwright-core'
import { createClient } from '@supabase/supabase-js'

const env = Object.fromEntries(readFileSync(new URL('../../.env.local', import.meta.url), 'utf8').split('\n').filter(l => l.includes('=') && !l.startsWith('#')).map(l => [l.slice(0, l.indexOf('=')).trim(), l.slice(l.indexOf('=') + 1).trim()]))
export const SITE = process.env.SITE ?? 'https://writersquad.vercel.app'
const URL_ = env.NEXT_PUBLIC_SUPABASE_URL, ANON = env.NEXT_PUBLIC_SUPABASE_ANON_KEY
export const admin = createClient(URL_, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
export const tag = Date.now().toString(36)
export const users = []
export const must = r => { if (r.error) throw new Error(JSON.stringify(r.error)); return r.data }

export async function mkUser(n, display) {
  const email = `kbi${n}${tag}@mailinator.com`
  const u = must(await admin.auth.admin.createUser({ email, password: 'Test1234!x', email_confirm: true, user_metadata: { username: `kb${n}${tag}`, full_name: display } })).user
  users.push(u.id)
  await admin.from('profiles').update({ consent_at: new Date().toISOString(), consent_version: '2026-09-26', display_name: display }).eq('id', u.id)
  const username = (await admin.from('profiles').select('username').eq('id', u.id).single()).data.username
  return { id: u.id, email, password: 'Test1234!x', username, display }
}

let browser
export async function launch() {
  browser ??= await chromium.launch({ executablePath: process.env.CHROME_PATH })
  return browser
}

/** Gerçek giriş formuyla oturum açmış bir sayfa döndürür */
export async function loginPage(user, viewport = { width: 1280, height: 850 }) {
  const b = await launch()
  const ctx = await b.newContext({ viewport, locale: 'tr-TR', timezoneId: 'Europe/Istanbul' })
  const page = await ctx.newPage()
  page.errors = []
  page.on('pageerror', e => page.errors.push(e.message.slice(0, 200)))
  page.on('console', m => { if (m.type() === 'error' && !m.text().includes('Failed to load resource')) page.errors.push(m.text().slice(0, 200)) })
  await page.goto(SITE + '/login')
  await page.fill('#email', user.email)
  await page.fill('#password', user.password)
  await page.click('button[type=submit]')
  await page.waitForURL(u => !u.pathname.startsWith('/login'), { timeout: 30000 })
  return page
}

let pass = 0, fail = 0
let shot = 0
export async function step(label, fn, page) {
  try {
    const detail = await fn()
    pass++; console.log(`✅ ${label}${detail ? '  → ' + detail : ''}`)
    return true
  } catch (e) {
    fail++
    let where = ''
    if (page && !page.isClosed()) {
      const f = new URL(`./out/fail-${++shot}.png`, import.meta.url).pathname.replace(/^\//, '')
      await page.screenshot({ path: f, fullPage: true }).catch(() => {})
      where = ` [${page.url().replace(SITE, '')} · fail-${shot}.png]`
    }
    console.log(`❌ ${label}  → ${e.message.split('\n')[0].slice(0, 200)}${where}`)
    return false
  }
}
export const expect = (cond, msg) => { if (!cond) throw new Error(msg) }

export async function cleanup() {
  await browser?.close()
  for (const id of users) {
    await admin.from('projects').delete().eq('owner_id', id)
    await admin.from('classrooms').delete().eq('owner_id', id)
    await admin.from('idea_threads').delete().eq('user_id', id)
    await admin.from('feedback').delete().eq('user_id', id)
    await admin.auth.admin.deleteUser(id).catch(() => {})
  }
  const left = (await admin.from('profiles').select('id').in('id', users)).data?.length
  console.log(`\n${pass} geçti, ${fail} kaldı · temizlik — kalan profil: ${left}`)
}
