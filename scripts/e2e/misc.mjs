// Ayarlar, geri bildirim, fikir odası, sprint, arayüzden hesap silme.
import { SITE, admin, mkUser, loginPage, launch, step, expect, cleanup, tag } from './lib.mjs'

const U = await mkUser('mu', 'Deneme Yazar'), V = await mkUser('mv', 'Katkı Yazar')
try {
  const p = await loginPage(U)

  await step('ayarlar: görünen ad ve biyografi kaydedilir', async () => {
    await p.goto(`${SITE}/settings`)
    await p.getByPlaceholder(/Adın nasıl görünsün/).fill('Yeni Ad Soyad')
    await p.getByPlaceholder(/Kendinden kısaca bahset/).fill('Kısa öykü yazarıyım.')
    await p.getByRole('button', { name: /^Kaydet$/ }).click()
    await p.waitForTimeout(3000)
    const prof = (await admin.from('profiles').select('display_name, bio').eq('id', U.id).single()).data
    expect(prof.display_name === 'Yeni Ad Soyad' && prof.bio === 'Kısa öykü yazarıyım.', 'kaydedilmedi: ' + JSON.stringify(prof))
    await p.goto(`${SITE}/u/${U.username}`)
    expect(await p.getByText('Yeni Ad Soyad').count() > 0, 'profil sayfası eski adı gösteriyor')
  }, p)

  await step('geri bildirim: menüden açılır, gönderilir', async () => {
    await p.getByRole('button', { name: 'Hesap menüsü' }).click()
    await p.getByText('Geri Bildirim Gönder').click()
    await p.getByPlaceholder(/Ne düşünüyorsun/).fill('Editörde kelime sayacı çok güzel olmuş, teşekkürler.')
    await p.getByRole('button', { name: /^Gönder$/ }).click()
    await p.getByText('Teşekkürler!').waitFor({ timeout: 10000 })
    const fb = (await admin.from('feedback').select('id').eq('user_id', U.id)).data
    expect(fb?.length === 1, 'kaydedilmedi')
  }, p)

  let ideaUrl
  await step('fikir odası: fikir atılır', async () => {
    await p.goto(`${SITE}/fikir-odasi`)
    await p.getByRole('button', { name: /Fikir At/ }).first().click()
    await p.getByPlaceholder(/Savaş sonrası/).fill('Deniz feneri bekçisinin sırrı')
    await p.getByPlaceholder(/Ne anlatmak istiyorsun/).fill('Yalnız bir bekçinin her gece gördüğü ışık üzerine bir hikaye.')
    await p.getByRole('button', { name: /Odaya At/ }).click()
    await p.waitForURL(/fikir-odasi\/[0-9a-f-]{36}/, { timeout: 15000 }).catch(() => {})
    const t = (await admin.from('idea_threads').select('id').eq('user_id', U.id).single()).data
    expect(t, 'fikir kaydedilmedi')
    ideaUrl = `${SITE}/fikir-odasi/${t.id}`
  }, p)

  const pv = await loginPage(V)
  await step('fikir odası: başkası mesaj yazar, sahibi anlık görür', async () => {
    await p.goto(ideaUrl)
    await pv.goto(ideaUrl)
    const box = pv.getByPlaceholder(/Fikrine katkı yaz/)
    await box.fill('Işık aslında bir gemiden geliyor olabilir!')
    await box.press('Enter')
    await pv.getByText('Işık aslında bir gemiden').waitFor({ timeout: 10000 })   // yazan kendi mesajını görmeli
    const saved = (await admin.from('idea_messages').select('id').eq('user_id', V.id)).data?.length ?? 0
    expect(saved === 1, 'mesaj kaydedilmedi')
    const live = await p.getByText('Işık aslında bir gemiden').waitFor({ timeout: 10000 }).then(() => true, () => false)
    if (live) return 'kaydedildi + anlık göründü'
    await p.reload()
    const afterReload = await p.getByText('Işık aslında bir gemiden').count()
    throw new Error(`mesaj kaydedildi ama sahibine ANLIK gelmedi (yenileyince ${afterReload ? 'görünüyor' : 'de görünmüyor'})`)
  }, p)

  await step('sprint: 15 dk bireysel sprint başlar, katılım sayaca yansır', async () => {
    await p.goto(`${SITE}/sprint/new?duration=15`)
    await p.waitForURL(/\/sprint\/[0-9a-f-]{36}/, { timeout: 15000 })
    await p.waitForLoadState('networkidle')
    const join = p.getByRole('button', { name: /Birlikte Yaz|Şimdiden Katıl/ })
    if (await join.count()) await join.first().click()
    await p.getByText(/Katıldın/).waitFor({ timeout: 10000 })
    await p.getByText(/1 yazar şu an birlikte yazıyor/).waitFor({ timeout: 8000 })
    const part = (await admin.from('sprint_participants').select('user_id').eq('user_id', U.id)).data
    expect(part?.length === 1, 'katılım kaydedilmedi')
    return 'katıldı, sayaç 1 gösteriyor'
  }, p)

  await step('sprint: tarayıcı saati 1 dk geride olsa da yeni sprint "başlıyor"da donmaz', async () => {
    const ctx = await (await launch()).newContext({ storageState: await p.context().storageState(), locale: 'tr-TR' })
    const q = await ctx.newPage()
    await q.clock.install({ time: Date.now() - 60_000 })
    await q.goto(`${SITE}/sprint/new?duration=25`)
    await q.waitForURL(/\/sprint\/[0-9a-f-]{36}/, { timeout: 15000 })
    await q.clock.runFor(3000)
    const body = await q.locator('body').innerText()
    expect(!/tarihinde başlıyor/.test(body), 'sprint "başlıyor" durumunda takıldı')
    await ctx.close()
  }, p)

  await step('hesap silme: ayarlardan, kullanıcı adı yazılarak', async () => {
    await p.goto(`${SITE}/settings`)
    await p.getByRole('button', { name: /Hesabımı Sil/ }).click()
    const del = p.getByRole('button', { name: /Kalıcı Olarak Sil/ })
    expect(await del.isDisabled(), 'kullanıcı adı yazılmadan silme düğmesi aktif')
    await p.getByPlaceholder(U.username).fill(U.username)
    await del.click()
    await p.waitForURL(u => u.pathname === '/', { timeout: 20000 })
    const { data } = await admin.auth.admin.getUserById(U.id)
    expect(!data?.user, 'hesap silinmedi')
    await p.goto(`${SITE}/dashboard`)
    expect(p.url().includes('/login'), 'silinen hesabın oturumu hâlâ açık')
    return 'silindi, oturum kapandı'
  }, p)

  for (const pg of [p, pv]) if (pg.errors?.length) console.log('   konsol hataları:', [...new Set(pg.errors)].slice(0, 3))
} finally {
  await cleanup()
}
