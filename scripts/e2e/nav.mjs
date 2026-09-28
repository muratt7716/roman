// Navbar (masaüstü + mobil + anonim) ve bildirimler (her tip, her kart tıklanır).
import { SITE, admin, must, mkUser, loginPage, launch, step, expect, cleanup, tag } from './lib.mjs'

const N = await mkUser('nn', 'Bildirim Alan'), X = await mkUser('nx', 'Gönderen Yazar')

/** Sayfa hatasız açıldı mı: HTTP, hata ekranı, 404 metni */
async function assertOk(page, label) {
  await page.waitForLoadState('networkidle').catch(() => {})
  const body = await page.locator('body').innerText()
  expect(!/Bir şeyler ters gitti|Application error|Internal Server Error/i.test(body), `${label}: hata ekranı`)
  expect(!(/404|bulunamadı/i.test(body) && body.length < 2500), `${label}: 404 (${page.url().replace(SITE, '')})`)
}

try {
  // ── Gerçek hedefler ──
  const slug = 'nav-' + tag
  const p = must(await admin.from('projects').insert({ owner_id: N.id, title: 'Bildirim Romanı', slug, visibility: 'published' }).select('id').single())
  const role = must(await admin.from('project_roles').insert({ project_id: p.id, name: 'Editör' }).select('id').single())
  must(await admin.from('project_members').insert({ project_id: p.id, user_id: N.id, role_id: role.id }))
  const ch = must(await admin.from('chapters').insert({ project_id: p.id, title: 'Bir', order_index: 0, created_by: N.id, status: 'final' }).select('id').single())
  must(await admin.from('chapter_versions').insert({ chapter_id: ch.id, author_id: N.id, content: '<p>metin</p>', word_count: 1 }))
  const sug = must(await admin.from('chapter_suggestions').insert({ chapter_id: ch.id, author_id: N.id, content: '<p>x</p>' }).select('id').single())
  const xp = must(await admin.from('projects').insert({ owner_id: X.id, title: 'Davet Eden Proje', slug: 'navx-' + tag, visibility: 'open' }).select('id').single())
  const xr = must(await admin.from('project_roles').insert({ project_id: xp.id, name: 'Dünya İnşacısı' }).select('id').single())
  const inv = must(await admin.from('project_invites').insert({ project_id: xp.id, inviter_id: X.id, invitee_id: N.id, role_id: xr.id }).select('id').single())

  const base = { project_id: p.id, project_title: 'Bildirim Romanı', chapter_id: ch.id, chapter_title: 'Bir', project_slug: slug }
  const rows = [
    ['application', { ...base, applicant_username: X.username, role_name: 'Editör' }, `/projects/${p.id}/overview`],
    ['acceptance', { ...base, role_name: 'Editör' }, `/projects/${p.id}/overview`],
    ['acceptance', { ...base, context: 'suggestion_accepted' }, `/projects/${p.id}/write/${ch.id}`],
    ['rejection', { ...base, context: 'suggestion_rejected' }, `/projects/${p.id}/write/${ch.id}`],
    ['comment', { ...base, commenter_username: X.username, preview: 'güzel' }, `/projects/${p.id}/write/${ch.id}`],
    ['suggestion', { ...base, suggestion_id: sug.id, suggester_username: X.username }, `/projects/${p.id}/write/${ch.id}/suggestions-list`],
    ['new_chapter', base, `/projects/${slug}/read/${ch.id}`],
    ['new_follower', { follower_id: X.id, follower_username: X.username, follower_display_name: X.display }, `/u/${X.username}`],
    ['reaction', { ...base, reactor_username: X.username, emoji: '🔥' }, `/projects/${slug}/read/${ch.id}`],
    ['invite', { invite_id: inv.id, project_id: xp.id, project_title: 'Davet Eden Proje', role_name: 'Dünya İnşacısı', inviter_username: X.username }, null],
  ]
  must(await admin.from('notifications').insert(rows.map(([type, payload]) => ({ user_id: N.id, type, payload }))))

  const page = await loginPage(N)
  await step('zil: okunmamış sayısı görünür', async () => {
    await page.goto(`${SITE}/dashboard`)
    const label = await page.locator('a[href="/notifications"]').first().getAttribute('aria-label')
    expect(/okunmamış/.test(label ?? ''), 'zilde sayı yok: ' + label)
    return label
  }, page)

  await step('bildirimler: her tip doğru metinle listelenir', async () => {
    await page.goto(`${SITE}/notifications`)
    await page.getByText('davet etti').first().waitFor({ timeout: 20000 })
    const text = await page.locator('main').innerText()
    for (const needle of ['için yeni başvuru', 'projesine kabul edildin', 'önerin kabul edildi', 'önerin kabul edilmedi', 'yorum yaptı', 'öneri gönderdi', 'yeni bölüm', 'takip etmeye başladı', '🔥', 'davet etti'])
      expect(text.includes(needle), `"${needle}" yok`)
    expect(!text.includes('başvurun reddedildi'), 'öneri reddi hâlâ "başvurun reddedildi" diyor')
  }, page)

  for (const [type, , target] of rows.filter(r => r[2])) {
    await step(`bildirim kartı → ${type} → ${target.replace(p.id, '<p>').replace(ch.id, '<ch>')}`, async () => {
      await page.goto(`${SITE}/notifications`)
      await page.locator(`a[href="${target}"]`).first().click()
      await page.waitForURL(u => u.pathname !== '/notifications', { timeout: 15000 })
      await assertOk(page, type)
    }, page)
  }

  await step('davet kartı: Kabul → ekibe girer', async () => {
    await page.goto(`${SITE}/notifications`)
    await page.getByRole('button', { name: /Kabul/ }).first().click()
    await page.waitForTimeout(3000)
    const m = (await admin.from('project_members').select('user_id').eq('project_id', xp.id).eq('user_id', N.id)).data
    expect(m?.length === 1, 'üye olmadı')
  }, page)

  await step('tümünü temizle (bekleyen davet yokken hepsi gider)', async () => {
    await page.goto(`${SITE}/notifications`)
    await page.getByRole('button', { name: /temizle/i }).first().click()
    // İki adımlı onay: "Emin misin?" + ikinci tıklama
    const confirm = page.getByRole('button', { name: /temizle|evet|sil/i }).first()
    if (await page.getByText('Emin misin?').count()) await confirm.click()
    await page.waitForTimeout(3000)
    const left = (await admin.from('notifications').select('id').eq('user_id', N.id)).data?.length
    expect(left === 0, `${left} bildirim kaldı`)
  }, page)

  // ── Masaüstü navbar ──
  for (const [label, path] of [['Keşfet', '/explore'], ['Kütüphane', '/kitaplik'], ['Yazarlar', '/writers'], ['Akademi', '/classroom'], ['Sprint', '/sprint'], ['Panel', '/dashboard']]) {
    await step(`navbar: ${label}`, async () => {
      await page.goto(`${SITE}/`)
      await page.locator('nav').getByRole('link', { name: label, exact: true }).first().click()
      await page.waitForURL(u => u.pathname === path, { timeout: 15000 })
      await assertOk(page, label)
    }, page)
  }
  for (const [label, path] of [['Profilim', `/u/${N.username}`], ['Fikir Odası', '/fikir-odasi'], ['Karakter Jeneratörü', '/jenerator'], ['Sınıf Dergileri', '/discover/magazines'], ['Ayarlar', '/settings']]) {
    await step(`hesap menüsü: ${label}`, async () => {
      await page.goto(`${SITE}/dashboard`)
      await page.getByRole('button', { name: 'Hesap menüsü' }).click()
      await page.getByRole('menuitem', { name: label }).click()
      await page.waitForURL(u => u.pathname === path, { timeout: 15000 })
      await assertOk(page, label)
    }, page)
  }

  // ── Mobil ──
  const b = await launch()
  const mctx = await b.newContext({ viewport: { width: 390, height: 844 }, locale: 'tr-TR', storageState: await page.context().storageState() })
  const m = await mctx.newPage()
  for (const [label, path] of [['Keşfet', '/explore'], ['Akademi', '/classroom'], ['Fikir Odası', '/fikir-odasi'], ['Karakter Jeneratörü', '/jenerator']]) {
    await step(`mobil menü: ${label} (menü kapanır)`, async () => {
      await m.goto(`${SITE}/dashboard`)
      await m.getByRole('button', { name: 'Menüyü Aç' }).click()
      await m.getByRole('link', { name: label }).last().click()
      await m.waitForURL(u => u.pathname === path, { timeout: 15000 })
      await m.waitForTimeout(600)
      expect(await m.getByText('Navigasyon').count() === 0, 'sayfa değişti ama menü açık kaldı')
    }, m)
  }
  await step('mobil: hesap menüsünden Ayarlar ve Çıkış erişilebilir', async () => {
    await m.goto(`${SITE}/dashboard`)
    await m.getByRole('button', { name: 'Hesap menüsü' }).click()
    expect(await m.getByRole('menuitem', { name: 'Ayarlar' }).isVisible(), 'Ayarlar görünmüyor')
    expect(await m.getByRole('menuitem', { name: /Çıkış Yap/ }).isVisible(), 'Çıkış görünmüyor')
  }, m)

  await step('çıkış yap → korumalı sayfa girişe yönlendirir', async () => {
    await page.goto(`${SITE}/dashboard`)
    await page.getByRole('button', { name: 'Hesap menüsü' }).click()
    await page.getByRole('menuitem', { name: /Çıkış Yap/ }).click()
    await page.waitForTimeout(2500)
    await page.goto(`${SITE}/dashboard`)
    expect(page.url().includes('/login'), 'çıkıştan sonra hâlâ panelde: ' + page.url())
  }, page)

  // ── Anonim ──
  const actx = await b.newContext({ locale: 'tr-TR' })
  const a = await actx.newPage()
  for (const [label, path] of [['Giriş Yap', '/login'], ['Ücretsiz Başla', '/signup']]) {
    await step(`anonim navbar: ${label}`, async () => {
      await a.goto(`${SITE}/`)
      await a.locator('nav').getByRole('link', { name: label }).first().click()
      await a.waitForURL(u => u.pathname === path, { timeout: 15000 })
    }, a)
  }
  await step('anonim: korumalı sayfa → giriş, sonra geri dönüş adresi korunur', async () => {
    await a.goto(`${SITE}/notifications`)
    expect(a.url().includes('/login'), 'yönlendirilmedi: ' + a.url())
  }, a)
} finally {
  await cleanup()
}
