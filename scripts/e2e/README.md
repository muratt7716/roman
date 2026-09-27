# Uçtan uca testler (gerçek tarayıcı, gerçek veritabanı)

Birim testlerin göremediği hataları yakalamak için yazıldı. Hepsi 27 Eyl 2026'da
canlıda gerçek hata buldu: editörün küçük düzeltmeleri kaybetmesi, teslimde son
cümlelerin düşmesi, masaüstünde hiç açılmayan geri bildirim menüsü, yazanın kendi
yorumunu görememesi, yalnızca Vercel'de çöken okuma sayfası.

**Dikkat:** Her betik canlı Supabase'de geçici `@mailinator.com` hesapları açar ve
bitince siler (`kalan profil: 0` satırını kontrol et). `.env.local`'daki
`SUPABASE_SERVICE_ROLE_KEY` gerekir.

| Betik | Ne sınar |
|---|---|
| `editor.mjs` | Yaz → bekle → yenile: küçük düzeltme kalıcı mı; kapatırken uyarı |
| `collab.mjs` | Başvuru/kabul, yorum, davet/kabul, alkış/takip, bildirimler |
| `academy-ui.mjs` | Sınıf aç, şifreyle katıl, ödev ver, yaz + hemen teslim et, notla |
| `misc.mjs` | Ayarlar, geri bildirim, fikir odası (anlık), sprint, hesap silme |
| `crawl.mjs` + `summary.mjs` | Tüm sayfalar × mobil/masaüstü × roller: HTTP, JS hatası, taşma, kırık link |

```powershell
npm i                                   # playwright-core devDependency
$env:CHROME_PATH = "$env:LOCALAPPDATA\ms-playwright\chromium-1234\chrome-win64\chrome.exe"
$env:SITE = 'http://localhost:3000'     # varsayılan: https://writersquad.vercel.app
node scripts/e2e/editor.mjs
node scripts/e2e/crawl.mjs; node scripts/e2e/summary.mjs
```

Tarayıcı yoksa: `npx playwright-core install chromium`, sonra `CHROME_PATH`'i ona göster.
Başarısız adımın ekran görüntüsü `scripts/e2e/out/fail-N.png`.
