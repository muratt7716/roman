# Yazı Sprintleri — Tasarım Dokümanı

## Genel Bakış

**Amaç:** Kalem Birliği kullanıcılarını günlük aktif tutmak ve "birlikte yazma" hissini somutlaştırmak. Topluluk sprintleri sosyal proof yaratır; bireysel sprint her zaman erişilebilir bir motivasyon aracı olarak çalışır.

**Stack:** Next.js 16 App Router · Supabase (PostgreSQL + RLS + Realtime) · TypeScript · Tailwind v4 · shadcn/ui

---

## 1. Sprint Tipleri

### Topluluk Sprintleri
- Sistem her gün 3 sabit saatte otomatik oluşturur: **10:00, 14:00, 21:00**
- Admin panelinden manuel sprint de açılabilir
- Sprint başlamadan **5 dk önce** "Katıl" butonu aktif olur
- Katılımcı sayısı Supabase Realtime ile canlı güncellenir ("şu an X kişi yazıyor")
- Sprint bitince tüm katılımcıların kelime sayısı sıralamaya girer

### Bireysel Sprint
- Her zaman açık, süre seçimi: **15 / 25 / 45 dk**
- Sıralamaya girmez, streak'e sayılır
- Mevcut proje bölümüne ya da yeni boş taslağa bağlanabilir

---

## 2. Sprint Odası Akışı

1. Kullanıcı sprint'e katılır → `sprint_participants` INSERT
2. Sprint odası açılır: geri sayım timer + katılımcı sayacı (realtime)
3. Kullanıcı kendi editöründe yazar (mevcut proje bölümü seçer ya da yeni taslak açılır)
4. Süre dolunca **"Sprint Bitti!"** overlay çıkar, kelime sayısı otomatik hesaplanır
5. Kullanıcı `finish` API'ını çağırır → kelime sayısı kaydedilir
6. Sıralama sayfasına yönlendirilir

**Kelime sayısı hesabı:** Sprint başındaki `word_count` referans alınır, sprint sonunda fark hesaplanır. Başlangıç referansı `joined_at` anındaki son chapter_version'dan okunur.

---

## 3. Veri Modeli

```sql
CREATE TABLE IF NOT EXISTS writing_sprints (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title            text NOT NULL DEFAULT 'Yazı Sprinti',
  duration_minutes int  NOT NULL CHECK (duration_minutes IN (15, 25, 45)),
  starts_at        timestamptz NOT NULL,
  ends_at          timestamptz NOT NULL GENERATED ALWAYS AS (starts_at + duration_minutes * interval '1 minute') STORED,
  status           text NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled','active','finished')),
  created_by       uuid REFERENCES profiles(id) ON DELETE SET NULL,
  is_community     boolean NOT NULL DEFAULT true,
  created_at       timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS sprint_participants (
  sprint_id        uuid NOT NULL REFERENCES writing_sprints(id) ON DELETE CASCADE,
  user_id          uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  word_count       int  NOT NULL DEFAULT 0,
  start_word_ref   int  NOT NULL DEFAULT 0,
  joined_at        timestamptz NOT NULL DEFAULT now(),
  finished_at      timestamptz,
  PRIMARY KEY (sprint_id, user_id)
);
```

**RLS:**
- `writing_sprints`: herkese SELECT açık; INSERT sadece `auth.uid() IS NOT NULL` (bireysel) veya admin
- `sprint_participants`: SELECT herkese açık; INSERT/UPDATE sadece `auth.uid() = user_id`

---

## 4. API Rotaları

| Rota | Metod | Açıklama |
|------|-------|----------|
| `/api/sprint` | GET | Aktif + yaklaşan + son 5 topluluk sprinti |
| `/api/sprint` | POST | Bireysel sprint oluştur (duration body'de) |
| `/api/sprint/[sprintId]/join` | POST | Katıl, `start_word_ref` kaydet |
| `/api/sprint/[sprintId]/finish` | POST | `word_count` ve `finished_at` güncelle |
| `/api/sprint/community` | POST | Admin: topluluk sprinti oluştur |
| `/api/sprint/cron` | POST | Otomatik günlük sprint oluşturma (Vercel Cron) |

---

## 5. Sayfalar & Bileşenler

```
app/(app)/sprint/page.tsx
  — Aktif sprint kartı (varsa büyük CTA)
  — Yaklaşan sprintler listesi
  — Geçmiş sprintler (son 7) + kendi istatistikleri
  — "Bireysel Sprint Başlat" butonu

app/(app)/sprint/[sprintId]/page.tsx
  — SprintRoom component (client)
  — Sprint bitmişse SprintLeaderboard gösterir

components/sprint/SprintCard.tsx
  — Durum: scheduled / active / finished
  — Katılımcı sayısı, süre, başlangıç saati

components/sprint/SprintRoom.tsx  (client)
  — Geri sayım timer (requestAnimationFrame tabanlı)
  — Realtime katılımcı sayacı (Supabase channel)
  — "Editörüme Git" linki (seçili proje/bölüm)
  — Sprint bitince overlay + finish API çağrısı

components/sprint/SprintLeaderboard.tsx
  — Sıralama: kelime sayısına göre desc
  — Kullanıcının kendi satırı highlight
  — Rozet kazanıldıysa konfeti animasyonu
```

---

## 6. Otomatik Sprint Oluşturma

Vercel Cron Job — her gün gece yarısı çalışır, ertesi gün için 3 sprint oluşturur:

```
Schedule: 0 0 * * *   (her gün 00:00 UTC)
Endpoint: /api/sprint/cron
Saatler: 07:00, 11:00, 18:00 UTC (TR: 10:00, 14:00, 21:00)
```

Cron endpoint `CRON_SECRET` env değişkeniyle korunur.

---

## 7. Entegrasyonlar

### Streak
`finish` API çağrıldığında ve `word_count > 0` ise:
```sql
INSERT INTO user_writing_goals (user_id, streak_last_date)
VALUES (auth.uid(), CURRENT_DATE)
ON CONFLICT (user_id) DO UPDATE SET streak_last_date = CURRENT_DATE;
```

### Rozetler
`lib/badges.ts`'e 2 yeni rozet:

| Kod | Tetikleyici | Açıklama |
|-----|------------|----------|
| `first_sprint` | İlk sprint tamamlama | İlk sprinti bitirdin |
| `sprint_warrior` | 10 sprint tamamlama | Sprint savaşçısı |

### Navbar
- Desktop nav ve mobile nav'a "Sprint" linki eklenir
- Aktif topluluk sprinti varsa link yanında 🔴 canlı göstergesi

---

## 8. Yeni Dosyalar

```
app/(app)/sprint/page.tsx
app/(app)/sprint/[sprintId]/page.tsx
app/api/sprint/route.ts
app/api/sprint/[sprintId]/join/route.ts
app/api/sprint/[sprintId]/finish/route.ts
app/api/sprint/community/route.ts
app/api/sprint/cron/route.ts
components/sprint/SprintCard.tsx
components/sprint/SprintRoom.tsx
components/sprint/SprintLeaderboard.tsx
vercel.json                             (cron tanımı)
```

## 9. Değiştirilen Dosyalar

```
supabase/schema.sql       — 2 yeni tablo + RLS
types/index.ts            — WritingSprint, SprintParticipant tipleri
lib/badges.ts             — 2 yeni rozet
components/shared/Navbar.tsx  — Sprint linki + aktif gösterge
```

---

## Kapsam Dışı

- Sprint içi gerçek zamanlı sohbet/chat
- Sprint teması/prompt zorunluluğu
- Para ödülü veya puan sistemi (rozet yeterli)
- Takım sprintleri (proje bazlı)
