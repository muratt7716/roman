// Henüz tıklanmamış modüller: proje oluşturma, bölüm, yayımlama, öneri, pano,
// karakter, zaman çizelgesi, sürüm geri alma, dışa aktarma, jeneratör, dergi, silme.
import { SITE, admin, must, mkUser, loginPage, launch, step, expect, cleanup } from './lib.mjs'

const O = await mkUser('mo', 'Modül Sahibi'), M = await mkUser('mm', 'Modül Üyesi')
const latest = async chId => (await admin.from('chapter_versions').select('content').eq('chapter_id', chId).order('created_at', { ascending: false }).limit(1).maybeSingle()).data?.content ?? ''
let projectId, projectSlug, chapterId
try {
  const po = await loginPage(O)

  await step('proje oluşturma: 3 adımlı form', async () => {
    await po.goto(`${SITE}/projects/new`)
    await po.locator('#title').fill('Modül Romanı')
    await po.getByRole('button', { name: /Devam|İleri/ }).first().click()
    await po.getByRole('button', { name: /Devam Et/ }).first().click()
    await po.getByRole('button', { name: /Oluştur|Projeyi/ }).last().click()
    await po.waitForURL(u => !u.pathname.endsWith('/new'), { timeout: 20000 })
    const p = (await admin.from('projects').select('id, slug').eq('owner_id', O.id).single()).data
    expect(p, 'proje oluşmadı')
    projectId = p.id; projectSlug = p.slug
    const mem = (await admin.from('project_members').select('user_id').eq('project_id', p.id)).data
    expect(mem?.some(x => x.user_id === O.id), 'sahip ekibe eklenmedi')
    return `slug=${p.slug}`
  }, po)

  await step('yeni bölüm eklenir ve editör açılır', async () => {
    await po.goto(`${SITE}/projects/${projectId}/write`)
    await po.getByRole('button', { name: /Yeni Bölüm/ }).first().click()
    await po.getByPlaceholder(/Birinci Bölüm/).fill('Açılış')
    await po.getByPlaceholder(/Birinci Bölüm/).press('Enter')
    await po.waitForURL(/\/write\/[0-9a-f-]{36}/, { timeout: 15000 })
    chapterId = po.url().match(/write\/([0-9a-f-]{36})/)[1]
    await po.locator('.ProseMirror').click()
    await po.keyboard.type('Kasabanın üstüne ağır bir sis çöktü ve kimse evinden çıkmadı o gece boyunca hiç kimse.')
    await po.waitForTimeout(6000)
    expect((await latest(chapterId)).includes('sis çöktü'), 'metin kaydedilmedi')
  }, po)

  await step('bölüm durumu: taslak → inceleme → final', async () => {
    await po.goto(`${SITE}/projects/${projectId}/write`)
    for (let i = 0; i < 2; i++) { await po.getByTitle('Durumu değiştir').first().click(); await po.waitForTimeout(1500) }
    const s = (await admin.from('chapters').select('status').eq('id', chapterId).single()).data.status
    expect(s === 'final', 'durum: ' + s)
  }, po)

  await step('proje yayımlanır → anonim okur metni görür', async () => {
    await po.goto(`${SITE}/projects/${projectId}/overview`)
    await po.getByRole('button', { name: /Projeyi Yayınla/ }).click()
    await po.waitForTimeout(3000)
    const v = (await admin.from('projects').select('visibility').eq('id', projectId).single()).data.visibility
    expect(v === 'published', 'görünürlük: ' + v)
    const anon = await (await (await launch()).newContext()).newPage()
    await anon.goto(`${SITE}/projects/${projectSlug}/read/${chapterId}`)
    const txt = await anon.locator('main').innerText()
    expect(txt.includes('sis çöktü'), 'anonim okur metni göremiyor')
    await anon.close()
  }, po)

  // Üyeyi ekle (davet akışı collab.mjs'te sınandı)
  const role = (await admin.from('project_roles').select('id').eq('project_id', projectId).limit(1).single()).data
    ?? must(await admin.from('project_roles').insert({ project_id: projectId, name: 'Editör' }).select('id').single())
  must(await admin.from('project_members').insert({ project_id: projectId, user_id: M.id, role_id: role.id }))

  const pm = await loginPage(M)
  await step('öneri: üye önerir → sahip kabul eder → bölüm yeni metne geçer', async () => {
    await pm.goto(`${SITE}/projects/${projectId}/write/${chapterId}/suggest`)
    await pm.locator('.ProseMirror').click()
    await pm.keyboard.press('Control+End')
    await pm.keyboard.type(' Sabah olunca sis çekildi.')
    await pm.getByPlaceholder(/Girişi daha çarpıcı/).fill('Sona bir umut ekledim.')
    await pm.getByRole('button', { name: /Öneriyi Gönder/ }).click()
    await pm.waitForTimeout(3000)
    const sug = (await admin.from('chapter_suggestions').select('id').eq('chapter_id', chapterId).single()).data
    expect(sug, 'öneri kaydedilmedi')
    await po.goto(`${SITE}/projects/${projectId}/write/${chapterId}/suggestions/${sug.id}`)
    await po.getByRole('button', { name: /Kabul Et/ }).click()
    await po.waitForTimeout(4000)
    expect((await latest(chapterId)).includes('sis çekildi'), 'kabul sonrası bölüm güncellenmedi')
  }, po)

  await step('fikir panosu: not eklenir', async () => {
    await po.goto(`${SITE}/projects/${projectId}/brainstorm`)
    await po.getByRole('button', { name: /Not Ekle/ }).click()
    await po.waitForTimeout(2500)
    const n = (await admin.from('brainstorm_notes').select('id').eq('project_id', projectId)).data
    expect(n?.length === 1, 'not kaydedilmedi')
  }, po)

  await step('karakter: formdan eklenir', async () => {
    await po.goto(`${SITE}/projects/${projectId}/wiki`)
    await po.getByRole('button', { name: /Karakter Ekle/ }).first().click()
    await po.getByPlaceholder('Karakter adı').fill('Bekçi Hasan')
    await po.getByPlaceholder(/Protagonist/).fill('Yan karakter')
    await po.getByRole('button', { name: /^Ekle$/ }).click()
    await po.getByText('Bekçi Hasan').first().waitFor({ timeout: 10000 })
  }, po)

  await step('zaman çizelgesi: olay eklenir', async () => {
    await po.goto(`${SITE}/projects/${projectId}/timeline`)
    await po.getByRole('button', { name: /Olay Ekle/ }).first().click()
    await po.getByPlaceholder(/Kahramanın Yolculuğu/).fill('Sisin gelişi')
    await po.getByRole('button', { name: /^Ekle$/ }).click()
    await po.getByText('Sisin gelişi').first().waitFor({ timeout: 10000 })
  }, po)

  await step('sürüm geçmişi: eski sürüme geri alınır', async () => {
    await po.goto(`${SITE}/projects/${projectId}/history`)
    await po.getByTitle('Önizle / Geri Al').last().click()
    await po.getByRole('button', { name: /geri al/i }).last().click()
    await po.waitForTimeout(3000)
    const now = await latest(chapterId)
    expect(!now.includes('sis çekildi') && now.includes('sis çöktü'), 'geri alınmadı: ' + now.slice(0, 80))
  }, po)

  await step('dışa aktarma sayfası metni gösterir', async () => {
    await po.goto(`${SITE}/projects/${projectId}/write/export`)
    await po.getByText(/sis çöktü/).first().waitFor({ timeout: 20000 })
  }, po)

  await step('jeneratör: karakter üretilir, alan yenilenir; yapay zekâ yok', async () => {
    await po.goto(`${SITE}/jenerator`)
    await po.getByRole('button', { name: /Rastgele Karakter Üret/ }).click()
    await po.getByText('Kişilik').first().waitFor()
    await po.getByTitle('Yeniden üret').first().click({ force: true })
    expect(await po.getByText(/Derinleştir|Gemini/).count() === 0, 'yapay zekâ izi kaldı')
    const ai = await fetch(`${SITE}/api/ai/character`, { method: 'POST' })
    expect(ai.status === 404 || ai.status === 405, 'AI rotası hâlâ açık: ' + ai.status)
  }, po)

  await step('proje silme: onayla silinir', async () => {
    await po.goto(`${SITE}/projects/${projectId}/overview`)
    await po.getByRole('button', { name: /Projeyi Sil/ }).first().click()
    const input = po.locator('input:visible').last()
    if (await input.count()) await input.fill('Modül Romanı')
    await po.getByRole('button', { name: /Projeyi Sil|Kalıcı/ }).last().click()
    await po.waitForURL(u => !u.pathname.includes(projectId), { timeout: 15000 })
    const p = (await admin.from('projects').select('id').eq('id', projectId)).data
    expect(!p?.length, 'silinmedi')
  }, po)

  for (const pg of [po, pm]) if (pg.errors.length) console.log('   konsol hataları:', [...new Set(pg.errors)].slice(0, 3))
} finally {
  await cleanup()
}
