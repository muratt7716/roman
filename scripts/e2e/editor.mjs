// Editör kayıt davranışı — küçük düzeltmeler kalıcı mı?
import { SITE, admin, must, mkUser, loginPage, step, expect, cleanup, tag } from './lib.mjs'

const WAIT = Number(process.env.SAVE_WAIT ?? 35000)
const O = await mkUser('eo', 'Editör Testi')
try {
  const p = must(await admin.from('projects').insert({ owner_id: O.id, title: 'Kayıt', slug: 'kayit-' + tag }).select('id').single())
  const ch = must(await admin.from('chapters').insert({ project_id: p.id, title: 'B1', order_index: 0, created_by: O.id }).select('id').single())
  const page = await loginPage(O)
  const url = `${SITE}/projects/${p.id}/write/${ch.id}`
  const latest = async () => (await admin.from('chapter_versions').select('content').eq('chapter_id', ch.id).order('created_at', { ascending: false }).limit(1).maybeSingle()).data?.content ?? ''

  await step('editör açılır, 25 kelime yazılır, kaydedilir', async () => {
    await page.goto(url)
    const ed = page.locator('.ProseMirror')
    await ed.click()
    await page.keyboard.type('bir iki üç dört beş altı yedi sekiz dokuz on on bir on iki on üç on dört on beş on altı on yedi. ')
    await page.waitForTimeout(WAIT)
    const c = await latest()
    expect(c.includes('on yedi'), 'ilk kayıt yok: ' + c.slice(0, 80))
    return `${(await admin.from('chapter_versions').select('id').eq('chapter_id', ch.id)).data.length} versiyon`
  })

  await step('küçük düzeltme (3 kelime) kaydedilir ve yenilemeden sonra durur', async () => {
    await page.keyboard.type('Küçük bir düzeltme.')
    await page.waitForTimeout(WAIT)
    const status = await page.locator('text=/Kaydedildi|Kaydediliyor|Hata/').first().textContent().catch(() => '')
    await page.reload()
    await page.locator('.ProseMirror').waitFor()
    const text = await page.locator('.ProseMirror').innerText()
    expect(text.includes('Küçük bir düzeltme'), `yenileyince KAYBOLDU (ekranda "${status}" yazıyordu)`)
  })

  await step('hiçbir şey değiştirmeden çıkınca uyarı ÇIKMAZ', async () => {
    const p2 = await page.context().newPage()
    await p2.goto(url)
    await p2.locator('.ProseMirror').waitFor()
    await p2.waitForTimeout(1500)
    let dialog = false
    p2.once('dialog', d => { dialog = true; d.dismiss() })
    await p2.close({ runBeforeUnload: true })
    await new Promise(r => setTimeout(r, 1000))
    expect(!dialog, 'değişiklik yokken uyarı çıktı')
  })

  await step('kaydetmeden sekmeyi kapatma girişiminde uyarı çıkar', async () => {
    await page.locator('.ProseMirror').click()
    await page.keyboard.press('End')
    await page.keyboard.type(' Kapatmadan önce.')
    let dialog = false
    page.once('dialog', d => { dialog = d.type() === 'beforeunload'; d.dismiss() })
    await page.close({ runBeforeUnload: true })
    await new Promise(r => setTimeout(r, 1500))
    expect(dialog, 'uyarı yok — yazılanlar sessizce kaybolur')
  })
} finally {
  await cleanup()
}
