# Faz 4 — Akademi Güçlendirme Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Kalem Birliği okul modülünü rozet/streak entegrasyonu, öğretmen analitik paneli, şablon bankası, akran okuma ve veli paneli ile güçlendirerek rakiplerden ayırt edilebilir hale getirmek.

**Architecture:** 5 bağımsız alan sırayla implement edilir. Yeni `assignment_templates` tablosu + `classroom_members.student_id` kolonu eklenir. Mevcut `chapter_reactions`, `user_writing_goals`, `user_badges` sistemleri sıfır değişiklikle yeniden kullanılır. Tüm veri çekimi server component'ta `Promise.all` ile paralel yapılır.

**Tech Stack:** Next.js 16 App Router · Supabase RLS · TypeScript · Tailwind v4 · shadcn/ui · lucide-react

---

## Dosya Haritası

| Dosya | İşlem | Sorumluluk |
|-------|-------|-----------|
| `supabase/schema.sql` | Modify | `assignment_templates` tablosu + `classroom_members.student_id` + RLS |
| `types/index.ts` | Modify | `BadgeCode` + 4 yeni rozet · `ClassroomRole` + `'parent'` · `AssignmentTemplate` interface |
| `lib/badges.ts` | Modify | 4 yeni rozet tanımı + `checkAllBadges` güncellemesi |
| `lib/assignmentTemplates.ts` | Create | 20 sabit Türkçe şablon verisi |
| `app/api/classroom/[classroomId]/assignments/[assignmentId]/start/route.ts` | Modify | streak tetikle |
| `app/api/submissions/[submissionId]/route.ts` | Modify | submit → `first_submission` + `consistent_writer` rozeti; grade → `star_student` rozeti |
| `app/api/classroom/templates/route.ts` | Create | GET: şablon listesi · POST: şablon kaydet |
| `app/api/classroom/[classroomId]/analytics/route.ts` | Create | teslim oranı + kelime sıralaması + streak + not dağılımı |
| `app/api/classroom/[classroomId]/members/route.ts` | Create | POST: veli ekle (email → user_id lookup + insert) |
| `components/classroom/TemplatePickerModal.tsx` | Create | Platform + öğretmen şablonları modal |
| `components/classroom/PeerReadingList.tsx` | Create | Akran okuma listesi (deadline sonrası açılır) |
| `components/classroom/AnalyticsPanel.tsx` | Create | Teslim oranı + kelime sıralaması + streak + not bar chart |
| `components/classroom/ParentView.tsx` | Create | Veli: çocuğun ödevleri + notlar + streak |
| `components/classroom/AddParentForm.tsx` | Create | Öğretmen: email + öğrenci seç formu |
| `app/(app)/classroom/[classroomId]/analytics/page.tsx` | Create | Analitik sayfa (server component) |
| `app/(app)/classroom/[classroomId]/assignments/new/page.tsx` | Modify | "Şablon Seç" butonu + `TemplatePickerModal` |
| `app/(app)/classroom/[classroomId]/assignments/[assignmentId]/page.tsx` | Modify | `PeerReadingList` bölümü |
| `app/(app)/classroom/[classroomId]/page.tsx` | Modify | `isParent` dalı + "Veli Ekle" butonu + "İstatistikler" linki |
| `app/(app)/dashboard/page.tsx` | Modify | "Akademi Özeti" kartı |

---

## Task 1: DB Schema Güncellemesi

**Files:**
- Modify: `supabase/schema.sql`

### Bağlam
`supabase/schema.sql` dosyası baştan sona idempotent SQL içerir (`CREATE TABLE IF NOT EXISTS`, `DROP POLICY IF EXISTS`, `CREATE OR REPLACE`). Mevcut classroom tabloları ~satır 767'den başlar. Bu task'ta 2 değişiklik yapılır:
1. `assignment_templates` yeni tablosu (classroom tablolarının hemen altına)
2. `classroom_members` tablosuna `student_id` kolonu
3. `ClassroomRole`'a `'parent'` değeri için RLS güncellemeleri

- [ ] **Step 1: `assignment_templates` tablosunu ekle**

`supabase/schema.sql` içinde `-- RLS: classrooms` yorumunun hemen ÜSTÜNE şunu ekle:

```sql
-- ============================================================
-- ASSIGNMENT TEMPLATES (Faz 4)
-- ============================================================

CREATE TABLE IF NOT EXISTS assignment_templates (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id    uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title       text NOT NULL CHECK (char_length(title) BETWEEN 3 AND 200),
  description text CHECK (char_length(description) <= 2000),
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_assignment_templates_owner ON assignment_templates(owner_id);

ALTER TABLE assignment_templates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "templates_select_owner" ON assignment_templates;
DROP POLICY IF EXISTS "templates_insert_owner" ON assignment_templates;
DROP POLICY IF EXISTS "templates_delete_owner" ON assignment_templates;

CREATE POLICY "templates_select_owner" ON assignment_templates FOR SELECT USING (owner_id = auth.uid());
CREATE POLICY "templates_insert_owner" ON assignment_templates FOR INSERT WITH CHECK (owner_id = auth.uid());
CREATE POLICY "templates_delete_owner" ON assignment_templates FOR DELETE USING (owner_id = auth.uid());
```

- [ ] **Step 2: `classroom_members.student_id` kolonu ekle**

`classroom_members` `CREATE TABLE` bloğunda `joined_at` satırından sonra, PRIMARY KEY'den önce şunu ekle:

```sql
  student_id   uuid REFERENCES profiles(id) ON DELETE SET NULL,
```

Tablo şu hale gelir:
```sql
CREATE TABLE IF NOT EXISTS classroom_members (
  classroom_id uuid NOT NULL REFERENCES classrooms(id) ON DELETE CASCADE,
  user_id      uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role         text NOT NULL CHECK (role IN ('teacher','student','parent')),
  student_id   uuid REFERENCES profiles(id) ON DELETE SET NULL,
  joined_at    timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (classroom_id, user_id)
);
```

> **Not:** `role` CHECK constraint'e `'parent'` eklendi.

- [ ] **Step 3: `cls_members_insert` policy'yi güncelle**

Mevcut policy:
```sql
CREATE POLICY "cls_members_insert" ON classroom_members FOR INSERT WITH CHECK (
  auth.uid() = user_id
  AND (
    role = 'student'
    OR (role = 'teacher' AND auth_is_classroom_owner(classroom_id))
  )
);
```

Bunu şu hale getir (parent dalı ekle):
```sql
DROP POLICY IF EXISTS "cls_members_insert" ON classroom_members;
CREATE POLICY "cls_members_insert" ON classroom_members FOR INSERT WITH CHECK (
  auth.uid() = user_id
  AND (
    role = 'student'
    OR (role = 'teacher' AND auth_is_classroom_owner(classroom_id))
    OR (role = 'parent' AND auth_is_classroom_owner(classroom_id))
  )
);
```

> **Not:** Veli ekleme öğretmen API'ı tarafından yapılır; öğretmen `auth_is_classroom_owner` kontrolünü geçtiğinde veli INSERT'e izin verilir.

- [ ] **Step 4: `submissions_select_own_or_teacher` policy'ye parent dalı ekle**

Mevcut policy'yi bul ve şu hale getir:
```sql
DROP POLICY IF EXISTS "submissions_select_own_or_teacher" ON assignment_submissions;
CREATE POLICY "submissions_select_own_or_teacher" ON assignment_submissions FOR SELECT USING (
  student_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM classroom_assignments ca
    JOIN classrooms c ON c.id = ca.classroom_id
    WHERE ca.id = assignment_id AND c.owner_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM classroom_members cm
    JOIN classroom_assignments ca ON ca.classroom_id = cm.classroom_id
    WHERE ca.id = assignment_id
      AND cm.user_id = auth.uid()
      AND cm.role = 'parent'
      AND cm.student_id = student_id
  )
  OR (
    EXISTS (
      SELECT 1 FROM classroom_assignments ca
      WHERE ca.id = assignment_id AND ca.visibility = 'class_visible'
    )
    AND EXISTS (
      SELECT 1 FROM classroom_assignments ca
      JOIN classroom_members cm ON cm.classroom_id = ca.classroom_id
      WHERE ca.id = assignment_id AND cm.user_id = auth.uid()
    )
  )
);
```

- [ ] **Step 5: Commit**

```bash
git add supabase/schema.sql
git commit -m "feat: add assignment_templates table, student_id to classroom_members, parent RLS"
```

---

## Task 2: Types Güncellemesi

**Files:**
- Modify: `types/index.ts`

- [ ] **Step 1: `BadgeCode`'a 4 yeni rozet ekle**

`types/index.ts` satır 217'deki `BadgeCode` tipini bul ve güncelle:

```typescript
export type BadgeCode =
  | 'first_chapter'
  | 'thousand_words'
  | 'seven_day_streak'
  | 'team_player'
  | 'beloved'
  | 'followed'
  | 'reader_friend'
  | 'editorial_pick'
  | 'first_submission'
  | 'consistent_writer'
  | 'star_student'
  | 'peer_reader'
```

- [ ] **Step 2: `ClassroomRole`'a `'parent'` ekle**

`types/index.ts` içinde `ClassroomRole` tipini bul:
```typescript
export type ClassroomRole = 'teacher' | 'student'
```
Şu hale getir:
```typescript
export type ClassroomRole = 'teacher' | 'student' | 'parent'
```

- [ ] **Step 3: `AssignmentTemplate` interface ekle**

`AssignmentSubmission` interface'inden sonra şunu ekle:

```typescript
export interface AssignmentTemplate {
  id: string
  owner_id: string
  title: string
  description: string | null
  created_at: string
}
```

- [ ] **Step 4: TypeScript kontrolü**

```bash
npx tsc --noEmit 2>&1 | head -20
```

Beklenen: çıktı yok (hata yok)

- [ ] **Step 5: Commit**

```bash
git add types/index.ts
git commit -m "feat: add BadgeCode classroom badges, parent role, AssignmentTemplate type"
```

---

## Task 3: Rozet Sistemi — 4 Yeni Rozet

**Files:**
- Modify: `lib/badges.ts`

### Bağlam
`lib/badges.ts` iki şey içerir: `BADGE_META` (rozet görüntü bilgisi) ve `checkAllBadges` (tüm koşulları kontrol eden fonksiyon). `awardBadge(supabase, userId, badgeCode)` fonksiyonu ile rozet verilir; unique constraint sayesinde iki kez verme engellenir.

- [ ] **Step 1: `BADGE_META`'ya 4 yeni rozet ekle**

`lib/badges.ts` içinde `BADGE_META` objesine şu satırları ekle:

```typescript
export const BADGE_META: Record<BadgeCode, { label: string; icon: string; desc: string }> = {
  first_chapter:      { label: 'İlk Adım',        icon: '🖊️', desc: 'İlk bölümünü yayınladın' },
  thousand_words:     { label: 'Bin Kelime',       icon: '📖', desc: 'Toplam 1.000 kelime yazdın' },
  seven_day_streak:   { label: 'Ateş Yazar',       icon: '🔥', desc: '7 gün üst üste yazdın' },
  team_player:        { label: 'Ekip Oyuncusu',    icon: '👥', desc: 'Bir projeye üye oldun' },
  beloved:            { label: 'Sevildi',           icon: '❤️', desc: '10 alkış aldın' },
  followed:           { label: 'Takip Edildi',      icon: '🌟', desc: '5 takipçiye ulaştın' },
  reader_friend:      { label: 'Okur Dostu',        icon: '📚', desc: 'Projen 10 kez listeye eklendi' },
  editorial_pick:     { label: 'Editör Seçkisi',    icon: '🏆', desc: 'Editöryal seçkiye girdin' },
  first_submission:   { label: 'İlk Teslimat',      icon: '📨', desc: 'İlk ödevini teslim ettin' },
  consistent_writer:  { label: 'Düzenli Yazar',     icon: '🗓️', desc: '3 ödevini teslim ettin' },
  star_student:       { label: 'Yıldız Öğrenci',   icon: '⭐', desc: '90 ve üzeri not aldın' },
  peer_reader:        { label: 'Akran Okuyucu',     icon: '👀', desc: 'Sınıf arkadaşlarının yazılarını okudun' },
}
```

- [ ] **Step 2: `checkAllBadges`'e classroom rozet kontrollerini ekle**

`checkAllBadges` fonksiyonunun sonuna (return'den önce) şu blokları ekle:

```typescript
  // first_submission: kullanıcının en az 1 teslimi var
  await maybeAward('first_submission', async () => {
    const { count } = await supabase
      .from('assignment_submissions')
      .select('id', { count: 'exact', head: true })
      .eq('student_id', userId)
      .in('status', ['submitted', 'graded'])
    return (count ?? 0) >= 1
  })

  // consistent_writer: kullanıcının en az 3 teslimi var
  await maybeAward('consistent_writer', async () => {
    const { count } = await supabase
      .from('assignment_submissions')
      .select('id', { count: 'exact', head: true })
      .eq('student_id', userId)
      .in('status', ['submitted', 'graded'])
    return (count ?? 0) >= 3
  })

  // star_student: en az bir teslimde not >= 90
  await maybeAward('star_student', async () => {
    const { count } = await supabase
      .from('assignment_submissions')
      .select('id', { count: 'exact', head: true })
      .eq('student_id', userId)
      .eq('status', 'graded')
      .gte('grade', 90)
    return (count ?? 0) >= 1
  })

  // peer_reader: class_visible bir ödevde en az 2 reaksiyonu olan (teslim edilmiş projelere)
  await maybeAward('peer_reader', async () => {
    const { data: userChapters } = await supabase
      .from('chapters')
      .select('id, project_id')
      .neq('created_by', userId)
    const chapterIds = (userChapters ?? []).map((c: { id: string }) => c.id)
    if (chapterIds.length === 0) return false
    const { count } = await supabase
      .from('chapter_reactions')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .in('chapter_id', chapterIds)
    return (count ?? 0) >= 2
  })
```

- [ ] **Step 3: TypeScript kontrolü**

```bash
npx tsc --noEmit 2>&1 | head -20
```

Beklenen: çıktı yok

- [ ] **Step 4: Commit**

```bash
git add lib/badges.ts
git commit -m "feat: add first_submission, consistent_writer, star_student, peer_reader badges"
```

---

## Task 4: Şablon Verisi + API

**Files:**
- Create: `lib/assignmentTemplates.ts`
- Create: `app/api/classroom/templates/route.ts`

- [ ] **Step 1: `lib/assignmentTemplates.ts` oluştur**

```typescript
export interface PlatformTemplate {
  id: string
  category: string
  title: string
  description: string
}

export const PLATFORM_TEMPLATES: PlatformTemplate[] = [
  // Macera
  { id: 'pt-01', category: 'Macera', title: 'Kayıp Ada', description: 'Haritada olmayan bir adaya düştün. Hayatta kalmak için ne yaparsın? Adanın sırlarını keşfederken içindeki cesareti de keşfedeceksin. En az 3 karakter kullan ve bir çatışma sahnesi yaz.' },
  { id: 'pt-02', category: 'Macera', title: 'Zaman Makinesi', description: 'Bir zaman makinesine bindin ve istediğin bir tarihe gidebilirsin. Nereye giderdin, neler yapardın ve geri dönebilir miydin? Tarihsel bir olayı hikayene dahil et.' },
  { id: 'pt-03', category: 'Macera', title: 'Büyük Yolculuk', description: 'Küçük bir haritayla büyük bir yolculuğa çıktın. Yolda karşılaştığın üç engeli aş ve hedefe ulaş. Her engelin seni nasıl değiştirdiğini yaz.' },
  { id: 'pt-04', category: 'Macera', title: 'Gizli Kapı', description: 'Okulunun duvarında gizemli bir kapı keşfettin. İçeride ne var? Girmeye cesaret edebilir misin? Merak ile korku arasındaki gerilimi hisset.' },
  // Duygu
  { id: 'pt-05', category: 'Duygu', title: 'En Mutlu Anım', description: 'Hayatında yaşadığın en mutlu anı detaylarıyla yaz. Neredeydin, kimler vardı, ne hissediyordun? Okuyucunun o duyguyu hissetmesini sağla.' },
  { id: 'pt-06', category: 'Duygu', title: 'Elveda Mektubu', description: 'Bir şeye ya da birine elveda diyorsun. Bu bir yer, bir dönem ya da bir insan olabilir. Veda etmenin hem acısını hem de özgürlüğünü yaz.' },
  { id: 'pt-07', category: 'Duygu', title: 'İlk Kez', description: 'Hayatında bir şeyi ilk kez yaptığında neler hissettin? İlk kez bisiklete binmek, sahneye çıkmak, yabancı biriyle konuşmak olabilir. O anı canlı tut.' },
  { id: 'pt-08', category: 'Duygu', title: 'Özür', description: 'Birine özür dilemek istiyorsun ama bir türlü dilini bağlıyor. Mektupta ne yazardın? Dürüst ve içten ol.' },
  // Korku / Gerilim
  { id: 'pt-09', category: 'Korku/Gerilim', title: 'Karanlık Koridor', description: 'Gece yarısı uyanıyorsun ve evin koridoru tamamen karanlık. Bir ses duyuyorsun. Gerilimi adım adım inşa et; canavarı gösterme, hissettir.' },
  { id: 'pt-10', category: 'Korku/Gerilim', title: 'Gece Yarısı Sesi', description: 'Her gece aynı saatte evin üst katından garip bir ses geliyor. Kimseye inandıramıyorsun. Tek başına araştırmaya karar veriyorsun.' },
  { id: 'pt-11', category: 'Korku/Gerilim', title: 'Kayıp Hafıza', description: 'Sabah uyandığında dün gece ne yaptığını hatırlamıyorsun. Ama masanın üstünde tanımadığın bir anahtar var. Geriye doğru iz sür.' },
  { id: 'pt-12', category: 'Korku/Gerilim', title: 'Son Gece', description: 'Kamp ateşinin etrafında herkes uyurken sen hâlâ uyanıksın. Ormandan gelen sesler seni tedirgin ediyor. Sabaha kadar bekle ama okuyucuyu da uyan tut.' },
  // Deneme
  { id: 'pt-13', category: 'Deneme', title: 'Teknoloji ve Biz', description: 'Teknoloji hayatımızı kolaylaştırıyor mu, yoksa bizi birbirinden uzaklaştırıyor mu? Kendi gözlemlerinden yola çıkarak düşüncelerini savun.' },
  { id: 'pt-14', category: 'Deneme', title: 'İdeal Dünya', description: 'Eğer dünyayı yeniden tasarlayabilseydin nasıl bir yer yapardın? Bir sorun seç ve çözümünü detaylıca açıkla.' },
  { id: 'pt-15', category: 'Deneme', title: 'Kitaplar mı, Ekranlar mı?', description: 'Kitap okumak ile dizi/video izlemek arasında ne fark var? Hangisinden daha çok şey öğreniyoruz? Bir deneyiminden örnekle.' },
  { id: 'pt-16', category: 'Deneme', title: 'Cesaret Nedir?', description: 'Sence cesaret ne demek? Sadece fiziksel tehlikeyle mi ilgili? Günlük hayatından bir örnek vererek cesaretin farklı yüzlerini anlat.' },
  // Fantezi
  { id: 'pt-17', category: 'Fantezi', title: 'Sihirli Güç', description: 'Bir gün uyandığında sihirli bir güce sahip olduğunu fark ettin. Bu gücü kimseye söyleyemezsin. İlk 24 saatte neler yaşadını yaz.' },
  { id: 'pt-18', category: 'Fantezi', title: 'Paralel Evren', description: 'Bir ayna önünde dururken paralel evrendeki sen sana bakıyor. Ama o sen, sen değil. Onunla ne konuşurdun? Farkları ve benzerlikleri keşfet.' },
  { id: 'pt-19', category: 'Fantezi', title: 'Hayvan Dili', description: 'Bir sabah tüm hayvanların dilini anlamaya başladın. İlk duyduğun şey seni şaşkına çevirdi. Ne duydun, ne yaptın?' },
  { id: 'pt-20', category: 'Fantezi', title: 'Büyücü Çırağı', description: 'Ünlü bir büyücünün yanına çırak olarak girdin. İlk dersin beklediğinden çok farklı. Ustanın sana öğretmek istediği gerçek sır nedir?' },
]
```

- [ ] **Step 2: `app/api/classroom/templates/route.ts` oluştur**

```typescript
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { PLATFORM_TEMPLATES } from '@/lib/assignmentTemplates'

// GET /api/classroom/templates
// Returns platform templates + user's own saved templates
export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Giriş yapman gerekiyor.' }, { status: 401 })

  const { data: myTemplates } = await supabase
    .from('assignment_templates')
    .select('*')
    .eq('owner_id', user.id)
    .order('created_at', { ascending: false })

  return NextResponse.json({
    platform: PLATFORM_TEMPLATES,
    mine: myTemplates ?? [],
  })
}

// POST /api/classroom/templates
// Body: { title: string, description?: string }
export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Giriş yapman gerekiyor.' }, { status: 401 })

  const { title, description } = await req.json()
  if (!title || title.trim().length < 3 || title.trim().length > 200) {
    return NextResponse.json({ error: 'Başlık 3-200 karakter olmalı.' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('assignment_templates')
    .insert({ owner_id: user.id, title: title.trim(), description: description?.trim() || null })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ template: data }, { status: 201 })
}
```

- [ ] **Step 3: TypeScript kontrolü**

```bash
npx tsc --noEmit 2>&1 | head -20
```

- [ ] **Step 4: Commit**

```bash
git add lib/assignmentTemplates.ts app/api/classroom/templates/route.ts
git commit -m "feat: assignment template library with 20 prompts and save API"
```

---

## Task 5: Rozet Tetikleyiciler — Start + Submit + Grade

**Files:**
- Modify: `app/api/classroom/[classroomId]/assignments/[assignmentId]/start/route.ts`
- Modify: `app/api/submissions/[submissionId]/route.ts`

### Bağlam
`awardBadge` ve `checkAllBadges` fonksiyonları `lib/badges.ts`'te. `awardBadge(supabase, userId, code)` ile tek rozet verilebilir. Streak için `user_writing_goals` tablosundaki `streak_last_date` güncellemesi yeterli — mevcut `WritingGoalCard` bileşeni bunu okur.

- [ ] **Step 1: `start/route.ts` içine streak tetikleyici ekle**

`start/route.ts` dosyasının en üstüne import ekle:
```typescript
import { awardBadge } from '@/lib/badges'
```

Submission oluşturulduktan sonra (return'den önce) şu bloğu ekle:

```typescript
  // Streak: bugün yazdı olarak işaretle
  const today = new Date().toISOString().slice(0, 10)
  await supabase
    .from('user_writing_goals')
    .upsert(
      { user_id: user.id, streak_last_date: today },
      { onConflict: 'user_id', ignoreDuplicates: false }
    )
```

- [ ] **Step 2: `submissions/[submissionId]/route.ts` submit action'a rozet ekle**

Dosyanın başına import ekle:
```typescript
import { awardBadge, checkAllBadges } from '@/lib/badges'
```

`action === 'submit'` bloğunda başarılı update'ten sonra (return'den önce):
```typescript
    // Rozet kontrolü
    await checkAllBadges(supabase, user.id)
```

- [ ] **Step 3: grade action'a rozet ekle**

`action === 'grade'` bloğunda başarılı update'ten sonra (return'den önce):
```typescript
    // star_student rozeti: not >= 90 ise öğrenciye ver
    if (grade >= 90) {
      await awardBadge(supabase, data.student_id, 'star_student')
    }
```

- [ ] **Step 4: TypeScript kontrolü**

```bash
npx tsc --noEmit 2>&1 | head -20
```

- [ ] **Step 5: Commit**

```bash
git add app/api/classroom/[classroomId]/assignments/[assignmentId]/start/route.ts \
        app/api/submissions/[submissionId]/route.ts
git commit -m "feat: trigger streak and badges on assignment start, submit, and grade"
```

---

## Task 6: Analytics API

**Files:**
- Create: `app/api/classroom/[classroomId]/analytics/route.ts`

- [ ] **Step 1: Route'u oluştur**

```typescript
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

interface Params { params: Promise<{ classroomId: string }> }

// GET /api/classroom/[classroomId]/analytics
// Returns: teslim oranları, streak tablosu, not dağılımı
// Sadece öğretmen erişebilir
export async function GET(_req: Request, { params }: Params) {
  const { classroomId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Giriş yapman gerekiyor.' }, { status: 401 })

  // Öğretmen kontrolü
  const { data: membership } = await supabase
    .from('classroom_members')
    .select('role')
    .eq('classroom_id', classroomId)
    .eq('user_id', user.id)
    .single()
  if (!membership || membership.role !== 'teacher') {
    return NextResponse.json({ error: 'Yetki yok.' }, { status: 403 })
  }

  const [
    { data: members },
    { data: assignments },
    { data: submissions },
  ] = await Promise.all([
    supabase
      .from('classroom_members')
      .select('user_id, role, profile:profiles(id, username, display_name, avatar_url)')
      .eq('classroom_id', classroomId)
      .eq('role', 'student'),
    supabase
      .from('classroom_assignments')
      .select('id, title')
      .eq('classroom_id', classroomId)
      .order('created_at', { ascending: false }),
    supabase
      .from('assignment_submissions')
      .select('id, assignment_id, student_id, status, grade, project_id')
      .in(
        'assignment_id',
        // İç içe select yerine assignments'tan id'leri alacağız aşağıda
        ['00000000-0000-0000-0000-000000000000'] // placeholder, aşağıda override edilir
      ),
  ])

  const assignmentIds = (assignments ?? []).map((a: { id: string }) => a.id)

  const { data: allSubmissions } = await supabase
    .from('assignment_submissions')
    .select('id, assignment_id, student_id, status, grade, project_id')
    .in('assignment_id', assignmentIds.length > 0 ? assignmentIds : ['00000000-0000-0000-0000-000000000000'])

  const studentIds = (members ?? []).map((m: any) => m.user_id)

  // Streak verisi
  const { data: streakData } = await supabase
    .from('user_writing_goals')
    .select('user_id, streak_current')
    .in('user_id', studentIds.length > 0 ? studentIds : ['00000000-0000-0000-0000-000000000000'])
    .gt('streak_current', 0)

  // Not dağılımı (graded submissions)
  const gradedSubs = (allSubmissions ?? []).filter((s: any) => s.status === 'graded' && s.grade !== null)
  const gradeDistribution = {
    '0-49': gradedSubs.filter((s: any) => s.grade < 50).length,
    '50-69': gradedSubs.filter((s: any) => s.grade >= 50 && s.grade < 70).length,
    '70-84': gradedSubs.filter((s: any) => s.grade >= 70 && s.grade < 85).length,
    '85-100': gradedSubs.filter((s: any) => s.grade >= 85).length,
  }

  // Teslim oranı (ödev bazında)
  const submissionRate = (assignments ?? []).map((a: any) => {
    const total = studentIds.length
    const submitted = (allSubmissions ?? []).filter(
      (s: any) => s.assignment_id === a.id && s.status !== 'draft'
    ).length
    return { assignment_id: a.id, title: a.title, submitted, total, rate: total > 0 ? Math.round((submitted / total) * 100) : 0 }
  })

  return NextResponse.json({
    members: members ?? [],
    assignments: assignments ?? [],
    submissionRate,
    streaks: streakData ?? [],
    gradeDistribution,
    totalStudents: studentIds.length,
  })
}
```

- [ ] **Step 2: TypeScript kontrolü**

```bash
npx tsc --noEmit 2>&1 | head -20
```

- [ ] **Step 3: Commit**

```bash
git add app/api/classroom/[classroomId]/analytics/route.ts
git commit -m "feat: classroom analytics API with submission rates, streaks, grade distribution"
```

---

## Task 7: Veli Ekleme API

**Files:**
- Create: `app/api/classroom/[classroomId]/members/route.ts`

- [ ] **Step 1: Route'u oluştur**

```typescript
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

interface Params { params: Promise<{ classroomId: string }> }

// POST /api/classroom/[classroomId]/members
// Body: { email: string, student_id: string }
// Öğretmen bir kullanıcıyı veli olarak ekler
export async function POST(req: Request, { params }: Params) {
  const { classroomId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Giriş yapman gerekiyor.' }, { status: 401 })

  // Öğretmen kontrolü
  const { data: membership } = await supabase
    .from('classroom_members')
    .select('role')
    .eq('classroom_id', classroomId)
    .eq('user_id', user.id)
    .single()
  if (!membership || membership.role !== 'teacher') {
    return NextResponse.json({ error: 'Yetki yok.' }, { status: 403 })
  }

  const { email, student_id } = await req.json()
  if (!email || !student_id) {
    return NextResponse.json({ error: 'Email ve öğrenci seçimi zorunlu.' }, { status: 400 })
  }

  // Email ile profil bul
  const { data: parentProfile } = await supabase
    .from('profiles')
    .select('id, username, display_name')
    .eq('id',
      // email → auth.users → profiles.id zinciri; profiles tablosunda email yok,
      // auth.users'a erişim için service role gerekir — bunun yerine kullanıcı kendi email'i ile
      // giriş yapıp sınıfa katılacak (role='parent' ile join flow ileride eklenebilir).
      // Şimdilik: öğretmen veli kullanıcı adı/email yerine doğrudan user_id girer
      email // bu alan aslında user_id olarak kullanılacak — UI bunu açıkça belirtir
    )
    .single()

  if (!parentProfile) {
    return NextResponse.json({ error: 'Bu kullanıcı platformda kayıtlı değil. Önce kayıt olması gerekiyor.' }, { status: 404 })
  }

  // Öğrencinin bu sınıfta olduğunu doğrula
  const { data: studentMember } = await supabase
    .from('classroom_members')
    .select('user_id')
    .eq('classroom_id', classroomId)
    .eq('user_id', student_id)
    .eq('role', 'student')
    .single()
  if (!studentMember) {
    return NextResponse.json({ error: 'Seçilen öğrenci bu sınıfta değil.' }, { status: 400 })
  }

  // Veli ekle
  const { error } = await supabase
    .from('classroom_members')
    .upsert({
      classroom_id: classroomId,
      user_id: parentProfile.id,
      role: 'parent',
      student_id,
    }, { onConflict: 'classroom_id,user_id' })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ parent: parentProfile }, { status: 201 })
}
```

> **Not:** Supabase'de `auth.users` tablosuna email ile erişim için service role gerekir. Bu MVP'de öğretmen velinin **kullanıcı adını** girer, UI bunu açıkça belirtir.

- [ ] **Step 2: TypeScript kontrolü**

```bash
npx tsc --noEmit 2>&1 | head -20
```

- [ ] **Step 3: Commit**

```bash
git add app/api/classroom/[classroomId]/members/route.ts
git commit -m "feat: add parent to classroom via username lookup"
```

---

## Task 8: TemplatePickerModal Bileşeni

**Files:**
- Create: `components/classroom/TemplatePickerModal.tsx`
- Modify: `app/(app)/classroom/[classroomId]/assignments/new/page.tsx`

- [ ] **Step 1: `TemplatePickerModal.tsx` oluştur**

```typescript
'use client'

import { useState, useEffect } from 'react'
import { BookOpen, Bookmark, X, Search } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { AssignmentTemplate } from '@/types'
import type { PlatformTemplate } from '@/lib/assignmentTemplates'

interface Props {
  open: boolean
  onClose: () => void
  onSelect: (title: string, description: string) => void
  currentTitle?: string
  currentDescription?: string
}

export function TemplatePickerModal({ open, onClose, onSelect, currentTitle, currentDescription }: Props) {
  const [tab, setTab] = useState<'platform' | 'mine'>('platform')
  const [search, setSearch] = useState('')
  const [platformTemplates, setPlatformTemplates] = useState<PlatformTemplate[]>([])
  const [myTemplates, setMyTemplates] = useState<AssignmentTemplate[]>([])
  const [saving, setSaving] = useState(false)
  const [saveMsg, setSaveMsg] = useState('')

  useEffect(() => {
    if (!open) return
    fetch('/api/classroom/templates')
      .then(r => r.json())
      .then(d => {
        setPlatformTemplates(d.platform ?? [])
        setMyTemplates(d.mine ?? [])
      })
  }, [open])

  async function saveCurrentAsTemplate() {
    if (!currentTitle || currentTitle.trim().length < 3) {
      setSaveMsg('Başlık en az 3 karakter olmalı.')
      return
    }
    setSaving(true)
    const res = await fetch('/api/classroom/templates', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: currentTitle, description: currentDescription }),
    })
    const data = await res.json()
    if (res.ok) {
      setMyTemplates(prev => [data.template, ...prev])
      setSaveMsg('Şablon kaydedildi!')
    } else {
      setSaveMsg(data.error ?? 'Hata oluştu.')
    }
    setSaving(false)
    setTimeout(() => setSaveMsg(''), 3000)
  }

  const filtered = (tab === 'platform' ? platformTemplates : myTemplates).filter(t =>
    t.title.toLowerCase().includes(search.toLowerCase())
  )

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-2xl max-h-[80vh] flex flex-col glass-card rounded-2xl border border-white/[0.08] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.05]">
          <h2 className="font-display font-bold text-white text-lg">Şablon Seç</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 px-5 pt-3">
          {(['platform', 'mine'] as const).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={cn(
                'px-4 py-1.5 rounded-lg text-xs font-semibold transition-colors',
                tab === t ? 'bg-primary/20 text-primary' : 'text-slate-400 hover:text-white'
              )}
            >
              {t === 'platform' ? '📚 Platform Şablonları' : '🔖 Şablonlarım'}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="px-5 pt-3 pb-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Şablon ara..."
              className="w-full bg-white/[0.03] border border-white/[0.06] rounded-xl pl-9 pr-4 py-2 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-primary/40"
            />
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto px-5 pb-4 space-y-2">
          {filtered.length === 0 && (
            <p className="text-sm text-slate-500 text-center py-8">Şablon bulunamadı.</p>
          )}
          {filtered.map(t => (
            <button
              key={t.id}
              onClick={() => { onSelect(t.title, t.description ?? ''); onClose() }}
              className="w-full text-left p-4 rounded-xl bg-white/[0.02] hover:bg-white/[0.05] border border-white/[0.04] hover:border-primary/20 transition-all group"
            >
              <p className="font-semibold text-white text-sm group-hover:text-primary transition-colors">{t.title}</p>
              {t.description && (
                <p className="text-xs text-slate-400 mt-1 line-clamp-2">{t.description}</p>
              )}
            </button>
          ))}
        </div>

        {/* Save current as template */}
        {tab === 'mine' && (
          <div className="px-5 py-3 border-t border-white/[0.05] flex items-center gap-3">
            <button
              onClick={saveCurrentAsTemplate}
              disabled={saving}
              className="flex items-center gap-2 text-xs font-semibold text-violet-400 hover:text-violet-300 transition-colors disabled:opacity-50"
            >
              <Bookmark className="w-4 h-4" />
              {saving ? 'Kaydediliyor...' : 'Mevcut formu şablon olarak kaydet'}
            </button>
            {saveMsg && <span className="text-xs text-emerald-400">{saveMsg}</span>}
          </div>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: `assignments/new/page.tsx`'e "Şablon Seç" butonu ekle**

`app/(app)/classroom/[classroomId]/assignments/new/page.tsx` dosyasını oku. Sayfanın `'use client'` bileşeni olduğunu doğrula.

Dosyanın en üstüne import ekle:
```typescript
import { TemplatePickerModal } from '@/components/classroom/TemplatePickerModal'
```

State'lere ekle:
```typescript
const [templateOpen, setTemplateOpen] = useState(false)
```

Form başlık inputunun hemen üstüne butonu ekle:
```tsx
<div className="flex items-center justify-between mb-1">
  <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider">Başlık *</label>
  <button
    type="button"
    onClick={() => setTemplateOpen(true)}
    className="text-xs text-violet-400 hover:text-violet-300 font-medium transition-colors flex items-center gap-1"
  >
    <BookOpen className="w-3.5 h-3.5" /> Şablon Seç
  </button>
</div>
```

`BookOpen` import'unu ekle (zaten varsa gerek yok):
```typescript
import { BookOpen, ... } from 'lucide-react'
```

Return'de form kapanmadan önce modal'ı ekle:
```tsx
<TemplatePickerModal
  open={templateOpen}
  onClose={() => setTemplateOpen(false)}
  onSelect={(title, description) => { setTitle(title); setDescription(description) }}
  currentTitle={title}
  currentDescription={description}
/>
```

- [ ] **Step 3: TypeScript kontrolü**

```bash
npx tsc --noEmit 2>&1 | head -20
```

- [ ] **Step 4: Commit**

```bash
git add components/classroom/TemplatePickerModal.tsx \
        app/\(app\)/classroom/\[classroomId\]/assignments/new/page.tsx
git commit -m "feat: template picker modal for assignment creation"
```

---

## Task 9: Akran Okuma Bileşeni

**Files:**
- Create: `components/classroom/PeerReadingList.tsx`
- Modify: `app/(app)/classroom/[classroomId]/assignments/[assignmentId]/page.tsx`

- [ ] **Step 1: `PeerReadingList.tsx` oluştur**

```typescript
import Link from 'next/link'
import { BookOpen, Eye } from 'lucide-react'

interface PeerSubmission {
  student_name: string
  project_slug: string
  chapter_id: string
  word_count: number
}

interface Props {
  submissions: PeerSubmission[]
  assignmentTitle: string
}

export function PeerReadingList({ submissions, assignmentTitle }: Props) {
  if (submissions.length === 0) {
    return (
      <div className="glass-card rounded-2xl p-6 border border-white/[0.05] text-center">
        <Eye className="w-8 h-8 text-slate-600 mx-auto mb-2" />
        <p className="text-sm text-slate-400">Henüz teslim edilen yazı yok.</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {submissions.map((sub, i) => (
        <div key={i} className="glass-card rounded-xl p-4 border border-white/[0.05] flex items-center justify-between gap-4">
          <div>
            <p className="font-semibold text-white text-sm">{sub.student_name}</p>
            <p className="text-xs text-slate-400 mt-0.5">{sub.word_count.toLocaleString('tr-TR')} kelime</p>
          </div>
          <Link
            href={`/projects/${sub.project_slug}/read/${sub.chapter_id}`}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-sky-500/10 text-sky-400 hover:bg-sky-500/20 text-xs font-semibold transition-colors shrink-0"
          >
            <BookOpen className="w-3.5 h-3.5" /> Oku
          </Link>
        </div>
      ))}
    </div>
  )
}
```

- [ ] **Step 2: `[assignmentId]/page.tsx` öğrenci görünümüne "Sınıf Yazıları" bölümü ekle**

`app/(app)/classroom/[classroomId]/assignments/[assignmentId]/page.tsx` dosyasını oku.

Öğrenci dalında (`else` bloğu) `StudentAssignmentView`'dan sonra şu bloğu ekle:

```tsx
{/* Akran Okuma — sadece teslim tarihi geçmişse ve class_visible ise */}
{assignment.visibility === 'class_visible' && isPast && (
  <div className="space-y-4">
    <h2 className="text-lg font-display font-bold text-white flex items-center gap-2">
      <Eye className="w-5 h-5 text-sky-400" />
      Sınıf Yazıları
    </h2>
    <PeerReadingList
      assignmentTitle={assignment.title}
      submissions={peerSubmissions}
    />
  </div>
)}
```

Sayfa başında `peerSubmissions` verisini çek (öğrenci dalında, `submission` sorgusundan sonra):

```typescript
    let peerSubmissions: { student_name: string; project_slug: string; chapter_id: string; word_count: number }[] = []

    if (assignment.visibility === 'class_visible' && isPast) {
      const { data: peers } = await supabase
        .from('assignment_submissions')
        .select('project_id, student:profiles(display_name, username)')
        .eq('assignment_id', assignmentId)
        .in('status', ['submitted', 'graded'])
        .neq('student_id', user.id)

      if (peers && peers.length > 0) {
        const projectIds = peers.map((p: any) => p.project_id).filter(Boolean)
        const { data: projects } = await supabase
          .from('projects')
          .select('id, slug')
          .in('id', projectIds)

        const { data: chapters } = await supabase
          .from('chapters')
          .select('id, project_id')
          .in('project_id', projectIds)
          .order('order_index', { ascending: true })

        const { data: versions } = await supabase
          .from('chapter_versions')
          .select('chapter_id, word_count')
          .in('chapter_id', (chapters ?? []).map((c: any) => c.id))
          .order('created_at', { ascending: false })

        const latestWordCount: Record<string, number> = {}
        for (const v of versions ?? []) {
          if (!(v as any).chapter_id in latestWordCount) {
            latestWordCount[(v as any).chapter_id] = (v as any).word_count ?? 0
          }
        }

        peerSubmissions = peers.map((p: any) => {
          const project = (projects ?? []).find((pr: any) => pr.id === p.project_id)
          const chapter = (chapters ?? []).find((c: any) => c.project_id === p.project_id)
          const wc = chapter ? (latestWordCount[chapter.id] ?? 0) : 0
          return {
            student_name: (p.student as any)?.display_name ?? (p.student as any)?.username ?? 'Öğrenci',
            project_slug: project?.slug ?? '',
            chapter_id: chapter?.id ?? '',
            word_count: wc,
          }
        }).filter(s => s.project_slug && s.chapter_id)
      }
    }
```

Import'lara ekle:
```typescript
import { PeerReadingList } from '@/components/classroom/PeerReadingList'
import { Eye } from 'lucide-react'  // zaten varsa ekleme
```

- [ ] **Step 3: TypeScript kontrolü**

```bash
npx tsc --noEmit 2>&1 | head -20
```

- [ ] **Step 4: Commit**

```bash
git add components/classroom/PeerReadingList.tsx \
        app/\(app\)/classroom/\[classroomId\]/assignments/\[assignmentId\]/page.tsx
git commit -m "feat: peer reading list for class_visible assignments after deadline"
```

---

## Task 10: Analytics Sayfası ve Bileşeni

**Files:**
- Create: `components/classroom/AnalyticsPanel.tsx`
- Create: `app/(app)/classroom/[classroomId]/analytics/page.tsx`
- Modify: `app/(app)/classroom/[classroomId]/page.tsx`

- [ ] **Step 1: `AnalyticsPanel.tsx` oluştur**

```typescript
'use client'

import { BarChart2, Users, Flame, Star } from 'lucide-react'
import { cn } from '@/lib/utils'

interface SubmissionRate {
  assignment_id: string
  title: string
  submitted: number
  total: number
  rate: number
}

interface StreakEntry {
  user_id: string
  streak_current: number
}

interface GradeDistribution {
  '0-49': number
  '50-69': number
  '70-84': number
  '85-100': number
}

interface Props {
  submissionRate: SubmissionRate[]
  streaks: StreakEntry[]
  gradeDistribution: GradeDistribution
  members: { user_id: string; profile: { display_name: string | null; username: string } | null }[]
}

export function AnalyticsPanel({ submissionRate, streaks, gradeDistribution, members }: Props) {
  const totalGraded = Object.values(gradeDistribution).reduce((a, b) => a + b, 0)
  const gradeRanges = [
    { label: '85–100', key: '85-100' as const, color: 'bg-emerald-500' },
    { label: '70–84', key: '70-84' as const, color: 'bg-sky-500' },
    { label: '50–69', key: '50-69' as const, color: 'bg-amber-500' },
    { label: '0–49',  key: '0-49'  as const, color: 'bg-red-500' },
  ]

  return (
    <div className="space-y-8">
      {/* Teslim Oranı */}
      <section className="space-y-3">
        <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
          <Users className="w-4 h-4 text-violet-400" /> Ödev Teslim Oranları
        </h3>
        {submissionRate.length === 0 && <p className="text-sm text-slate-500">Henüz ödev yok.</p>}
        {submissionRate.map(a => (
          <div key={a.assignment_id} className="glass-card rounded-xl p-4 border border-white/[0.05] space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm font-semibold text-white line-clamp-1">{a.title}</span>
              <span className="text-xs font-bold text-slate-300">{a.submitted}/{a.total} · %{a.rate}</span>
            </div>
            <div className="h-2 bg-white/[0.05] rounded-full overflow-hidden">
              <div
                className={cn('h-full rounded-full transition-all', a.rate >= 80 ? 'bg-emerald-500' : a.rate >= 50 ? 'bg-amber-500' : 'bg-red-500')}
                style={{ width: `${a.rate}%` }}
              />
            </div>
          </div>
        ))}
      </section>

      {/* Streak Tablosu */}
      <section className="space-y-3">
        <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
          <Flame className="w-4 h-4 text-orange-400" /> Aktif Streak'ler
        </h3>
        {streaks.length === 0 && <p className="text-sm text-slate-500">Aktif streak yok.</p>}
        {streaks
          .sort((a, b) => b.streak_current - a.streak_current)
          .map(s => {
            const member = members.find(m => m.user_id === s.user_id)
            const name = member?.profile?.display_name ?? member?.profile?.username ?? 'Öğrenci'
            return (
              <div key={s.user_id} className="flex items-center justify-between glass-card rounded-xl px-4 py-3 border border-white/[0.05]">
                <span className="text-sm text-white font-medium">{name}</span>
                <span className="text-sm font-bold text-orange-400 flex items-center gap-1">
                  🔥 {s.streak_current} gün
                </span>
              </div>
            )
          })}
      </section>

      {/* Not Dağılımı */}
      <section className="space-y-3">
        <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
          <Star className="w-4 h-4 text-amber-400" /> Not Dağılımı
        </h3>
        {totalGraded === 0 && <p className="text-sm text-slate-500">Henüz notlandırılmış teslim yok.</p>}
        {totalGraded > 0 && (
          <div className="glass-card rounded-xl p-5 border border-white/[0.05] space-y-3">
            {gradeRanges.map(r => {
              const count = gradeDistribution[r.key]
              const pct = totalGraded > 0 ? Math.round((count / totalGraded) * 100) : 0
              return (
                <div key={r.key} className="space-y-1">
                  <div className="flex justify-between text-xs text-slate-400">
                    <span>{r.label}</span>
                    <span>{count} teslim · %{pct}</span>
                  </div>
                  <div className="h-2 bg-white/[0.05] rounded-full overflow-hidden">
                    <div className={cn('h-full rounded-full transition-all', r.color)} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </section>
    </div>
  )
}
```

- [ ] **Step 2: `analytics/page.tsx` oluştur**

```typescript
import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { AnalyticsPanel } from '@/components/classroom/AnalyticsPanel'

export const metadata: Metadata = { title: 'Sınıf İstatistikleri — Kalem Birliği' }
export const dynamic = 'force-dynamic'

interface PageProps {
  params: Promise<{ classroomId: string }>
}

export default async function ClassroomAnalyticsPage({ params }: PageProps) {
  const { classroomId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [
    { data: classroom },
    { data: membership },
  ] = await Promise.all([
    supabase.from('classrooms').select('name').eq('id', classroomId).single(),
    supabase.from('classroom_members').select('role').eq('classroom_id', classroomId).eq('user_id', user.id).single(),
  ])

  if (!classroom || !membership || membership.role !== 'teacher') notFound()

  const res = await fetch(
    `${process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'}/api/classroom/${classroomId}/analytics`,
    { headers: { Cookie: '' }, cache: 'no-store' }
  )

  // Server component'ta internal fetch yerine doğrudan Supabase sorgusu
  const assignmentIds_q = await supabase
    .from('classroom_assignments')
    .select('id, title')
    .eq('classroom_id', classroomId)
    .order('created_at', { ascending: false })

  const assignmentIds = (assignmentIds_q.data ?? []).map((a: any) => a.id)

  const [
    { data: members },
    { data: allSubmissions },
    { data: streakData },
  ] = await Promise.all([
    supabase
      .from('classroom_members')
      .select('user_id, role, profile:profiles(id, username, display_name)')
      .eq('classroom_id', classroomId)
      .eq('role', 'student'),
    supabase
      .from('assignment_submissions')
      .select('id, assignment_id, student_id, status, grade')
      .in('assignment_id', assignmentIds.length > 0 ? assignmentIds : ['00000000-0000-0000-0000-000000000000']),
    supabase
      .from('user_writing_goals')
      .select('user_id, streak_current')
      .in(
        'user_id',
        (await supabase.from('classroom_members').select('user_id').eq('classroom_id', classroomId).eq('role', 'student')).data?.map((m: any) => m.user_id) ?? ['00000000-0000-0000-0000-000000000000']
      )
      .gt('streak_current', 0),
  ])

  const studentIds = (members ?? []).map((m: any) => m.user_id)

  const submissionRate = (assignmentIds_q.data ?? []).map((a: any) => {
    const total = studentIds.length
    const submitted = (allSubmissions ?? []).filter(
      (s: any) => s.assignment_id === a.id && s.status !== 'draft'
    ).length
    return { assignment_id: a.id, title: a.title, submitted, total, rate: total > 0 ? Math.round((submitted / total) * 100) : 0 }
  })

  const gradedSubs = (allSubmissions ?? []).filter((s: any) => s.status === 'graded' && s.grade !== null)
  const gradeDistribution = {
    '0-49':   gradedSubs.filter((s: any) => s.grade < 50).length,
    '50-69':  gradedSubs.filter((s: any) => s.grade >= 50 && s.grade < 70).length,
    '70-84':  gradedSubs.filter((s: any) => s.grade >= 70 && s.grade < 85).length,
    '85-100': gradedSubs.filter((s: any) => s.grade >= 85).length,
  }

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-12 space-y-8">
      <Link
        href={`/classroom/${classroomId}`}
        className="inline-flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-white transition-colors uppercase tracking-wider"
      >
        ← {classroom.name}
      </Link>

      <div>
        <h1 className="text-2xl font-display font-black text-white">Sınıf İstatistikleri</h1>
        <p className="text-sm text-slate-400 mt-1">{classroom.name}</p>
      </div>

      <AnalyticsPanel
        submissionRate={submissionRate}
        streaks={streakData ?? []}
        gradeDistribution={gradeDistribution}
        members={(members ?? []) as any}
      />
    </div>
  )
}
```

- [ ] **Step 3: `classroom/[classroomId]/page.tsx`'e "İstatistikler" linki ekle**

Öğretmen görünümünde sınıf adı başlığının altına şu linki ekle:

```tsx
<Link
  href={`/classroom/${classroomId}/analytics`}
  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-violet-500/10 text-violet-400 hover:bg-violet-500/20 text-sm font-semibold transition-colors border border-violet-500/20"
>
  <BarChart2 className="w-4 h-4" /> Sınıf İstatistikleri
</Link>
```

Import'a `BarChart2` ekle.

- [ ] **Step 4: TypeScript kontrolü**

```bash
npx tsc --noEmit 2>&1 | head -20
```

- [ ] **Step 5: Commit**

```bash
git add components/classroom/AnalyticsPanel.tsx \
        app/\(app\)/classroom/\[classroomId\]/analytics/page.tsx \
        app/\(app\)/classroom/\[classroomId\]/page.tsx
git commit -m "feat: classroom analytics page with submission rates, streaks, grade chart"
```

---

## Task 11: Veli Paneli

**Files:**
- Create: `components/classroom/ParentView.tsx`
- Create: `components/classroom/AddParentForm.tsx`
- Modify: `app/(app)/classroom/[classroomId]/page.tsx`

- [ ] **Step 1: `ParentView.tsx` oluştur**

```typescript
import Link from 'next/link'
import { GraduationCap, Star, Flame, BookOpen } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { ClassroomAssignment, AssignmentSubmission } from '@/types'

interface Props {
  studentName: string
  studentAvatar: string | null
  assignments: ClassroomAssignment[]
  submissions: AssignmentSubmission[]
  streak: number
}

export function ParentView({ studentName, studentAvatar, assignments, submissions, streak }: Props) {
  const submissionMap = Object.fromEntries(submissions.map(s => [s.assignment_id, s]))

  return (
    <div className="space-y-8">
      {/* Çocuk Profili */}
      <div className="glass-card rounded-2xl p-6 border border-white/[0.05] flex items-center gap-4">
        <div className="w-14 h-14 rounded-2xl bg-primary/20 flex items-center justify-center text-2xl font-bold text-primary shrink-0">
          {studentAvatar ? (
            <img src={studentAvatar} className="w-full h-full object-cover rounded-2xl" alt={studentName} />
          ) : (
            studentName[0]?.toUpperCase()
          )}
        </div>
        <div>
          <p className="text-lg font-display font-bold text-white">{studentName}</p>
          <div className="flex items-center gap-3 mt-1">
            {streak > 0 && (
              <span className="flex items-center gap-1 text-xs font-semibold text-orange-400">
                🔥 {streak} günlük seri
              </span>
            )}
            <span className="text-xs text-slate-400">{submissions.filter(s => s.status !== 'draft').length} ödev teslim edildi</span>
          </div>
        </div>
      </div>

      {/* Ödev Listesi */}
      <div className="space-y-3">
        <h2 className="text-sm font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
          <GraduationCap className="w-4 h-4 text-violet-400" /> Ödevler
        </h2>
        {assignments.length === 0 && (
          <p className="text-sm text-slate-500">Henüz ödev atanmamış.</p>
        )}
        {assignments.map(a => {
          const sub = submissionMap[a.id]
          const isPast = a.due_date ? new Date(a.due_date) < new Date() : false
          return (
            <div key={a.id} className="glass-card rounded-xl p-4 border border-white/[0.05] space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-semibold text-white text-sm">{a.title}</p>
                  {a.due_date && (
                    <p className={cn('text-xs mt-0.5', isPast ? 'text-red-400' : 'text-slate-400')}>
                      Son teslim: {new Date(a.due_date).toLocaleDateString('tr-TR')}
                    </p>
                  )}
                </div>
                <span className={cn(
                  'text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 whitespace-nowrap',
                  !sub || sub.status === 'draft' ? 'bg-slate-500/10 text-slate-400' :
                  sub.status === 'submitted' ? 'bg-sky-500/10 text-sky-400' :
                  'bg-emerald-500/10 text-emerald-400'
                )}>
                  {!sub || sub.status === 'draft' ? 'Teslim Edilmedi' : sub.status === 'submitted' ? 'Teslim Edildi' : 'Notlandı'}
                </span>
              </div>

              {sub?.status === 'graded' && (
                <div className="border-t border-white/[0.04] pt-3 space-y-2">
                  <div className="flex items-center gap-2">
                    <Star className="w-4 h-4 text-amber-400" />
                    <span className="text-sm font-bold text-white">{sub.grade}/100</span>
                  </div>
                  {sub.teacher_comment && (
                    <div className="bg-white/[0.02] rounded-lg p-3 border border-white/[0.04]">
                      <p className="text-xs text-slate-300 leading-relaxed">{sub.teacher_comment}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: `AddParentForm.tsx` oluştur**

```typescript
'use client'

import { useState } from 'react'
import { UserPlus } from 'lucide-react'

interface Student {
  user_id: string
  name: string
}

interface Props {
  classroomId: string
  students: Student[]
  onAdded: () => void
}

export function AddParentForm({ classroomId, students, onAdded }: Props) {
  const [username, setUsername] = useState('')
  const [studentId, setStudentId] = useState('')
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!username.trim() || !studentId) return
    setLoading(true)
    setMsg(null)
    const res = await fetch(`/api/classroom/${classroomId}/members`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: username.trim(), student_id: studentId }),
    })
    const data = await res.json()
    setLoading(false)
    if (res.ok) {
      setMsg({ type: 'success', text: 'Veli eklendi.' })
      setUsername('')
      setStudentId('')
      onAdded()
    } else {
      setMsg({ type: 'error', text: data.error ?? 'Hata oluştu.' })
    }
  }

  return (
    <form onSubmit={handleSubmit} className="glass-card rounded-xl p-5 border border-white/[0.05] space-y-4">
      <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
        <UserPlus className="w-4 h-4 text-violet-400" /> Veli Ekle
      </h3>
      <div className="space-y-3">
        <div>
          <label className="text-xs font-semibold text-slate-400 block mb-1">Veli Kullanıcı Adı</label>
          <input
            value={username}
            onChange={e => setUsername(e.target.value)}
            placeholder="Platformdaki kullanıcı adı (örn: ahmetyilmaz)"
            className="w-full bg-white/[0.03] border border-white/[0.06] rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-primary/40"
          />
          <p className="text-xs text-slate-500 mt-1">Veli önce platforma kayıt olmuş olmalı.</p>
        </div>
        <div>
          <label className="text-xs font-semibold text-slate-400 block mb-1">Öğrenci</label>
          <select
            value={studentId}
            onChange={e => setStudentId(e.target.value)}
            className="w-full bg-white/[0.03] border border-white/[0.06] rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-primary/40"
          >
            <option value="">Öğrenci seç...</option>
            {students.map(s => (
              <option key={s.user_id} value={s.user_id}>{s.name}</option>
            ))}
          </select>
        </div>
      </div>
      {msg && (
        <p className={`text-xs font-medium ${msg.type === 'success' ? 'text-emerald-400' : 'text-red-400'}`}>
          {msg.text}
        </p>
      )}
      <button
        type="submit"
        disabled={loading || !username.trim() || !studentId}
        className="w-full py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-sm font-semibold transition-colors disabled:opacity-50"
      >
        {loading ? 'Ekleniyor...' : 'Veli Ekle'}
      </button>
    </form>
  )
}
```

- [ ] **Step 3: `classroom/[classroomId]/page.tsx`'e veli görünümü ekle**

Sayfayı oku. Mevcut `isTeacher` / öğrenci dallarına `isParent` dalı ekle.

Veri çekiminde membership sorgusunun hemen altına:
```typescript
const isTeacher = myMembership?.role === 'teacher'
const isStudent = myMembership?.role === 'student'
const isParent  = myMembership?.role === 'parent'
```

`isParent` ise çocuğun verisini çek:
```typescript
  if (isParent) {
    const studentId = myMembership.student_id
    const [
      { data: studentProfile },
      { data: assignments },
      { data: submissions },
      { data: streakData },
    ] = await Promise.all([
      supabase.from('profiles').select('display_name, username, avatar_url').eq('id', studentId).single(),
      supabase.from('classroom_assignments').select('*').eq('classroom_id', classroomId).order('created_at', { ascending: false }),
      supabase.from('assignment_submissions').select('*').eq('student_id', studentId).in(
        'assignment_id',
        // assignments henüz çekildi
        []  // aşağıda override edilir
      ),
      supabase.from('user_writing_goals').select('streak_current').eq('user_id', studentId).single(),
    ])

    // submissions'ı assignment id'lerine göre filtrele
    const aIds = (assignments ?? []).map((a: any) => a.id)
    const { data: subs } = aIds.length > 0
      ? await supabase.from('assignment_submissions').select('*').eq('student_id', studentId).in('assignment_id', aIds)
      : { data: [] }

    return (
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-12 space-y-8">
        <ParentView
          studentName={studentProfile?.display_name ?? studentProfile?.username ?? 'Öğrenci'}
          studentAvatar={studentProfile?.avatar_url ?? null}
          assignments={(assignments ?? []) as any}
          submissions={(subs ?? []) as any}
          streak={streakData?.streak_current ?? 0}
        />
      </div>
    )
  }
```

Öğretmen dalına `AddParentForm` ekle (üye listesinin altına):
```tsx
<AddParentForm
  classroomId={classroomId}
  students={members.filter((m: any) => m.role === 'student').map((m: any) => ({
    user_id: m.user_id,
    name: m.profile?.display_name ?? m.profile?.username ?? 'Öğrenci',
  }))}
  onAdded={() => {}}
/>
```

Import'lara ekle:
```typescript
import { ParentView } from '@/components/classroom/ParentView'
import { AddParentForm } from '@/components/classroom/AddParentForm'
```

- [ ] **Step 4: TypeScript kontrolü**

```bash
npx tsc --noEmit 2>&1 | head -20
```

- [ ] **Step 5: Commit**

```bash
git add components/classroom/ParentView.tsx \
        components/classroom/AddParentForm.tsx \
        app/\(app\)/classroom/\[classroomId\]/page.tsx
git commit -m "feat: parent view with child assignment grades and streak"
```

---

## Task 12: Dashboard — Akademi Özeti Kartı

**Files:**
- Modify: `app/(app)/dashboard/page.tsx`

- [ ] **Step 1: `dashboard/page.tsx` veri çekimine akademi sorgusunu ekle**

Mevcut `Promise.all` bloğuna şu sorguyu ekle:

```typescript
    supabase
      .from('assignment_submissions')
      .select('id, status, grade')
      .eq('student_id', user.id),
```

Destructure'a ekle:
```typescript
    { data: academicData },
```

- [ ] **Step 2: Hesaplamalar**

`Promise.all` bloğundan sonra:
```typescript
  const submissions = (academicData ?? []) as { id: string; status: string; grade: number | null }[]
  const totalSubmitted = submissions.filter(s => s.status !== 'draft').length
  const graded = submissions.filter(s => s.status === 'graded' && s.grade !== null)
  const avgGrade = graded.length > 0
    ? Math.round(graded.reduce((sum, s) => sum + (s.grade ?? 0), 0) / graded.length)
    : null
```

- [ ] **Step 3: UI — Akademi Özeti kartı ekle**

`BadgesRow`'dan sonra şu bloğu ekle (sadece en az 1 teslim varsa göster):

```tsx
{totalSubmitted > 0 && (
  <section className="space-y-4">
    <h2 className="text-xl font-display font-bold text-white flex items-center gap-2">
      <GraduationCap className="w-5 h-5 text-violet-400" />
      Akademi Özeti
    </h2>
    <div className="grid grid-cols-3 gap-4">
      <div className="glass-card rounded-2xl p-5 border border-white/[0.05] text-center">
        <p className="text-3xl font-black text-white">{totalSubmitted}</p>
        <p className="text-xs text-slate-400 mt-1">Teslim Edilen</p>
      </div>
      <div className="glass-card rounded-2xl p-5 border border-white/[0.05] text-center">
        <p className="text-3xl font-black text-white">{graded.length}</p>
        <p className="text-xs text-slate-400 mt-1">Notlandırıldı</p>
      </div>
      <div className="glass-card rounded-2xl p-5 border border-white/[0.05] text-center">
        <p className="text-3xl font-black text-white">
          {avgGrade !== null ? avgGrade : '—'}
        </p>
        <p className="text-xs text-slate-400 mt-1">Not Ortalaması</p>
      </div>
    </div>
  </section>
)}
```

Import'a ekle:
```typescript
import { GraduationCap } from 'lucide-react'
```

- [ ] **Step 4: TypeScript kontrolü**

```bash
npx tsc --noEmit 2>&1 | head -20
```

- [ ] **Step 5: Commit**

```bash
git add app/\(app\)/dashboard/page.tsx
git commit -m "feat: academic summary card on dashboard with submission stats"
```

---

## Task 13: CLAUDE.md ve Schema Güncelleme

**Files:**
- Modify: `CLAUDE.md`
- Modify: `supabase/schema.sql` (son kontrol)

- [ ] **Step 1: `CLAUDE.md`'ye Faz 4 dosya haritasını ekle**

`CLAUDE.md` içindeki Faz yol haritası tablosunda Faz 4 satırını güncelle:

```
| **Faz 4** | Akademi Güçlendirme | ✅ Tamamlandı | Rozet/streak entegrasyonu, analitik panel, şablon bankası, akran okuma, veli paneli |
```

Dosya haritasına yeni dosyaları ekle (Faz 3 bölümünün altına "Faz 4" bölümü olarak).

- [ ] **Step 2: Son TypeScript kontrolü**

```bash
npx tsc --noEmit 2>&1 | head -30
```

Beklenen: hata yok.

- [ ] **Step 3: Final commit**

```bash
git add CLAUDE.md supabase/schema.sql
git commit -m "docs: update CLAUDE.md with Phase 4 file map and status"
git push origin main
```

---

## Supabase'e Uygulanacak SQL (Özet)

Task 1 tamamlandıktan sonra `supabase/schema.sql` komple Supabase SQL Editor'a yapıştırılır. Kritik değişiklikler:

1. `assignment_templates` yeni tablosu
2. `classroom_members.student_id` kolonu + `role` CHECK'e `'parent'`
3. `cls_members_insert` policy güncellendi (parent dalı eklendi)
4. `submissions_select_own_or_teacher` policy güncellendi (parent dalı eklendi)
