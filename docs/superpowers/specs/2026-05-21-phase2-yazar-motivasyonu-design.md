# Faz 2 — Yazar Motivasyonu Tasarım Dokümanı

## Genel Bakış

**Amaç:** Yazarların platformda daha uzun süre aktif kalmasını sağlamak — günlük yazma alışkanlığı oluşturmak, başarıları görünür kılmak, en kaliteli içerikleri öne çıkarmak.

**Stack:** Next.js 16 App Router · Supabase (PostgreSQL + RLS) · TypeScript · Tailwind v4 · shadcn/ui

---

## Özellikler

### 1. Günlük Yazı Hedefi

**Ne yapar:** Kullanıcı günlük kelime hedefi belirler. Dashboard'da bugün ne kadar ilerlediğini görür.

**Veri:** `user_writing_goals` tablosu — kullanıcı başına tek satır.

```sql
CREATE TABLE user_writing_goals (
  user_id     uuid PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  daily_target int NOT NULL DEFAULT 500 CHECK (daily_target BETWEEN 50 AND 10000),
  updated_at  timestamptz NOT NULL DEFAULT now()
);
```

**İlerleme hesabı:** Bugün kaydedilen `chapter_versions` kayıtlarındaki kelime farkı toplanır. Her version kaydı `word_count` alanı taşır; bugünkü version'ların toplam `word_count` değeri "bugün yazılan kelime" sayılır. Basit sorgu, yeni tablo gerektirmez.

```sql
SELECT COALESCE(SUM(word_count), 0)
FROM chapter_versions cv
JOIN chapters c ON c.id = cv.chapter_id
JOIN project_members pm ON pm.project_id = c.project_id AND pm.user_id = $user_id
WHERE cv.created_at >= CURRENT_DATE
  AND cv.created_at < CURRENT_DATE + INTERVAL '1 day'
  AND cv.user_id = $user_id
```

**UI:** Dashboard'da hedef altı ilerleme çubuğu + "X / Y kelime" etiketi. Hedefe ulaşınca yeşile döner. Hedefi değiştirmek için inline ayar (küçük edit ikonu).

---

### 2. Streak — Server Persistansı

**Mevcut durum:** `hooks/useStreak.ts` localStorage'da streak takip eder. Cihaz değişince sıfırlanır.

**Değişiklik:** `user_writing_goals` tablosuna iki kolon eklenir:

```sql
ALTER TABLE user_writing_goals
  ADD COLUMN streak_current int NOT NULL DEFAULT 0,
  ADD COLUMN streak_best    int NOT NULL DEFAULT 0,
  ADD COLUMN streak_last_date date;
```

**Mantık:** Günlük hedef UI'ı yüklendiğinde server'dan streak okunur. Kullanıcı bugün herhangi bir chapter_version kaydettiyse "bugün yazdı" sayılır. Streak güncelleme mantığı API route'da çalışır — localStorage hook kaldırılmaz, server verisi önceliklidir.

---

### 3. Rozet Sistemi

**8 sabit rozet:**

| Kod | İsim | Tetikleyici |
|-----|------|-------------|
| `first_chapter` | 🖊️ İlk Adım | İlk bölüm `status='final'` yapıldı |
| `thousand_words` | 📖 Bin Kelime | Kümülatif toplam yazılan kelime ≥ 1.000 |
| `seven_day_streak` | 🔥 Ateş Yazar | `streak_current` ≥ 7 |
| `team_player` | 👥 Ekip Oyuncusu | `project_members`'a ilk kez eklendi (owner olmayan) |
| `beloved` | ❤️ Sevildi | Alınan toplam reaksiyon ≥ 10 |
| `followed` | 🌟 Takip Edildi | `follows.following_id = user_id` sayısı ≥ 5 |
| `reader_friend` | 📚 Okur Dostu | Kendi projeleri reading_lists'e ≥ 10 kez eklendi (proje sahibi kazanır) |
| `editorial_pick` | 🏆 Editör Seçkisi | Editöryal seçkiye en az bir kez girdi |

**DB:**

```sql
CREATE TABLE user_badges (
  user_id    uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  badge_code text NOT NULL,
  earned_at  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, badge_code)
);
```

**Kontrol zamanı:** Her ilgili action'ın API route'unda rozet kontrolü yapılır:
- Chapter finalize → `first_chapter` kontrol; `thousand_words` için `SELECT SUM(cv.word_count) FROM chapter_versions cv JOIN chapters c ON c.id=cv.chapter_id WHERE c.project_id IN (SELECT project_id FROM project_members WHERE user_id=$uid) AND cv.user_id=$uid` ≥ 1000
- Streak güncelleme → `seven_day_streak` kontrol
- Follow API → `followed` kontrol (following_id sahibi için)
- Reaction API → `beloved` kontrol (chapter sahibi için)
- Reading list API → `reader_friend` kontrol (proje sahibi için)
- Editöryal seçki hesabı → `editorial_pick` kontrol

Rozet zaten varsa INSERT yoksayılır (PRIMARY KEY çakışması = idempotent).

**UI:**
- Dashboard'da kazanılan rozetler satırı (icon + isim, earn date tooltip)
- Profil sayfasında rozet grid'i (kazanılmamış rozetler soluk/gri gösterilir)

---

### 4. Haftalık İstatistik (Dashboard)

Dashboard'a "Bu Hafta" bölümü — 4 metrik kartı:

| Metrik | Kaynak |
|--------|--------|
| Yazılan kelime | `chapter_versions` → `SUM(word_count)` son 7 gün |
| Alınan alkış | `chapter_reactions` → COUNT son 7 gün, chapter sahibi user |
| Yeni takipçi | `follows` → COUNT son 7 gün, `following_id = user_id` |
| Okunma | `chapters.view_count` — mevcut toplam (7 günlük diff yok, Faz 3'e bırakılır) |

Tüm veriler tek bir server component sorgusuyla çekilir. Yeni tablo gerekmez.

---

### 5. Editöryal Seçki UI (Anasayfa)

**Algoritma** (önceki fazdan):
```
skor = reads × 1 + reactions × 3 + comments × 2 + bookmarks × 2
```
- Pencere: Son 7 gün
- Minimum: 10 unique reader
- Sadece `visibility = 'published'` projeler

**UI:** `app/(public)/page.tsx`'e "Bu Hafta Öne Çıkanlar" section'ı eklenir. En fazla 3 proje kartı. Kart: kapak görseli, başlık, yazar, skor gösterilmez (kullanıcı geri planı bilmez), "Oku" butonu.

**Edge case:** 10+ unique reader eşiğini geçen proje yoksa section gizlenir (CSS `hidden` değil, render edilmez).

---

## Mimari — Yeni Dosyalar

```
app/(app)/dashboard/page.tsx          # MOD: haftalık stats + hedef + rozetler
app/api/writing-goal/route.ts         # GET (hedef + ilerleme + streak) | POST (hedef güncelle)
app/api/badges/check/route.ts         # POST: rozet kontrol util — diğer route'lardan çağrılır
components/dashboard/
  WritingGoalCard.tsx                 # Günlük hedef ilerleme çubuğu + streak
  WeeklyStatsRow.tsx                  # 4 metrik kartı
  BadgesRow.tsx                       # Kazanılan rozetler satırı
components/profile/
  BadgesGrid.tsx                      # Profil sayfası rozet grid'i (kazanılmış + tümü)
supabase/schema.sql                   # user_writing_goals + user_badges tabloları
types/index.ts                        # BadgeCode type + interfaces
```

---

## DB Özeti — Yeni Tablolar

| Tablo | Amaç |
|-------|------|
| `user_writing_goals` | Günlük hedef + streak (current, best, last_date) |
| `user_badges` | Kazanılan rozetler — `(user_id, badge_code)` PK |

---

## RLS Politikaları

```sql
-- user_writing_goals
ALTER TABLE user_writing_goals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "goals_self" ON user_writing_goals
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- user_badges
ALTER TABLE user_badges ENABLE ROW LEVEL SECURITY;
CREATE POLICY "badges_select_all" ON user_badges FOR SELECT USING (true);
CREATE POLICY "badges_insert_self" ON user_badges FOR INSERT WITH CHECK (auth.uid() = user_id);
```

---

## Kapsam Dışı (Bu Fazda Değil)

- Liderlik tablosu (leaderboard) — Faz 4
- Proje bazlı ayrı word count hedefi — mevcut `target_word_count` alanı yeterli
- Haftalık okunma diff'i — Faz 3
- Bildirim: "Hedefe ulaştın!" push notification — Faz 4
- Yeni rozet ekleme sistemi (admin) — sabit liste yeterli
