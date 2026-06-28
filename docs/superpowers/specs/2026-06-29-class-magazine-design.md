# Sınıf Dergisi — Tasarım Spesifikasyonu

**Tarih:** 2026-06-29
**Kapsam:** Akademi modülü — öğretmen kuratörlüğünde dönemsel sınıf dergisi
**Hedef:** İlkokul, ortaokul, lise öğretmen ve öğrencileri

---

## Özet

Öğretmen, sınıftaki ödev teslimlerinden seçtiklerini bir dergi sayısında bir araya getirir. Sayı bölümlere ayrılır, bazı yazılar "öne çıkan" olarak işaretlenir, her yazı için isimli / anonim kararı öğretmene aittir. Sayı yayımlandığında okul genelinde ve platform genelinde okunabilir hale gelir. Öğretmen PDF çıktısı alabilir.

---

## Veri Modeli

### `class_magazines`
```
id            uuid PK
classroom_id  uuid FK → classrooms.id ON DELETE CASCADE
title         text NOT NULL (Örn: "Bahar Sayısı 2026")
issue_number  int NOT NULL DEFAULT 1
status        text NOT NULL DEFAULT 'draft' CHECK IN ('draft','published')
published_at  timestamptz
created_at    timestamptz NOT NULL DEFAULT now()
```

### `magazine_sections`
```
id           uuid PK
magazine_id  uuid FK → class_magazines.id ON DELETE CASCADE
type         text NOT NULL CHECK IN ('hikaye','şiir','makale','senaryo','serbest')
order        int NOT NULL DEFAULT 0
```

### `magazine_entries`
```
id              uuid PK
section_id      uuid FK → magazine_sections.id ON DELETE CASCADE
submission_id   uuid FK → assignment_submissions.id ON DELETE CASCADE
display_name    text (NULL = anonim, dolu = isimle yayımla)
is_featured     bool NOT NULL DEFAULT false
order           int NOT NULL DEFAULT 0
```

**Kural:** `assignment_submissions`'a dokunulmaz — dergi sadece referans verir. Yazı içeriği TipTap editöründeki chapter'dan okunur (mevcut `projects` → `chapters` zinciri üzerinden).

---

## RLS Politikaları

- `class_magazines` SELECT: `status = 'published'` ise herkes görebilir (misafir dahil); draft ise sadece classroom owner/teacher
- `magazine_sections` SELECT: parent magazine published ise herkese açık
- `magazine_entries` SELECT: parent magazine published ise herkese açık
- INSERT/UPDATE/DELETE: sadece classroom owner (`classrooms.owner_id = auth.uid()`)

---

## Sayfalar & Bileşenler

### Öğretmen Tarafı

**`/classroom/[id]/magazine`** (server component)
- Geçmiş sayılar kartlar halinde (taslak + yayımlanmış ayrı gruplar)
- "Yeni Sayı Oluştur" butonu

**`/classroom/[id]/magazine/new`** (client page)
- Sayı başlığı input
- Bölüm ekle: type seç (hikaye/şiir/makale/senaryo/serbest) → liste büyür
- Bölüm sırası için yukarı/aşağı okları (drag-drop yok, karmaşıklık ekler)
- "Oluştur" → magazine + sections insert → editör sayfasına yönlendir

**`/classroom/[id]/magazine/[magazineId]/edit`** (client page)
- **Sol panel:** Sınıfın `submitted` + `graded` teslimlerinin listesi (öğrenci adı + ödev başlığı)
- **Sağ panel:** Sayının bölümleri, her biri expand edilebilir
- Teslimi bölüme ekle butonu → `magazine_entries` insert
- Her giriş kartında:
  - İsimli/Anonim toggle (`display_name` set/null)
  - ⭐ Öne Çıkan toggle (`is_featured`)
  - Yukarı/Aşağı sıra okları
  - Kaldır butonu
- Sağ üstte: "Sayıyı Yayımla" (onay dialog'u) + "PDF Çıktı Al"

**`/classroom/[id]/magazine/[magazineId]/preview`** (okuyucu görünümü, teacher da görebilir)
- Yayımlanmamış sayılar için sadece öğretmen erişebilir

### Okuyucu Tarafı

**`/classroom/[id]/magazine/[magazineId]`** (public okuma sayfası)
- Kapak: sayı başlığı, sınıf adı, okul adı, yayım tarihi
- Sol sidebar: bölüm navigasyonu
- İçerik: seçili bölümün yazıları; öne çıkanlar büyük kartla başta
- Her yazı: başlık, yazar (isimli/anonim), ödev içeriği (TipTap HTML render)

**`/discover/magazines`** (platform geneli keşif)
- Tüm published sayılar, en yeniden eskiye
- Okul adı, sınıf adı, sayı başlığı gösterilir
- Giriş yapmadan okunabilir

**`/discover/magazines?school=[school_name]`** (okul geneli filtre)
- Aynı okul adına sahip tüm sınıfların sayıları

### Bildirim

- Yazısı yayımlanan öğrenci `notifications` tablosuna `magazine_published` tipi bildirim alır
- Payload: `magazine_id`, `magazine_title`, `classroom_id`, `is_featured`
- Link: `/classroom/[id]/magazine/[magazineId]`

---

## PDF Çıktı

CSS `@media print` kurallarıyla:
- Kapak sayfası: sayı adı büyük, sınıf + okul bilgisi, tarih
- Her bölüm yeni sayfada başlar (`page-break-before: always`)
- Öne çıkan yazı bölüm başında tam sayfa
- Diğer yazılar alt alta, yazar bilgisi italik
- Navbar, butonlar, sidebar `display: none`

Ayrı kütüphane gerekmez — tarayıcı print diyaloğu yeterli.

---

## API Routes

```
GET  /api/classroom/[id]/magazine              → sayı listesi
POST /api/classroom/[id]/magazine              → yeni sayı oluştur
GET  /api/classroom/[id]/magazine/[mid]        → sayı detayı + sections + entries
POST /api/classroom/[id]/magazine/[mid]/publish → status='published', published_at=now()
POST /api/classroom/[id]/magazine/[mid]/sections         → bölüm ekle
DELETE /api/classroom/[id]/magazine/[mid]/sections/[sid] → bölüm sil

POST /api/classroom/[id]/magazine/[mid]/sections/[sid]/entries       → yazı ekle
PATCH /api/classroom/[id]/magazine/[mid]/sections/[sid]/entries/[eid] → featured/name güncelle
DELETE /api/classroom/[id]/magazine/[mid]/sections/[sid]/entries/[eid] → kaldır

GET /api/magazines?school=...&page=1           → platform/okul keşif
```

---

## Yeni Tip Tanımları (`types/index.ts`)

```typescript
export interface ClassMagazine {
  id: string
  classroom_id: string
  title: string
  issue_number: number
  status: 'draft' | 'published'
  published_at: string | null
  created_at: string
}

export interface MagazineSection {
  id: string
  magazine_id: string
  type: 'hikaye' | 'şiir' | 'makale' | 'senaryo' | 'serbest'
  order: number
  entries?: MagazineEntry[]
}

export interface MagazineEntry {
  id: string
  section_id: string
  submission_id: string
  display_name: string | null
  is_featured: boolean
  order: number
}
```

---

## Özellik Sınırları (YAGNI)

Bu speste YOK, sonraki fazlara bırakıldı:
- Okuyucu yorumu (şimdilik yok — platform yorumu ile karışır)
- Sayı kapak görseli yükleme (renk/tema seçimi yeterli)
- Çapraz sınıf işbirliği
- Okul geneli ödül/ranking sistemi (ileride en iyi dergi, en çok okunan yazı)
- Anasayfaya "Bu Haftanın Dergilerinden" kutucuğu

---

## Dosya Yapısı

```
supabase/schema.sql                                      ← 3 yeni tablo + RLS
types/index.ts                                           ← ClassMagazine, MagazineSection, MagazineEntry
app/api/classroom/[classroomId]/magazine/
  route.ts                                               ← GET liste | POST yeni sayı
  [magazineId]/
    route.ts                                             ← GET detay
    publish/route.ts                                     ← POST yayımla
    sections/
      route.ts                                           ← POST ekle
      [sectionId]/
        route.ts                                         ← DELETE
        entries/
          route.ts                                       ← POST ekle
          [entryId]/route.ts                             ← PATCH güncelle | DELETE kaldır
app/api/magazines/route.ts                               ← GET keşif (public)
app/(app)/classroom/[classroomId]/
  magazine/
    page.tsx                                             ← sayı listesi
    new/page.tsx                                         ← sayı oluştur
    [magazineId]/
      page.tsx                                           ← okuyucu görünümü
      edit/page.tsx                                      ← editör (öğretmen)
app/(public)/discover/magazines/page.tsx                 ← platform keşif
components/magazine/
  MagazineCard.tsx                                       ← sayı kartı
  MagazineEditor.tsx                                     ← editör client component
  MagazineReader.tsx                                     ← okuyucu layout
  SectionPanel.tsx                                       ← bölüm + yazı listesi (editörde)
  EntryCard.tsx                                          ← editörde teslim kartı
```
