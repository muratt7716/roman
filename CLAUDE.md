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

### DropdownMenuTrigger `asChild` Prop Yok
- Bu projenin shadcn/ui versiyonunda `DropdownMenuTrigger` **`asChild` prop desteklemiyor**
- `MenuPrimitive.Trigger.Props` tipinde `asChild` yok — TypeScript build hatası verir
- **Çözüm:** `asChild` kullanma, `Button` componentini `DropdownMenuTrigger` içine sarma
- Bunun yerine `DropdownMenuTrigger`'a doğrudan `className` ver: `<DropdownMenuTrigger className="flex items-center ...">`
- Örnek: `ReadingListButton.tsx` — `Button` yerine styled `DropdownMenuTrigger`

### Bildirim Link'i Çalışmıyor (comment tipi)
- Comment notification payload'ında `project_id` **mutlaka** olmalı, yoksa link oluşturulamaz
- `CommentPanel.tsx`'te bildirim insert'inde `project_id: projectId` eklendi
- `ChapterEditorClient.tsx`'ten `projectId` prop olarak geçiliyor

---

## Dosya Yapısı — Kritik Dosyalar

```
proxy.ts                              # Next.js 16 proxy (session refresh + route koruma)
app/layout.tsx                        # ROOT layout — MusicWidget buraya entegre (tüm sayfalarda görünür)
lib/supabase/
  client.ts                           # Browser client (createBrowserClient)
  server.ts                           # Server client (createServerClient + cookies)
  session.ts                          # updateSession fonksiyonu (proxy tarafından çağrılır)
lib/validations/
  project.ts                          # Zod şemaları — synopsis max 1000 karakter
  auth.ts                             # Auth zod şemaları
lib/gemini.ts                         # generateWithFallback() — çok model retry (RPD öncelikli)
lib/characterData.ts                  # Türkçe karakter üretimi için veri listeleri
hooks/useStreak.ts                    # localStorage streak takibi (zero cost)
app/(auth)/auth/callback/route.ts     # OAuth callback — profil upsert burada
app/(app)/
  layout.tsx                          # Auth guard + profil upsert fallback
  dashboard/page.tsx                  # Dashboard
  notifications/page.tsx              # Bildirimler — tüm tipler linklendi
  oyun/page.tsx                       # Türkçe Wordle kelime oyunu
  jenerator/page.tsx                  # Karakter jeneratörü sayfası
  fikir-odasi/page.tsx                # Fikir Odası — thread listesi
  fikir-odasi/[id]/page.tsx           # Fikir thread detayı
  projects/[slug]/
    overview/page.tsx                 # Proje yönetim paneli (server actions içinde)
    write/page.tsx                    # Bölüm listesi
    write/[chapterId]/page.tsx        # Editör sayfası — isOwner, memberIds aktarır
app/(public)/
  layout.tsx                          # Public layout + profil upsert fallback (try/catch)
  page.tsx                            # Anasayfa — stats grid-cols-2 mobilde, footer pb-24
app/api/ai/
  suggest/route.ts                    # AI yazma önerisi — generateWithFallback kullanır
  character/route.ts                  # AI karakter derinleştirme — generateWithFallback kullanır
components/auth/
  LoginForm.tsx                       # Email login — profil upsert burada
  SignupForm.tsx                      # Email signup — session varsa profil upsert
components/editor/
  TipTapEditor.tsx                    # Ana editör — autosave 30s, versioning (>=20 kelime fark), AI butonu
  ChapterEditorClient.tsx             # Editör wrapper — responsive, mobil comment toggle
  CommentPanel.tsx                    # Yorum paneli — proje sahibi silebilir, projectId payload'da
  PresenceBar.tsx                     # Realtime presence bar — streak + oturum kelimesi
  VersionHistoryClient.tsx            # Versiyon geçmişi modal
  PomodoroTimer.tsx                   # 25/5 dk pomodoro, browser notification
components/project/
  ProjectForm.tsx                     # Proje oluşturma (3 adımlı) — profil upsert içinde
  ProjectCard.tsx                     # Proje kartı — /projects/${slug} (public) adresine link
  MemberHoverCard.tsx                 # Hover'da profil popup açan ekip üyesi kartı (client)
  DeleteProjectButton.tsx             # Proje silme butonu (client)
  CoverImageUpload.tsx                # Kapak görseli yükleme
  RoleForm.tsx                        # Ekip rolü oluşturma formu
components/
  MusicWidget.tsx                     # SomaFM lofi widget — root layout'ta, fixed bottom-6 right-6
  CharacterGenerator.tsx              # Per-field shuffle, Gemini derinleştirme, markdown kopyala
components/games/
  WordleGame.tsx                      # Türkçe Wordle — [...str].length ile doğru Unicode sayımı
components/idea/
  NewIdeaForm.tsx                     # Yeni fikir modal formu
  IdeaRoomClient.tsx                  # Realtime mesajlaşma + join request yönetimi
components/reader/
  ViewTracker.tsx                     # Bölüm görüntülenme sayacı — useEffect + rpc('increment_chapter_view')
  ReactionBar.tsx                     # 3 alkış butonu (🔥💧⚡) — optimistic UI, /api/reactions
  ReadingListButton.tsx               # Okuma listesi dropdown (Sonra Oku/Okuyorum/Bitirdim)
  FollowButton.tsx                    # Yazar takip/bırak toggle — /api/follows
components/
  FeedbackModal.tsx                   # Geri bildirim modal — controlled (open/onClose), 4 tip
app/(app)/admin/
  layout.tsx                          # Email guard (notFound() for non-admin) + üst nav bar
  page.tsx                            # 6 istatistik kartı + son 5 feedback
  users/page.tsx                      # Tüm kullanıcılar tablosu
  projects/page.tsx                   # Tüm projeler tablosu
  feedback/page.tsx                   # Feedback inbox — durum filtreleme, status cycle (client)
app/api/
  reactions/route.ts                  # GET ?chapter_id= → counts+userReactions | POST toggle
  reading-list/route.ts               # POST upsert | DELETE ?project_id=
  follows/route.ts                    # POST toggle follow/unfollow
  feedback/route.ts                   # POST feedback insert (auth guard)
  writing-goal/route.ts               # GET (hedef+ilerleme+streak) | POST (hedef güncelle)
  badges/check/route.ts               # POST tüm rozet koşullarını kontrol et
  editorial-picks/route.ts            # GET editöryal seçki skoru (reactions×3+bookmarks×2+views×1)
lib/badges.ts                         # BADGE_META + awardBadge + checkAllBadges
types/index.ts                        # ReactionType, ReadingListStatus, BadgeCode, WeeklyStats, EditorialPick...
supabase/schema.sql                   # Tek SQL dosyası — tüm şema + RLS + idea + faz1 + faz2 tabloları
components/dashboard/
  WritingGoalCard.tsx                 # Client: günlük hedef progress + streak + inline edit
  WeeklyStatsRow.tsx                  # 4 metrik kartı (bu hafta)
  BadgesRow.tsx                       # Kazanılan rozet satırı (badge.length === 0 ise gizli)
components/profile/
  BadgesGrid.tsx                      # Tüm 8 rozet grid (kazanılmış + gri/soluk)
components/home/
  EditorialPicksSection.tsx           # Client: editorial picks fetch + 3 proje kartı
docs/superpowers/plans/
  2026-05-21-phase1-reader-engagement.md  # Faz 1 implementasyon planı (13 görev)
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

## Okuyucu Sayfası Mimarisi (Faz 1)

```
/projects/[slug]/read/page.tsx (server)         — proje kapağı, yazar profili, bölüm listesi
  ├── ReadingListButton (client)                 — okuma listesi dropdown
  └── FollowButton (client)                      — yazar takip/bırak

/projects/[slug]/read/[chapterId]/page.tsx (server)
  ├── ViewTracker (client)                       — sayfa yüklenince view count +1 (useEffect, bir kez)
  └── ReactionBar (client)                       — alkış butonları (🔥💧⚡)
```

- `ViewTracker` render edilir edilmez `rpc('increment_chapter_view')` çağırır — `useRef(tracked)` ile çift çağrı önlenir
- `increment_chapter_view` SECURITY DEFINER function: sadece `status='final'` + `visibility='published'` chapter'lara increment
- `ReactionBar` optimistic UI: butona basınca sayı hemen güncellenir, POST /api/reactions sonucu confirm/revert
- `ReadingListButton` + `FollowButton` — sadece giriş yapmış kullanıcılara gösterilir (server component null check)
- `notify_chapter_followers` DB trigger: chapter `status → 'final'` olduğunda `follows` tablosundan takipçileri bulur, her birine `new_chapter` bildirimi insert eder

### Faz 1 Yeni DB Tabloları

| Tablo | Amaç | Kritik Constraint |
|-------|------|-------------------|
| `chapter_reactions` | Bölüm alkışları | `UNIQUE(chapter_id, user_id, reaction)` — bir kullanıcı aynı reaksiyonu bir kez |
| `reading_lists` | Okuma listesi durumu | `UNIQUE(user_id, project_id)` — UPSERT ile güncellenir |
| `follows` | Yazar takip | `PRIMARY KEY(follower_id, following_id)` + `CHECK(follower_id != following_id)` |

```sql
-- Kontrol: chapter view count column
ALTER TABLE chapters ADD COLUMN IF NOT EXISTS view_count int NOT NULL DEFAULT 0;

-- İndeksler (performans)
CREATE INDEX IF NOT EXISTS idx_follows_following ON follows(following_id);
CREATE INDEX IF NOT EXISTS idx_reading_lists_project ON reading_lists(project_id);
```

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
| `new_chapter` | Yeni bölüm yayınlandı | `/projects/${project_slug}/read/${chapter_id}` |
| `new_follower` | Yeni takipçi | `/u/${follower_username}` |

**Önemli:** Comment payload'ında `project_id` **zorunlu**, yoksa link oluşturulamaz.
**new_chapter payload:** `chapter_id`, `chapter_title`, `project_id`, `project_title`, `project_slug`, `author_id`
**new_follower payload:** `follower_id`, `follower_display_name`, `follower_username`

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
- `app/layout.tsx` (ROOT layout)'a entegre — **tüm sayfalarda** görünür, hem public hem app (sağ alt köşe)
- Eskiden `app/(app)/layout.tsx`'teydi, public sayfalarda görünmüyordu — root'a taşındı
- 4 istasyon: Groove Salad, Drone Zone, Deep Space One, Lush (SomaFM)
- `new Audio(url)` ile doğrudan MP3 stream — YouTube iframe değil (tarayıcı autoplay bloğu nedeniyle değiştirildi)
- Widget kapatılsa ses çalmaya devam eder (Audio nesnesi React state'te kalır)
- Pozisyon: `fixed bottom-6 right-6 z-50` — sayfa içeriği ile çakışmaması için footer'a `pb-24 sm:pb-12` eklendi

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
- **Model sistemi:** `lib/gemini.ts` → `generateWithFallback(prompt)` fonksiyonu — tüm AI route'ları bunu kullanır
- Fallback sırası (RPD'ye göre, yüksekten düşüğe):
  1. `gemini-3.1-flash-lite` — 500 RPD (öncelikli)
  2. `gemini-2.5-flash-lite` — 20 RPD
  3. `gemini-2.5-flash` — 20 RPD
  4. `gemini-3.5-flash` — 20 RPD
  5. `gemini-3-flash` — 20 RPD
- Bir model rate limit veya hata verirse otomatik sonraki modele geçer, null dönerse tüm modeller başarısız
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

### Admin Paneli (`/admin`) — IMPLEMENT EDİLDİ ✅
- Sadece `mmuratb77@gmail.com` erişebilir — `app/(app)/admin/layout.tsx`'te server-side `notFound()` guard
- `isAdmin` boolean'ı `app/(app)/layout.tsx` ve `app/(public)/layout.tsx`'te `user.email` karşılaştırmasıyla hesaplanıp Navbar'a prop olarak geçilir
- Navbar dropdown'da "Admin Paneli" linki (amber renk, ShieldCheck icon) — sadece `isAdmin=true` iken görünür
- Admin nav: Genel Bakış / Kullanıcılar / Projeler / Geri Bildirim sekmeleri

Sayfalar:
- `app/(app)/admin/layout.tsx` — email guard + üst nav bar
- `app/(app)/admin/page.tsx` — 6 istatistik kartı (kullanıcı, 7 günde yeni, proje, bölüm, bildirim toplam/okunmamış) + son 5 feedback
- `app/(app)/admin/users/page.tsx` — tüm kullanıcılar tablosu (isim, kullanıcı adı, durum, puan, katılım tarihi)
- `app/(app)/admin/projects/page.tsx` — tüm projeler tablosu (başlık, sahibi, görünürlük, üye sayısı)
- `app/(app)/admin/feedback/page.tsx` — feedback inbox, durum filtresi, tıklayarak new→reviewed→done döngüsü (client component, Supabase browser client)

### Geri Bildirim Sistemi — IMPLEMENT EDİLDİ ✅
- `feedback` tablosu: `supabase/schema.sql`'e eklendi — Supabase Dashboard'da çalıştırılması gerekiyor
- `components/FeedbackModal.tsx` — controlled (`open/onClose` props), 4 tip (bug/öneri/özellik/diğer), min 20 karakter
- `app/api/feedback/route.ts` — auth guard, validasyon, DB insert
- Navbar dropdown'da "Geri Bildirim Gönder" linki → modal açar
- Modal Navbar içinde `feedbackOpen` state ile yönetilir, dropdown dışında render edilir (dropdown kapanınca state kaybolmaması için)
- DropdownMenuItem'da `onSelect={e => { e.preventDefault(); setFeedbackOpen(true) }}` — dropdown kapanmadan önce state set edilir

### Fikir Odası (`/fikir-odasi`) — IMPLEMENT EDİLDİ ✅
- **Thread-per-idea modeli**: her kullanıcı bir "tohum fikir" atar (başlık + kısa açıklama)
- Diğerleri o thread'e realtime mesaj atar — Supabase Realtime subscription
- Fikir sahibi "Ekibe katılmak ister misiniz?" butonu açar (`status: 'team_forming'`)
- İlgilenenler join request gönderir, fikir sahibi kabul/reddeder
- Opsiyonel proje bağlantısı: fikir → mevcut projeye link
- Navbar dropdown'da "Fikir Odası" linki (Lightbulb/amber icon)

Sayfalar:
- `app/(app)/fikir-odasi/page.tsx` — aktif/team_forming thread listesi + NewIdeaForm modal
- `app/(app)/fikir-odasi/[id]/page.tsx` — thread detayı, IdeaRoomClient render eder

Componentler:
- `components/idea/NewIdeaForm.tsx` — başlık (5-100) + seed (10-500) modal formu
- `components/idea/IdeaRoomClient.tsx` — realtime mesajlaşma, join request yönetimi, owner kontrolleri

Veritabanı tabloları (schema.sql'de mevcut — Supabase'e uygulanması gerekiyor):
- `idea_threads`: id, user_id, title, seed(500 char), status(active/team_forming/closed), project_id(nullable), created_at
- `idea_messages`: id, thread_id, user_id, content(1000 char), created_at
- `idea_join_requests`: id, thread_id, user_id, status(pending/accepted/rejected), UNIQUE(thread_id, user_id)

RLS: Herkese okuma açık, yazma sadece giriş yapanlara, silme sadece kendi kaydına

---

### Faz 1 — Okuyucu Bağı (`/projects/[slug]/read/...`) — IMPLEMENT EDİLDİ ✅
- **View counter:** Bölüm okunduğunda `view_count` artırılır — SECURITY DEFINER guard ile
- **3 Reaksiyon (alkış):** 🔥 Ateş, 💧 Damla, ⚡ Şimşek — toggle sistemi, bir reaksiyon birden fazla kez verilmez
- **Okuma Listesi:** Sonra Oku / Okuyorum / Bitirdim — dropdown, project bazında, UPSERT
- **Yazar Takip:** Takip et / Bırak toggle — follower count gösterilir (> 0 ise)
- **Yeni bölüm bildirimi:** `notify_chapter_followers` DB trigger — chapter finalize edilince takipçilere otomatik bildirim
- **Yeni takipçi bildirimi:** Follow API'da insert — `/api/follows` yeni takipçi eklenince bildirim gönderir
- **Editöryal seçki algoritması:** `reads×1 + reactions×3 + comments×2 + bookmarks×2` — son 7 gün, min 10 unique reader (henüz UI'da gösterilmiyor — ileride keşfet sayfasında)

---

## Platform Faz Yol Haritası

| Faz | Ad | Durum | İçerik |
|-----|-----|-------|--------|
| **Faz 1** | Okuyucu Bağı | ✅ Tamamlandı | View counter, 3 reaksiyon, okuma listesi, yazar takibi, yeni bölüm bildirimi |
| **Faz 2** | Yazar Motivasyonu | ✅ Tamamlandı | Günlük yazı hedefi + server streak, 8 rozet sistemi, haftalık istatistik, editöryal seçki UI |
| **Faz 3** | Okul Modülü | ⏳ Gelecek | Öğretmen-öğrenci arayüzü, sınıf yönetimi, görev atama, güvenli ortam |
| **Faz 4** | Sosyal & Büyüme | ⏳ Gelecek | Profil sayfaları, kullanıcı keşfet, yorum thread'leri, onboarding akışı |

**Editöryal Seçki Algoritması (Faz 2'de implement edildi):**
- Skor = `reactions×3 + reading_list_adds×2 + views×1`
- Pencere: son 7 gün, sadece `visibility='published'` projeler
- Top 3 proje, anasayfada "Bu Hafta Öne Çıkanlar" olarak gösterilir
- Seçkiye giren proje sahibine otomatik `editorial_pick` rozeti verilir

---

## Mobil / Responsive Düzeltmeler

### Anasayfa (`app/(public)/page.tsx`) — Uygulanmış Kurallar
- **Stats grid:** `grid-cols-2 lg:grid-cols-4` — mobilde 2×2, desktop'ta 4 kolon. `grid-cols-1` KULLANMA, aşırı scroll olur.
- **Stats kartları:** Mobilde `p-4 sm:p-6`, büyük sayılar `text-2xl sm:text-3xl md:text-4xl`. Açıklama metni mobilde `hidden sm:block`.
- **Yazar kartı badge:** `shrink-0 whitespace-nowrap` zorunlu — yoksa "İşbirliğine Açık" gibi uzun metinler kesilir.
- **Footer alt boşluk:** `pb-24 sm:pb-12` — müzik widget'ı (`fixed bottom-6 right-6`) email input butonunu kapamaması için.
- **Hero butonları:** Her ikisi de `w-full sm:w-auto` — mobilde tam genişlik, desktop'ta otomatik.
- **Features grid:** `grid-cols-1 md:grid-cols-2 lg:grid-cols-3` — mobilde 1 kolon yeterli (içerik zengin).

### Genel Mobil Kurallar
- Floating fixed elementler (MusicWidget, toast vs.) → içerik üzerlerine binmemesi için ilgili section'a `pb-16` veya `pb-24` ekle
- Badge / tag elementleri → her zaman `shrink-0 whitespace-nowrap` ekle (flex container içindeyse sıkışır)
- Stat/sayı kartları → mobilde `grid-cols-2` en az, tek kolon asla
- JSX'te aynı attribute iki kez yazma (`aria-hidden` gibi) → TypeScript build'i kırar

---

## Görsel Test Metodolojisi

Playwright MCP ile visual test adımları:
1. `browser_resize(1440, 900)` → desktop
2. `browser_navigate(url)` → sayfaya git
3. `browser_take_screenshot(fullPage: true)` → tam sayfa
4. `browser_resize(390, 844)` → iPhone 14 boyutu
5. Her section için `scrollTo(0, Y)` + screenshot
6. `document.documentElement.scrollWidth > clientWidth` → yatay overflow kontrolü
7. `document.querySelectorAll('[class*="grid-cols"]')` → grid class'larını doğrula

Screenshot dosyaları `./desktop-*.png`, `./mobile-*.png` olarak kaydedilir.
`.playwright-mcp/` klasörü .gitignore'da — commit'lenmesin.

---

## Henüz Uygulanmamış / Bekleyen

### Supabase'e Schema Uygulanmalı (KRİTİK)
Kod hazır ama DB'de tablolar yok — `supabase/schema.sql` Supabase Dashboard > SQL Editor'dan çalıştırılmalı:
- **Faz 1 tabloları:** `chapter_reactions`, `reading_lists`, `follows` + `notify_chapter_followers` trigger + `increment_chapter_view` function
- **Faz 2 tabloları:** `user_writing_goals` (streak_current, streak_best, streak_last_date dahil), `user_badges`
- **Feedback RLS:** `feedback_select_admin` + `feedback_update_admin` (admin email görebilsin/güncelleyebilsin)
- **Fikir Odası tabloları:** `idea_threads`, `idea_messages`, `idea_join_requests`
- **RLS politikaları:** `members_select_member`, `members_insert_owner`, `chapters_select_member`, `notifications_insert_service`
- **Yeni enum değerleri:** `notification_type` → `new_chapter`, `new_follower`
- **Yeni kolon:** `chapters.view_count int NOT NULL DEFAULT 0`

### Diğer Bekleyenler
- **`totalViews` haftalık istatistik** — şu an 0 gösterir; Faz 3'te chapter_reads tablosu ile gerçek veri gelecek
- Davet akışı tam test edilmedi (roles gerektiriyor)
- Google OAuth "test" modunda — production'a geçmek için Google Cloud Console'da "Publish App" gerekiyor
