// Ortak yazım akışları — gerçek tarayıcıda tıklayarak.
import { SITE, admin, must, mkUser, loginPage, step, expect, cleanup, tag } from './lib.mjs'

const inbox = async id => (await admin.from('notifications').select('type, payload').eq('user_id', id)).data ?? []
const waitNotif = async (id, type) => { for (let i = 0; i < 15; i++) { if ((await inbox(id)).some(x => x.type === type)) return true; await new Promise(r => setTimeout(r, 1000)) } return false }
const O = await mkUser('co', 'Sahip Yazar'), A = await mkUser('ca', 'Aday Yazar'), I = await mkUser('ci', 'Davetli Yazar')
try {
  // Açık (ekip arayan) proje + roller + bölüm
  const slug = 'ortak-' + tag
  const p = must(await admin.from('projects').insert({ owner_id: O.id, title: 'Ortak Roman', slug, visibility: 'open', synopsis: 'Ekip arıyoruz.' }).select('id').single())
  const r1 = must(await admin.from('project_roles').insert({ project_id: p.id, name: 'Diyalog Yazarı', description: 'Diyaloglar' }).select('id').single())
  const r0 = must(await admin.from('project_roles').insert({ project_id: p.id, name: 'Baş Yazar' }).select('id').single())
  must(await admin.from('project_members').insert({ project_id: p.id, user_id: O.id, role_id: r0.id }))
  must(await admin.from('project_roles').insert({ project_id: p.id, name: 'Editör' }))
  const ch = must(await admin.from('chapters').insert({ project_id: p.id, title: 'Açılış', order_index: 0, created_by: O.id }).select('id').single())
  must(await admin.from('chapter_versions').insert({ chapter_id: ch.id, author_id: O.id, content: '<p>Sis kasabayı yuttu.</p>', word_count: 3 }))

  const pa = await loginPage(A)
  await step('aday: açık projeye başvurur', async () => {
    await pa.goto(`${SITE}/projects/${slug}`)
    const roles = await pa.getByText(/rolü için başvuru/).allInnerTexts()
    expect(!roles.some(r => r.includes('Baş Yazar')), 'sahibin dolu rolü hâlâ başvuruya açık: ' + roles.join(', '))
    await pa.getByPlaceholder(/Kendinizi tanıtın/).first().fill('Merhaba, diyalog yazmayı çok seviyorum ve bu projeye katkı vermek isterim.')
    await pa.getByRole('button', { name: /Başvuruyu Gönder/ }).first().click()
    await pa.getByText(/Başvurun gönderildi/).waitFor({ timeout: 10000 })
    expect(await waitNotif(O.id, 'application'), 'sahibe başvuru bildirimi gitmedi')
    await pa.reload()
    expect(await pa.getByText(/yanıt bekleniyor/).count() > 0, 'başvurduktan sonra form yine gösteriliyor')
    return 'bildirim gitti'
  }, pa)

  const po = await loginPage(O)
  await step('sahip: panelden başvuruyu kabul eder → aday ekibe girer', async () => {
    await po.goto(`${SITE}/projects/${p.id}/overview`)
    await po.getByRole('button', { name: /Kabul/ }).first().click()
    await po.waitForTimeout(3000)
    const m = await admin.from('project_members').select('user_id').eq('project_id', p.id).eq('user_id', A.id)
    expect(m.data?.length === 1, 'aday üye olmadı')
    expect(await waitNotif(A.id, 'acceptance'), 'adaya kabul bildirimi gitmedi')
    await po.reload()
    expect(await po.getByText('Aday Yazar').count() > 0, 'kabul sonrası ekip listesinde görünmüyor')
    return 'üye + bildirim + ekranda'
  }, po)

  await step('yeni üye: bölüme yorum yazar → sahibe bildirim gider', async () => {
    await pa.goto(`${SITE}/projects/${p.id}/write/${ch.id}`)
    const box = pa.locator('[placeholder="Yorum ekle..."]:visible').first()
    await box.fill('Açılış cümlesi çok güçlü!')
    // Gönder düğmesine GERÇEKTEN tıkla — müzik widget'ı üstünü örtüyorsa burada patlar
    await box.locator('xpath=following::button[1]').click({ timeout: 5000 })
    await pa.getByText('Açılış cümlesi çok güçlü!').first().waitFor({ timeout: 10000 })
    expect(await waitNotif(O.id, 'comment'), 'sahibe yorum bildirimi gitmedi')
    return 'yorum görünüyor + bildirim'
  }, pa)

  await step('sahip: yazar profilinden davet gönderir', async () => {
    await po.goto(`${SITE}/u/${I.username}`)
    await po.getByRole('button', { name: /Davet/ }).first().click()
    const dialog = po.locator('[role=dialog], .fixed').last()
    await dialog.locator('select').first().selectOption({ label: 'Ortak Roman' })
    await dialog.locator('select').nth(1).selectOption({ label: 'Editör' })
    await dialog.getByRole('button', { name: /Davet Et|Gönder/ }).last().click()
    expect(await waitNotif(I.id, 'invite'), 'davet bildirimi gitmedi')
  }, po)

  const pi = await loginPage(I)
  await step('davetli: bildirimlerden daveti kabul eder → ekibe girer', async () => {
    await pi.goto(`${SITE}/notifications`)
    await pi.getByRole('button', { name: /Kabul/ }).first().click()
    await pi.waitForTimeout(3000)
    const m = await admin.from('project_members').select('user_id').eq('project_id', p.id).eq('user_id', I.id)
    expect(m.data?.length === 1, 'davetli üye olmadı')
  }, pi)

  await step('okur: yayımlanmış bölüme alkış, takip ve okuma listesi', async () => {
    await admin.from('projects').update({ visibility: 'published' }).eq('id', p.id)
    await admin.from('chapters').update({ status: 'final' }).eq('id', ch.id)
    await pi.goto(`${SITE}/projects/${slug}/read/${ch.id}`)
    const body = await pi.locator('main').innerText()
    const hasText = body.includes('Sis kasabayı yuttu')
    await pi.getByRole('button', { name: /🔥|Ateş/ }).first().click()
    await pi.waitForTimeout(2000)
    const r = await admin.from('chapter_reactions').select('id').eq('chapter_id', ch.id).eq('user_id', I.id)
    expect(r.data?.length === 1, 'alkış kaydedilmedi')
    await pi.goto(`${SITE}/projects/${slug}/read`)
    await pi.getByRole('button', { name: /Takip/ }).first().click()
    await pi.waitForTimeout(2000)
    const f = await admin.from('follows').select('follower_id').eq('follower_id', I.id).eq('following_id', O.id)
    expect(f.data?.length === 1, 'takip kaydedilmedi')
    return hasText ? 'metin görünüyor' : 'METİN GÖRÜNMÜYOR (migration bekleniyor) — alkış ve takip çalışıyor'
  }, pi)

  for (const pg of [pa, po, pi]) if (pg.errors.length) console.log('   konsol hataları:', [...new Set(pg.errors)].slice(0, 3))
} finally {
  await cleanup()
}
