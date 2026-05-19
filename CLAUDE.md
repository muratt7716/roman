@AGENTS.md

# Kalem Birliği — Proje Dokümantasyonu

## Proje Özeti
Yazarlar için işbirlikli hikaye yazma platformu. Turkish-language collaborative storytelling SaaS.

**Canlı URL:** https://writersquad.vercel.app  
**Repository:** https://github.com/muratt7716/roman  
**Stack:** Next.js 16 (App Router) · TypeScript · Tailwind CSS v4 · Supabase · TipTap v3 · shadcn/ui · Framer Motion · Zustand

---

## Kritik Mimari Kararlar

### Next.js 16 Özel Kurallar
- `middleware.ts` **deprecated** — bunun yerine `proxy.ts` kullan (kök dizinde)
- `proxy.ts` içinde fonksiyon adı `proxy` olmalı: `export async function proxy(request: NextRequest)`
- `lib/supabase/session.ts` — Supabase proxy helper (eski adı middleware.ts'di, çakışma yarattı)
- Her server component / layout'ta `export const dynamic = 'force-dynamic'` gerekiyor, aksi halde Next.js cache'ler ve session okunamaz

### Route Grupları
- `app/(public)/` — Herkese açık sayfalar (anasayfa, keşfet, yazarlar, proje okuma). Navbar auth state gösterir.
- `app/(app)/` — Giriş gerektiren sayfalar (dashboard, proje yönetimi, editor). Layout redirect yapar.
- `app/(auth)/` — Login, signup, auth callback sayfaları.
- **ÖNEMLİ:** `(public)` route'larda proje **slug** kullanılır. `(app)` route'larında proje **UUID** kullanılır.

### Supabase Yapılandırması
- **Project Ref:** `dtcwlvoggjxvuwvkjpip`
- **Site URL:** `https://writersquad.vercel.app`
- **Auth Callback:** `https://writersquad.vercel.app/auth/callback`
- **Supabase callback (OAuth):** `https://dtcwlvoggjxvuwvkjpip.supabase.co/auth/v1/callback`
- Email onayı **kapalı** tutulmalı (lokal geliştirme için) ya da Supabase Dashboard > Auth > Email > "Confirm email" toggle'ı

### Veritabanı
- Tek şema dosyası: `supabase/schema.sql` — idempotent (başına DROP IF EXISTS eklenmiş), Supabase SQL Editor'a kopyala-yapıştır ile çalışır
- `handle_new_user` trigger'ı yeni kullanıcılar için otomatik profil oluşturur
- **Kritik:** Trigger kurulmadan önce oluşturulan eski hesaplarda `profiles` satırı **yok** — bu yüzden her auth giriş noktasında `upsert` zorunlu

### Profil Upsert Kuralı — HER AUTH GİRİŞ NOKTASINDA OLMALI
`projects.owner_id → profiles.id` FK bağlantısı nedeniyle profil satırı yoksa her INSERT patlar.
Bu upsert şu dosyaların HEPSİNDE var olmalı:
- `components/auth/LoginForm.tsx` — email login sonrası
- `app/(auth)/auth/callback/route.ts` — OAuth callback sonrası
- `components/auth/SignupForm.tsx` — kayıt sonrası (yalnızca `authData.session` varsa — email onayı kapalıyken session gelir)
- `components/project/ProjectForm.tsx` — proje oluşturmadan önce
- `app/(app)/layout.tsx` — her oturumda fallback olarak
- `app/(public)/layout.tsx` — her oturumda fallback olarak (try/catch içinde)

Upsert pattern:
```typescript
const fallbackUsername = (user.user_metadata?.username ?? user.email?.split('@')[0] ?? 'kullanici')
  .toLowerCase().replace(/[^a-z0-9_]/g, '') + '_' + user.id.slice(0, 4)

await supabase.from('profiles').upsert({
  id: user.id,
  username: fallbackUsername,
  display_name: user.user_metadata?.full_name ?? user.email?.split('@')[0] ?? null,
  avatar_url: user.user_metadata?.avatar_url ?? null,
}, { onConflict: 'id', ignoreDuplicates: true })
```

---

## Bilinen Sorunlar ve Çözümleri

### Profil Yokken 409 Hatası
- **Neden:** `projects.owner_id` → `profiles.id` FK. Profil yoksa INSERT başarısız.
- **Çözüm:** Her auth giriş noktasında `profiles.upsert(..., { ignoreDuplicates: true })` çağrılıyor.

### Navbar Giriş Durumunu Göstermiyor
- **Neden 1:** `(public)` layout'ta `force-dynamic` eksikti — Next.js cache'liyordu.
- **Neden 2:** Profil DB'de yoksa `profile=null` geliyordu, navbar logged-out gösteriyordu.
- **Çözüm:** Her iki layout da DB'ye upsert yapıp gerçek profili kullanıyor.

### Google OAuth "redirect_uri_mismatch"
- Google Cloud Console'da Authorized redirect URIs'e şunlar olmalı:
  - `https://dtcwlvoggjxvuwvkjpip.supabase.co/auth/v1/callback`
  - `https://writersquad.vercel.app/auth/callback`
- Authorized JavaScript Origins:
  - `https://writersquad.vercel.app`
  - `https://dtcwlvoggjxvuwvkjpip.supabase.co`
- Google OAuth test modunda — production için "Publish App" gerekiyor

### RLS Politikaları — Uygulanması Gereken (supabase/schema.sql'de mevcut)

**members_select_member** — Public projelerde üye listesi görünür olsun:
```sql
CREATE POLICY "members_select_member" ON project_members FOR SELECT USING (
  is_project_owner(project_id) OR is_project_member(project_id)
  OR EXISTS (SELECT 1 FROM projects WHERE id = project_id AND visibility IN ('open', 'closed', 'published'))
);
```

**members_insert_owner** — Davet kabul eden kullanıcı kendini ekleyebilsin:
```sql
CREATE POLICY "members_insert_owner" ON project_members FOR INSERT WITH CHECK (
  is_project_owner(project_id) OR (
    user_id = auth.uid() AND EXISTS (
      SELECT 1 FROM project_invites
      WHERE project_invites.project_id = project_members.project_id
        AND project_invites.invitee_id = auth.uid()
        AND project_invites.status = 'pending'
    )
  )
);
```
> Bu politikaları uygulamak için: Supabase Dashboard > SQL Editor > schema.sql'i çalıştır

### Server Action'larda revalidatePath Zorunlu
- Server action içinde DB güncellendikten sonra `revalidatePath(...)` çağrılmazsa sayfa değişmez
- Kullanıcı butona bastı ama görsel hiçbir şey olmadı diye şikayet eder — önce bunu kontrol et
- Etkilenen dosya örneği: `app/(app)/projects/[slug]/overview/page.tsx` — updateApplication, publishProject

### Versiyon Şişmesi (TipTap Editor)
- Autosave debounce: **30 saniye** (eski 2s'ti)
- Yeni version sadece `wordDiff >= 20` VEYA ilk kayıt ise oluşturuluyor
- `lastVersionWordCount` ref ile takip ediliyor

### Word Count Şişmesi (Overview Sayfası)
- Tüm version'ların word count'u toplandığında şişiyor — her bölümün **en son versiyonu** alınmalı
- `latestPerChapter` Map ile chapter başına tek entry

### .glass CSS Sınıfı Border Çakışması
- `.glass` sınıfı `border: 1px solid rgb(255 255 255 / 0.08)` ile kendi border'ını getiriyor
- Tailwind `border-*` veya `hover:border-*` ile çakışır, hover state görünmez
- **Çözüm:** Border yerine `ring-*` ve `hover:ring-*` kullan
- Örnek: `MemberHoverCard.tsx` → `ring-1 ring-primary/40` ve `hover:ring-1 hover:ring-white/15`

### Bildirim Link'i Çalışmıyor (comment tipi)
- Comment notification payload'ında `project_id` **mutlaka** olmalı, yoksa link oluşturulamaz
- `CommentPanel.tsx`'te bildirim insert'inde `project_id: projectId` eklendi
- `ChapterEditorClient.tsx`'ten `projectId` prop olarak geçiliyor

---

## Dosya Yapısı — Kritik Dosyalar

```
proxy.ts                              # Next.js 16 proxy (session refresh + route koruma)
lib/supabase/
  client.ts                           # Browser client (createBrowserClient)
  server.ts                           # Server client (createServerClient + cookies)
  session.ts                          # updateSession fonksiyonu (proxy tarafından çağrılır)
lib/validations/
  project.ts                          # Zod şemaları — synopsis max 1000 karakter
  auth.ts                             # Auth zod şemaları
app/(auth)/auth/callback/route.ts     # OAuth callback — profil upsert burada
app/(app)/
  layout.tsx                          # Auth guard + profil upsert fallback
  dashboard/page.tsx                  # Dashboard
  notifications/page.tsx              # Bildirimler — tüm tipler linklendi
  projects/[slug]/
    overview/page.tsx                 # Proje yönetim paneli (server actions içinde)
    write/page.tsx                    # Bölüm listesi
    write/[chapterId]/page.tsx        # Editör sayfası — isOwner, memberIds aktarır
app/(public)/
  layout.tsx                          # Public layout + profil upsert fallback (try/catch)
components/auth/
  LoginForm.tsx                       # Email login — profil upsert burada
  SignupForm.tsx                      # Email signup — session varsa profil upsert
components/editor/
  TipTapEditor.tsx                    # Ana editör — autosave 30s, versioning (>=20 kelime fark)
  ChapterEditorClient.tsx             # Editör wrapper — responsive, mobil comment toggle
  CommentPanel.tsx                    # Yorum paneli — proje sahibi silebilir, projectId payload'da
  PresenceBar.tsx                     # Realtime presence bar
  VersionHistoryClient.tsx            # Versiyon geçmişi modal
components/project/
  ProjectForm.tsx                     # Proje oluşturma (3 adımlı) — profil upsert içinde
  ProjectCard.tsx                     # Proje kartı — /projects/${slug} (public) adresine link
  MemberHoverCard.tsx                 # Hover'da profil popup açan ekip üyesi kartı (client)
  DeleteProjectButton.tsx             # Proje silme butonu (client)
  CoverImageUpload.tsx                # Kapak görseli yükleme
  RoleForm.tsx                        # Ekip rolü oluşturma formu
supabase/schema.sql                   # Tek SQL dosyası — tüm şema + RLS politikaları
```

---

## Ekip Rolleri Sistemi

Platformdaki roller:
- **Baş Yazar** — Proje sahibi. Tüm yetkilere sahip.
- **Editör** — Bölümlere yorum ve öneri yapabilir.
- **Diyalog Yazarı**, **Dünya İnşacısı**, **Lore Uzmanı**, **Karakter Tasarımcısı**, **Aksiyon Sahnesi Yazarı** — Öneri ve yorum yapabilir.

Rol ataması: `project_roles` tablosu → `project_members.role_id` FK ile üyeye bağlı.

Proje sahibi overview sayfasında üye rolünü görür. Rol adı yoksa "Baş Yazar" (owner) veya "Üye" (diğerleri) fallback gösterilir.

---

## Yazı Odası Mimarisi

```
ChapterEditorPage (server)
  └── ChapterEditorClient (client)
        ├── TipTapEditor           — Ana editör alanı
        ├── PresenceBar            — Realtime online üyeler
        └── CommentPanel           — Desktop: sağda sabit | Mobil: overlay drawer (toggle butonu)
```

- Mobil'de başlık çubuğundaki `💬` butonuyla yorum paneli overlay olarak açılır
- `isOwner` prop'u chapter sayfasından gelir, yorum silme yetkisi için kullanılır
- `projectId` editör sayfasından → `ChapterEditorClient` → `CommentPanel`'e aktarılır (bildirim için)

---

## Bildirim Sistemi

Desteklenen tipler ve linkleri:

| Tip | Başlık | Link |
|-----|--------|------|
| `application` | Yeni başvuru | `/projects/${project_id}/overview` |
| `acceptance` | Başvuru kabul | `/projects/${project_id}/overview` |
| `rejection` | Başvuru red | `/projects/${project_id}/overview` |
| `comment` | Yeni yorum | `/projects/${project_id}/write/${chapter_id}` |
| `mention` | Bahsedildin | `/projects/${project_id}/write/${chapter_id}` |
| `invite` | Davet | Buton (InviteActions) |
| `suggestion` | Yeni öneri | `/projects/${project_id}/write/${chapter_id}/suggestions-list` |

**Önemli:** Comment payload'ında `project_id` **zorunlu**, yoksa link oluşturulamaz.

Tüm bildirim kartı tıklanabilir (overlay link tekniği, `relative` + `absolute inset-0` Link).
Davet kartlarında InviteActions butonları `z-10` ile üstte durur.

---

## Geliştirme Ortamı

```bash
npm run dev          # Lokal geliştirme
rm -r -fo .next      # Cache temizle (PowerShell — && çalışmaz)
```

- PowerShell'de `&&` çalışmıyor, komutları ayrı ayrı çalıştır
- Lokal'den Google OAuth test etmek için Supabase Redirect URLs'e `http://localhost:3000/*` ekli
- `.playwright-mcp/` ve `dev.log` .gitignore'da — commit'lenmesin

---

## Kullanıcı Notları
- Test hesabı: `mmuratb77@gmail.com` — profil upsert fix sonrası normal çalışıyor
- Google OAuth şu an "test" modunda — sadece Google Cloud Console'daki test kullanıcıları giriş yapabilir
- Schema'yı Supabase'e uygulamak için: Dashboard > SQL Editor > `supabase/schema.sql` içeriğini yapıştır > Run

---

## Eğlence & Verimlilik Özellikleri

### Pomodoro Timer (`components/editor/PomodoroTimer.tsx`)
- Editör başlık çubuğunda, sm+ ekranlarda görünür
- 25 dk odak / 5 dk mola döngüsü
- Tarayıcı `Notification` API ile sesli/görsel uyarı (kullanıcı izin verirse)
- `phaseRef` + `sessionsRef` ile ref tabanlı phase takibi (stale closure sorununu önler)

### Lofi Müzik Widget (`components/MusicWidget.tsx`)
- `app/(app)/layout.tsx`'e entegre — tüm app sayfalarında görünür (sağ alt köşe)
- 4 istasyon: Groove Salad, Drone Zone, Deep Space One, Lush (SomaFM)
- `new Audio(url)` ile doğrudan MP3 stream — YouTube iframe değil (tarayıcı autoplay bloğu nedeniyle değiştirildi)
- Widget kapatılsa ses çalmaya devam eder (Audio nesnesi React state'te kalır)

### Streak & Oturum Kelimesi (`hooks/useStreak.ts` + `PresenceBar.tsx`)
- `useStreak(hasWrittenToday: boolean)` hook'u: localStorage tabanlı, sıfır maliyet
- `{ streak, best, lastDate }` saklar; ardışık günleri otomatik sayar
- PresenceBar'da: toplam kelime + `+N bu oturumda` + 🔥 streak sayısı
- `initialWordCount` prop'u ChapterEditorClient'tan PresenceBar'a geçirilir

### Kelime Oyunu (`app/(app)/oyun/page.tsx` + `components/games/WordleGame.tsx`)
- Wordle tarzı 5 harfli Türkçe kelime tahmin oyunu
- 6 deneme hakkı, renk kodlu tahminler (yeşil=doğru, sarı=yerde var, gri=yok)
- Her gün `getDailyWord()` ile WORDS dizisinden deterministik kelime seçilir
- Türkçe klavye (Ğ, Ü, Ş, İ, Ö, Ç dahil)
- Navbar dropdown menüsünde "Kelime Oyunu" linki

### Gemini Free Tier (`/api/ai/suggest` + `/api/ai/character`)
- `GEMINI_API_KEY` `.env.local`'da — client'a kesinlikle açılmaz, sadece server route'larda kullanılır
- Model: `gemini-1.5-flash` (günde 1500 istek ücretsiz, kart gerektirmez)
- **Tıkandım? butonu** — TipTap toolbar sağında ⚡, son 5 paragrafı + bölüm başlığını gönderir, 3 yön + 2 cümle başlangıcı döner
- **Karakter Derinleştir** — `/jenerator` sayfasında, üretilen profili analiz eder, dramatik potansiyel + ses + ilk sahne önerir
- **Rate limit:** localStorage günde 5 kullanım per feature (`kb_ai_suggest_uses`, `kb_ai_char_uses`)
- API key yoksa route sessizce `{ suggestion: null }` döner — uygulama çökmez

### Karakter Jeneratörü (`/jenerator` + `components/CharacterGenerator.tsx`)
- Sıfır maliyet: `lib/characterData.ts` içindeki Türkçe veri listeleriyle `Math.random()` tabanlı üretim
- Her alan (kişilik, görünüş, geçmiş, motivasyon, kusur) üzerinde hover → 🔀 ile tek tek yenilenebilir
- "Kopyala" → Markdown formatında panoya
- "Derinleştir" → Gemini API (günde 5 limit)
- Navbar dropdown → "Karakter Jeneratörü"

### Fikir Odası (`/fikir-odasi`) — TASARLANDI, HENÜZ IMPLEMENT EDİLMEDİ
Tasarım kararları:
- **Thread-per-idea modeli**: her kullanıcı bir "tohum fikir" atar (başlık + kısa açıklama)
- Diğerleri o thread'e realtime mesaj atar — Supabase Realtime subscription
- Fikir sahibi "Ekibe katılmak ister misiniz?" butonu açar (`status: 'team_forming'`)
- İlgilenenler join request gönderir, fikir sahibi kabul/reddeder
- Opsiyonel proje bağlantısı: fikir → mevcut projeye link

Veritabanı tabloları (schema.sql'e eklendi):
- `idea_threads`: id, user_id, title, seed(500 char), status(active/team_forming/closed), project_id(nullable), created_at
- `idea_messages`: id, thread_id, user_id, content(1000 char), created_at
- `idea_join_requests`: id, thread_id, user_id, status(pending/accepted/rejected), UNIQUE(thread_id, user_id)

RLS: Herkese okuma açık, yazma sadece giriş yapanlara, silme sadece kendi kaydına

---

## Henüz Uygulanmamış / Bekleyen

- **RLS politikaları Supabase'de aktif değil** — `supabase/schema.sql`'deki güncel politikalar (members_select_member, members_insert_owner) Supabase Dashboard'da SQL Editor'dan çalıştırılmalı
- Davet akışı tam test edilmedi (roles gerektiriyor)
