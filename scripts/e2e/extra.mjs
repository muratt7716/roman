// Son kalan akışlar: yeniden onay kapısı, sınıf dergisi, profil fotoğrafı, sınıf silme.
import { SITE, admin, must, mkUser, loginPage, launch, step, expect, cleanup, tag } from './lib.mjs'

const T = await mkUser('et', 'Dergi Öğretmeni'), S = await mkUser('es', 'Dergi Öğrencisi'), R = await mkUser('er', 'Eski Rızalı')
try {
  // ── Yeniden onay: eski sürüme rıza vermiş mevcut kullanıcı ──
  await admin.from('profiles').update({ consent_version: '2026-07-05' }).eq('id', R.id)
  const pr = await loginPage(R)
  await step('onay kapısı: eski rızalı kullanıcı güncel metinleri onaylar', async () => {
    await pr.goto(`${SITE}/dashboard`)
    await pr.waitForURL(/\/onay/, { timeout: 15000 })
    await pr.getByText('Metinlerimiz güncellendi').waitFor()
    const btn = pr.getByRole('button', { name: /Onayla ve Devam Et/ })
    expect(await btn.isDisabled(), 'kutular işaretlenmeden onay düğmesi aktif')
    const boxes = pr.locator('input[type=checkbox]')
    await boxes.nth(0).check()
    expect(await btn.isDisabled(), 'yurt dışı aktarım rızası olmadan onaylanabiliyor')
    await boxes.nth(1).check()
    await btn.click()
    await pr.waitForURL(/\/dashboard/, { timeout: 15000 })
    const p = (await admin.from('profiles').select('consent_version').eq('id', R.id).single()).data
    expect(p.consent_version === '2026-09-26', 'sürüm kaydedilmedi: ' + p.consent_version)
    await pr.goto(`${SITE}/acik-riza`)
    expect((await pr.locator('body').innerText()).includes('yurt dışı'), 'açık rıza metni açılmıyor')
  }, pr)

  await step('profil fotoğrafı yüklenir', async () => {
    await pr.goto(`${SITE}/settings`)
    const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64')
    await pr.locator('input[type=file]').first().setInputFiles({ name: 'a.png', mimeType: 'image/png', buffer: png })
    await pr.waitForTimeout(5000)
    const url = (await admin.from('profiles').select('avatar_url').eq('id', R.id).single()).data.avatar_url
    expect(url?.includes('/avatars/'), 'avatar_url güncellenmedi: ' + url)
    const res = await fetch(url.split('?')[0])
    expect(res.ok, 'yüklenen dosya açılmıyor: ' + res.status)
  }, pr)

  // ── Dergi: sınıf + teslim edilmiş ödev kur (akışlar academy-ui.mjs'te sınandı) ──
  const c = must(await admin.from('classrooms').insert({ owner_id: T.id, name: 'Dergi Sınıfı', school_name: 'Dergi Okulu ' + tag, password: 'dergi1', join_code: 'D' + tag.slice(-5).toUpperCase() }).select('id').single())
  await admin.from('classroom_members').insert([{ classroom_id: c.id, user_id: T.id, role: 'teacher' }, { classroom_id: c.id, user_id: S.id, role: 'student' }])
  const a = must(await admin.from('classroom_assignments').insert({ classroom_id: c.id, title: 'Bahar şiiri' }).select('id').single())
  const sp = must(await admin.from('projects').insert({ owner_id: S.id, title: 'Bahar şiiri', slug: 'dergi-' + tag, visibility: 'draft' }).select('id').single())
  const sch = must(await admin.from('chapters').insert({ project_id: sp.id, title: 'Bahar', order_index: 0, created_by: S.id }).select('id').single())
  must(await admin.from('chapter_versions').insert({ chapter_id: sch.id, author_id: S.id, content: '<p>Cemreler düştü toprağa.</p>', word_count: 3 }))
  must(await admin.from('assignment_submissions').insert({ assignment_id: a.id, student_id: S.id, project_id: sp.id, status: 'submitted', submitted_at: new Date().toISOString() }))

  const pt = await loginPage(T)
  let magUrl
  await step('dergi: öğretmen oluşturur, yazı ekler, yayımlar', async () => {
    await pt.goto(`${SITE}/classroom/${c.id}/magazine/new`)
    await pt.getByPlaceholder(/Bahar Sayısı/).fill('Bahar Sayısı')
    await pt.getByRole('button', { name: /Dergiyi Oluştur/ }).click()
    await pt.waitForURL(/magazine\/[0-9a-f-]{36}\/edit/, { timeout: 20000 })
    magUrl = pt.url().replace(/\/edit.*$/, '')
    await pt.locator('select').first().selectOption({ index: 1 })
    await pt.getByRole('button', { name: /^Ekle$/ }).first().click()
    await pt.waitForTimeout(2500)
    pt.once('dialog', d => d.accept())
    await pt.getByRole('button', { name: /Sayıyı Yayımla/ }).click()
    await pt.waitForTimeout(4000)
    const m = (await admin.from('class_magazines').select('status').eq('classroom_id', c.id).single()).data
    expect(m.status === 'published', 'yayımlanmadı: ' + m.status)
    const n = (await admin.from('notifications').select('type').eq('user_id', S.id)).data
    expect(n?.some(x => x.type === 'magazine_published'), 'öğrenciye bildirim gitmedi')
  }, pt)

  await step('dergi: öğrenci ve başka bir kullanıcı metni okur, isim "Anonim"', async () => {
    const ps = await loginPage(S)
    await ps.goto(magUrl)
    await ps.getByText('Cemreler düştü').first().waitFor({ timeout: 20000 })
    const body = await ps.locator('body').innerText()
    expect(body.includes('Anonim') && !body.includes('Dergi Öğrencisi'), 'öğrencinin adı izinsiz görünüyor')
    await pr.goto(magUrl)   // sınıf dışı biri (yayımlanmış dergi herkese açık)
    await pr.getByText('Cemreler düştü').first().waitFor({ timeout: 20000 })
  }, pt)

  await step('öğretmen sınıf sayfasında öğrenciyi görür', async () => {
    await pt.goto(`${SITE}/classroom/${c.id}`)
    await pt.getByText('Dergi Öğrencisi').first().waitFor({ timeout: 15000 })
    const body = await pt.locator('body').innerText()
    expect(!/\/ 0 Öğrenci/.test(body), 'öğrenci sayısı 0 görünüyor')
  }, pt)

  await step('sınıf listesinden, adı yazılarak silinir', async () => {
    await pt.goto(`${SITE}/classroom`)
    await pt.getByTitle('Sınıfı sil').first().click()
    await pt.getByPlaceholder('Dergi Sınıfı').fill('Dergi Sınıfı')
    await pt.getByRole('button', { name: /Sil/ }).last().click()
    await pt.waitForTimeout(4000)
    const left = (await admin.from('classrooms').select('id').eq('id', c.id)).data
    expect(!left?.length, 'silinmedi')
  }, pt)
} finally {
  await admin.from('classrooms').delete().eq('owner_id', T.id)
  await admin.storage.from('avatars').remove([`${R.id}.png`]).catch(() => {})
  await cleanup()
}
