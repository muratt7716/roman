# Faz 4 — Akademi Güçlendirme Tasarım Dokümanı

## Genel Bakış

**Amaç:** Kalem Birliği'nin okul modülünü (Faz 3) rakip platformlardan (Astra.ai vb.) ayırt edecek şekilde güçlendirmek — öğretmen bağlılığını artırmak, öğrenci motivasyonunu sistematik hale getirmek ve veli döngüsünü kapatmak.

**Stack:** Next.js 16 App Router · Supabase (PostgreSQL + RLS) · TypeScript · Tailwind v4 · shadcn/ui

---

## 1. Rozet & Streak → Sınıf Entegrasyonu

### Hedef
Mevcut rozet ve streak sistemini (Faz 2) sınıf modülüyle bağlamak — öğrenci ödev yazarken motivasyon döngüsü otomatik çalışsın.

### Yeni Rozetler

| Rozet Kodu | Tetikleyici | Açıklama |
|---|---|---|
| `first_submission` | İlk ödev teslimi | İlk gönderimi yaptın |
| `consistent_writer` | 3 ödev üst üste teslim | Düzenli yazarsın |
| `star_student` | Not ≥ 90 | Öğretmenden tam puan |

### Streak Entegrasyonu
- `start` API'ı çağrıldığında (öğrenci editörü ilk açtığında) → o günkü streak sayılır
- Mevcut `user_writing_goals` tablosundaki streak mantığı değişmez, sadece tetikleyici eklenir

### Öğrenci Dashboard Bölümü
`app/(app)/dashboard/page.tsx` sayfasına "Akademi Özeti" kartı eklenir:
- Toplam teslim sayısı
- Notlandırılmış ödev sayısı
- Not ortalaması (0–100)
- Supabase'den `assignment_submissions` join ile çekilir

---

## 2. Öğretmen Analitik Paneli

### Hedef
Öğretmenin sınıf panelinde (`/classroom/[classroomId]`) öğrenci aktivitesini tek bakışta görmesi.

### "İstatistikler" Sekmesi
Mevcut sınıf paneline sekme eklenir. İçerik:

**Teslim Oranı**
- `teslim_eden / toplam_üye` yüzdesi
- Ödev bazında filtrelenebilir dropdown

**Kelime Sıralaması**
- O ödevde her öğrencinin yazdığı kelime sayısı (project → chapter → content'ten hesaplanır)
- Sıralanmış liste, en çok yazan üstte

**Streak Tablosu**
- `user_writing_goals` tablosundan `streak_current > 0` olan üyeler
- 🔥 ikonu + gün sayısı

**Not Dağılımı**
- 0–100 arası basit bar chart (shadcn/ui ile, harici kütüphane yok)
- Sadece `status='graded'` teslimler

### Veri Kaynağı
Tüm veriler mevcut tablolardan server component'ta `Promise.all` ile çekilir. Yeni tablo gerekmez.

---

## 3. Prompt / Şablon Bankası

### Hedef
Öğretmenin ödev oluştururken yazı yönergesi bulmakta zorlanmaması.

### Platform Şablonları (Sabit Liste)
`lib/assignmentTemplates.ts` dosyasında 20 sabit Türkçe şablon:

| Kategori | Örnek Başlıklar |
|---|---|
| Macera | "Kayıp Ada", "Zaman Makinesi" |
| Duygu | "En Mutlu Anım", "Elveda Mektubu" |
| Korku/Gerilim | "Karanlık Koridor", "Gece Yarısı Sesi" |
| Deneme | "Teknoloji ve Biz", "İdeal Dünya" |
| Fantezi | "Sihirli Güç", "Paralel Evren" |

### Öğretmen Şablonları (Kaydedilebilir)
`assignment_templates` yeni tablosu:
```sql
CREATE TABLE IF NOT EXISTS assignment_templates (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id    uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title       text NOT NULL CHECK (char_length(title) BETWEEN 3 AND 200),
  description text CHECK (char_length(description) <= 2000),
  created_at  timestamptz NOT NULL DEFAULT now()
);
```

### UI Akışı
- Ödev oluşturma formunda "Şablon Seç" butonu
- Modal/drawer açılır: platform şablonları + öğretmenin kendi şablonları
- Seçince `title` ve `description` alanları otomatik dolar
- Öğretmen "Bu Şablonu Kaydet" butonuyla mevcut taslağı şablon olarak saklayabilir

---

## 4. Akran Okuma + Reaksiyon

### Hedef
`class_visible` ödevlerde öğrencilerin birbirinin yazısını okuması ve mevcut reaksiyon sistemiyle (🔥💧⚡) etkileşmesi.

### Görünürlük Kuralı

| Durum | Davranış |
|---|---|
| Teslim tarihi dolmamış | Öğrenci sadece kendi yazısını görür |
| Teslim tarihi geçmiş | Tüm teslim edilmiş yazılar sınıfa açılır (teslim etmemiş öğrenci de okuyabilir) |
| Teslim etmemiş + tarih geçmiş | Okuyabilir, rozet kazanamaz |

### UI
- Ödev detay sayfasında (`[assignmentId]/page.tsx`) teslim tarihi geçmişse "Sınıf Yazıları" bölümü görünür
- Her yazı için: öğrenci adı (anonim seçenek yok), kelime sayısı, `/projects/[slug]/read` linki, reaksiyon sayıları
- Mevcut `chapter_reactions` tablosu ve `/api/reactions` route'u olduğu gibi kullanılır — sıfır yeni kod

### Rozet
- `peer_reader` rozeti: Teslim tarihi geçtikten sonra sınıf yazılarından en az 2'sine reaksiyon verince

---

## 5. Veli Paneli

### Hedef
Velinin giriş yaparak kendi çocuğunun akademik durumunu görmesi.

### Veri Modeli
`classroom_members` tablosuna `student_id` kolonu eklenir:

```sql
ALTER TABLE classroom_members ADD COLUMN IF NOT EXISTS student_id uuid REFERENCES profiles(id) ON DELETE SET NULL;
```

`role='parent'` için `student_id` dolu olmalı; `role='teacher'` ve `role='student'` için NULL.

### Akış
1. Öğretmen sınıf panelinde "Veli Ekle" butonuna tıklar → email + hangi öğrencinin velisi olduğunu seçer
2. Sisteme kayıtlı değilse: "Bu email kayıtlı değil, kayıt olduktan sonra tekrar dene" mesajı
3. Kayıtlıysa: `classroom_members` tablosuna `role='parent', student_id=<öğrenci_id>` ile INSERT
4. Veli bir sonraki girişinde sınıf panelinde sadece kendi çocuğunun ödevlerini/notlarını/streak'ini görür

### Veli Görünümü (`/classroom/[classroomId]`)
Mevcut role-based rendering'e `isParent` dalı eklenir:
- Çocuğun adı ve avatar'ı
- Teslim edilen ödevler listesi (not + yorum görünür)
- Streak durumu 🔥
- Başka hiçbir öğrencinin verisi görünmez

### RLS
```sql
-- Veli sadece kendi çocuğunun submission'larını görebilir
-- submissions_select_own_or_teacher policy'sine parent dalı eklenir
```

---

## Yeni Tablolar Özeti

| Tablo | Amaç |
|---|---|
| `assignment_templates` | Öğretmen şablonları |

**Mevcut tablolara değişiklik:**
- `classroom_members`: `student_id uuid` kolonu (veli-öğrenci bağlantısı)
- `user_badges`: `first_submission`, `consistent_writer`, `star_student`, `peer_reader` rozet kodları eklenir
- `lib/badges.ts`: 4 yeni rozet tanımı

---

## Yeni Dosyalar

```
app/(app)/classroom/[classroomId]/analytics/page.tsx    # Öğretmen analitik sekmesi
app/api/classroom/[classroomId]/analytics/route.ts      # İstatistik verisi
app/api/classroom/templates/route.ts                    # GET list / POST create template
components/classroom/AnalyticsPanel.tsx                 # Bar chart + tablolar
components/classroom/PeerReadingList.tsx                # Sınıf yazıları bölümü
components/classroom/ParentView.tsx                     # Veli görünümü
lib/assignmentTemplates.ts                              # 20 sabit platform şablonu
```

**Değiştirilen dosyalar:**
```
app/(app)/classroom/[classroomId]/page.tsx              # isParent dalı + İstatistikler sekmesi
app/(app)/classroom/[classroomId]/assignments/[assignmentId]/page.tsx  # Sınıf Yazıları bölümü
app/(app)/classroom/[classroomId]/assignments/new/page.tsx  # Şablon bankası butonu
app/(app)/dashboard/page.tsx                            # Akademi Özeti kartı
lib/badges.ts                                           # 4 yeni rozet
supabase/schema.sql                                     # assignment_templates + student_id kolonu + yeni RLS
types/index.ts                                          # AssignmentTemplate tipi
```

---

## Kapsam Dışı (Bu Fazda Değil)

- Push bildirimleri (veli için "çocuğun ödev teslim etti" gibi)
- Veli-öğretmen mesajlaşması
- Öğrenci sıralaması/liderlik tablosu (rekabet yerine işbirliği odaklı platform)
- AI destekli ödev önerileri
