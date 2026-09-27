// Akademi — tamamen arayüzden: sınıf aç, katıl, ödev ver, yaz, teslim et, notla.
import { SITE, admin, mkUser, loginPage, step, expect, cleanup, tag } from './lib.mjs'

const T = await mkUser('at', 'Öğretmen Ayşe'), S = await mkUser('as', 'Öğrenci Can')
const school = 'Arayüz Okulu ' + tag
let classroomId, assignmentUrl
try {
  const pt = await loginPage(T)
  await step('öğretmen: formdan sınıf açar', async () => {
    await pt.goto(`${SITE}/classroom/new`)
    await pt.getByPlaceholder(/Atatürk Anadolu Lisesi/).fill(school)
    await pt.getByPlaceholder(/10-B Türk Edebiyatı/).fill('7-A Yazarlık')
    await pt.getByPlaceholder(/edebiyat2025/).fill('kalem77')
    await pt.locator('button[type=submit]').click()
    await pt.waitForURL(/\/classroom\/[0-9a-f-]{36}/, { timeout: 20000 })
    classroomId = pt.url().match(/classroom\/([0-9a-f-]{36})/)[1]
  }, pt)

  await step('öğretmen: formdan ödev verir (min 5 kelime, yarın teslim)', async () => {
    await pt.goto(`${SITE}/classroom/${classroomId}/assignments/new`)
    await pt.getByPlaceholder(/İlkbahar Rüzgarları/).fill('Bir kış sabahı')
    await pt.getByPlaceholder(/ipuçları/).fill('Kışın ilk karını anlat.')
    const d = new Date(Date.now() + 864e5)
    const local = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Istanbul', dateStyle: 'short', timeStyle: 'short' }).format(d).replace(' ', 'T')
    await pt.locator('input[type=datetime-local]').fill(local)
    await pt.getByPlaceholder(/altında teslim kabul edilmez/).fill('5')
    await pt.locator('button[type=submit]').click()
    await pt.waitForURL(u => !u.pathname.endsWith('/new'), { timeout: 20000 })
    const a = (await admin.from('classroom_assignments').select('id, due_date').eq('classroom_id', classroomId).single()).data
    expect(a, 'ödev oluşmadı')
    assignmentUrl = `${SITE}/classroom/${classroomId}/assignments/${a.id}`
    // Seçilen yerel saat (İstanbul) veritabanında doğru UTC'ye dönmeli
    const diffMin = Math.abs(new Date(a.due_date).getTime() - Math.floor(d.getTime() / 60000) * 60000) / 60000
    expect(diffMin <= 1, `son teslim saati ${diffMin} dk kaymış (${a.due_date})`)
    return 'son teslim saati doğru kaydedildi'
  }, pt)

  const ps = await loginPage(S)
  await step('öğrenci: okulu arar, sınıfı seçer, şifreyle katılır', async () => {
    await ps.goto(`${SITE}/classroom/join`)
    await ps.getByPlaceholder(/Atatürk Anadolu$/).fill(school)
    await ps.locator('button[type=submit]').first().click()
    await ps.getByText('7-A Yazarlık').first().click()
    await ps.getByPlaceholder(/Öğretmeninin verdiği şifre/).fill('kalem77')
    await ps.locator('button[type=submit]').last().click()
    await ps.waitForURL(new RegExp(`/classroom/${classroomId}`), { timeout: 20000 })
  }, ps)

  await step('öğrenci: ödevi açar, yazar, HEMEN teslim eder', async () => {
    await ps.goto(assignmentUrl)
    await ps.getByRole('button', { name: /Yaz|Başla|Devam/ }).first().click()
    await ps.waitForURL(/\/write\//, { timeout: 20000 })
    await ps.locator('.ProseMirror').click()
    await ps.keyboard.type('Sabah perdeyi açınca her yer bembeyazdı ve sokak sessizdi. Son cümle budur.')
    ps.once('dialog', d => d.accept())
    await ps.getByRole('button', { name: /teslim et/i }).click()
    await ps.waitForTimeout(6000)
    const sub = (await admin.from('assignment_submissions').select('status, project_id').eq('student_id', S.id).single()).data
    expect(sub?.status === 'submitted', 'teslim olmadı: ' + sub?.status)
    const chs = (await admin.from('chapters').select('id').eq('project_id', sub.project_id)).data.map(c => c.id)
    const v = (await admin.from('chapter_versions').select('content').in('chapter_id', chs).order('created_at', { ascending: false }).limit(1)).data?.[0]
    expect(v?.content?.includes('Son cümle budur'), 'teslim anında son yazılanlar kaydedilmemiş: ' + (v?.content ?? '(boş)').slice(0, 80))
    return 'son cümle teslimde var'
  }, ps)

  await step('öğretmen: teslimi okur ve not verir, öğrenci notu görür', async () => {
    await pt.goto(assignmentUrl)
    await pt.getByText('Öğrenci Can').first().click()
    await pt.getByPlaceholder('85').fill('88')
    await pt.getByPlaceholder(/geri bildirim/).fill('Betimlemeler çok güzel.')
    await pt.getByRole('button', { name: /^Kaydet$/ }).click()
    await pt.waitForTimeout(3000)
    const sub = (await admin.from('assignment_submissions').select('status, grade').eq('student_id', S.id).single()).data
    expect(sub?.grade === 88 && sub.status === 'graded', 'not kaydedilmedi: ' + JSON.stringify(sub))
    await ps.goto(assignmentUrl)
    expect(await ps.getByText('88').count() > 0, 'öğrenci notunu göremiyor')
  }, pt)

  for (const pg of [pt, ps]) if (pg.errors.length) console.log('   konsol hataları:', [...new Set(pg.errors)].slice(0, 3))
} finally {
  await cleanup()
}
