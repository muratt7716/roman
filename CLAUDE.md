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
- Tek şema dosyası: `supabase/schema.sql` — başına `DROP IF EXISTS` eklenmiş, Supabase SQL Editor'a kopyala-yapıştır ile çalışır
- `handle_new_user` trigger'ı yeni kullanıcılar için otomatik profil oluşturur
- **Kritik:** Trigger kurulmadan önce oluşturulan eski hesaplarda `profiles` satırı **yok** — bu yüzden login ve OAuth callback'te `upsert` ile profil oluşturma kodu var

---

## Bilinen Sorunlar ve Çözümleri

### Profil Yokken 409 Hatası
- **Neden:** `projects.owner_id` → `profiles.id` FK. Profil yoksa INSERT başarısız.
- **Çözüm:** `LoginForm.tsx` ve `auth/callback/route.ts` login sonrası `profiles.upsert(..., { ignoreDuplicates: true })` çağırıyor.

### Navbar Giriş Durumunu Göstermiyor
- **Neden 1:** `(public)` layout'ta `force-dynamic` eksikti — Next.js cache'liyordu.
- **Neden 2:** Profil DB'de yoksa `profile=null` geliyordu, navbar logged-out gösteriyordu.
- **Çözüm:** Her iki layout da auth user'dan fallback profil oluşturuyor.

### Google OAuth "redirect_uri_mismatch"
- Google Cloud Console'da Authorized redirect URIs'e şunlar olmalı:
  - `https://dtcwlvoggjxvuwvkjpip.supabase.co/auth/v1/callback`
  - `https://writersquad.vercel.app/auth/callback`
- Authorized JavaScript Origins:
  - `https://writersquad.vercel.app`
  - `https://dtcwlvoggjxvuwvkjpip.supabase.co`
- Google OAuth test modunda — production için "Publish App" gerekiyor

### Davet Kabul Edilemiyor (409 / RLS Hatası)
- **Neden:** `project_members` INSERT politikası yalnızca `is_project_owner()` kontrolü yapıyor. Davet kabul eden kullanıcı (invitee) kendisini üye eklemeye çalışırken proje sahibi olmadığı için RLS engeller.
- **Çözüm:** Politikaya "pending invite sahibi de kendini ekleyebilir" koşulu eklendi:
  ```sql
  DROP POLICY IF EXISTS "members_insert_owner" ON project_members;
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
- **Etkilenen dosya:** `supabase/schema.sql` (members_insert_owner politikası) + Supabase Dashboard > SQL Editor'da çalıştırılmalı

### Versiyon Şişmesi (TipTap Editor)
- Autosave debounce: **30 saniye** (eski 2s)
- Yeni version sadece `wordDiff >= 20` VEYA ilk kayıt ise oluşturuluyor
- `lastVersionWordCount` ref ile takip ediliyor

### Word Count Şişmesi (Overview Sayfası)
- Tüm version'ların word count'u toplanmıyordu — her bölümün **en son versiyonu** alınıyor
- `latestPerChapter` Map ile chapter başına tek entry

---

## Dosya Yapısı — Kritik Dosyalar

```
proxy.ts                          # Next.js 16 proxy (session refresh + route koruma)
lib/supabase/
  client.ts                       # Browser client (createBrowserClient)
  server.ts                       # Server client (createServerClient + cookies)
  session.ts                      # updateSession fonksiyonu (proxy tarafından çağrılır)
app/(auth)/auth/callback/route.ts # OAuth callback — profil upsert burada
components/auth/
  LoginForm.tsx                   # Email login — profil upsert burada
  SignupForm.tsx                  # Email signup
components/editor/
  TipTapEditor.tsx                # Ana editör — autosave + versioning
  VersionHistoryClient.tsx        # Versiyon geçmişi modal
components/project/
  ProjectForm.tsx                 # Proje oluşturma (3 adımlı)
supabase/schema.sql               # Tek SQL dosyası — tüm şema burada
```

---

## Geliştirme Ortamı

```bash
npm run dev          # Lokal geliştirme
rm -r -fo .next      # Cache temizle (PowerShell — && çalışmaz)
```

- PowerShell'de `&&` çalışmıyor, komutları ayrı ayrı çalıştır
- Lokal'den Google OAuth test etmek için Supabase Redirect URLs'e `http://localhost:3000/*` ekli

---

## Kullanıcı Notları
- Test hesabı: `mmuratb77@gmail.com` — profil upsert fix sonrası normal çalışıyor
- Google OAuth şu an "test" modunda — sadece Google Cloud Console'daki test kullanıcıları giriş yapabilir
