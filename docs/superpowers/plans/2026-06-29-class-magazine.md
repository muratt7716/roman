# Sınıf Dergisi Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Öğretmenin öğrenci ödev teslimlerinden dönemsel dergi oluşturup yayımlayabildiği, okul geneli ve platform geneli keşfedilebilir bir sınıf dergisi sistemi inşa et.

**Architecture:** Mevcut `assignment_submissions → projects → chapters → chapter_versions` zinciri üzerine 3 yeni tablo (`class_magazines`, `magazine_sections`, `magazine_entries`) eklenir. Öğretmen draft modunda dergiyi düzenler, yayımlandığında published olur ve değiştirilemez. İçerik render için `chapter_versions.content` HTML olarak direkt kullanılır (`dangerouslySetInnerHTML`).

**Tech Stack:** Next.js 16 App Router, TypeScript, Supabase (RLS + ENUM), Tailwind CSS v4, shadcn/ui

## Global Constraints

- Her server component / layout'ta `export const dynamic = 'force-dynamic'` zorunlu
- Server client: `import { createClient } from '@/lib/supabase/server'` — `await createClient()`
- Browser client: `import { createClient } from '@/lib/supabase/client'` — `createClient()` (no await)
- `notification_type` bir PostgreSQL ENUM — yeni değer `ALTER TYPE ... ADD VALUE IF NOT EXISTS` ile eklenir
- PowerShell'de `&&` çalışmaz — komutları ayrı ayrı çalıştır
- `order` SQL reserved keyword — kolon adı `sort_order` kullan
- İçerik `chapter_versions.content` sütununda HTML string olarak saklanıyor
- Tüm API route'larda auth kontrolü zorunlu (teacher olmayan isteği 403 ile reddet)
- Published magazine'de sections/entries değiştirilemez — API bunu kontrol etmeli
- `app/(public)/` route grubundaki sayfalar için `app/(public)/layout.tsx` zaten var
- `app/(app)/` route grubundaki sayfalar auth gerektiriyor

---

### Task 1: Schema + Types + Notification Enum

**Files:**
- Modify: `supabase/schema.sql`
- Modify: `types/index.ts`

**Interfaces:**
- Produces: `ClassMagazine`, `MagazineSection`, `MagazineEntry` tipleri (Task 2+ kullanır)
- Produces: `magazine_published` notification_type (Task 2 publish route kullanır)

- [ ] **Step 1: `supabase/schema.sql`'e yeni tablolar ve RLS ekle**

`supabase/schema.sql` dosyasının sonuna (mevcut içeriğin altına) şunu ekle:

```sql
-- ============================================================
-- SINIF DERGİSİ (Faz 6)
-- ============================================================

ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'magazine_published';

CREATE TABLE IF NOT EXISTS class_magazines (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  classroom_id uuid NOT NULL REFERENCES classrooms(id) ON DELETE CASCADE,
  title        text NOT NULL CHECK (char_length(title) BETWEEN 1 AND 200),
  issue_number int  NOT NULL DEFAULT 1,
  status       text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','published')),
  published_at timestamptz,
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS magazine_sections (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  magazine_id uuid NOT NULL REFERENCES class_magazines(id) ON DELETE CASCADE,
  type        text NOT NULL CHECK (type IN ('hikaye','siir','makale','senaryo','serbest')),
  sort_order  int  NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS magazine_entries (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  section_id    uuid NOT NULL REFERENCES magazine_sections(id) ON DELETE CASCADE,
  submission_id uuid NOT NULL REFERENCES assignment_submissions(id) ON DELETE CASCADE,
  display_name  text,
  is_featured   bool NOT NULL DEFAULT false,
  sort_order    int  NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_magazines_classroom   ON class_magazines(classroom_id);
CREATE INDEX IF NOT EXISTS idx_mag_sections_magazine ON magazine_sections(magazine_id);
CREATE INDEX IF NOT EXISTS idx_mag_entries_section   ON magazine_entries(section_id);

-- RLS: class_magazines
ALTER TABLE class_magazines ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "magazines_select" ON class_magazines;
CREATE POLICY "magazines_select" ON class_magazines FOR SELECT USING (
  status = 'published'
  OR EXISTS (SELECT 1 FROM classrooms WHERE id = classroom_id AND owner_id = auth.uid())
  OR EXISTS (SELECT 1 FROM classroom_members WHERE classroom_id = class_magazines.classroom_id AND user_id = auth.uid())
);

DROP POLICY IF EXISTS "magazines_insert" ON class_magazines;
CREATE POLICY "magazines_insert" ON class_magazines FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM classrooms WHERE id = classroom_id AND owner_id = auth.uid())
);

DROP POLICY IF EXISTS "magazines_update" ON class_magazines;
CREATE POLICY "magazines_update" ON class_magazines FOR UPDATE USING (
  EXISTS (SELECT 1 FROM classrooms WHERE id = classroom_id AND owner_id = auth.uid())
);

DROP POLICY IF EXISTS "magazines_delete" ON class_magazines;
CREATE POLICY "magazines_delete" ON class_magazines FOR DELETE USING (
  EXISTS (SELECT 1 FROM classrooms WHERE id = classroom_id AND owner_id = auth.uid())
);

-- RLS: magazine_sections
ALTER TABLE magazine_sections ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "mag_sections_select" ON magazine_sections;
CREATE POLICY "mag_sections_select" ON magazine_sections FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM class_magazines m
    WHERE m.id = magazine_id AND (
      m.status = 'published'
      OR EXISTS (SELECT 1 FROM classrooms c WHERE c.id = m.classroom_id AND c.owner_id = auth.uid())
      OR EXISTS (SELECT 1 FROM classroom_members cm WHERE cm.classroom_id = m.classroom_id AND cm.user_id = auth.uid())
    )
  )
);

DROP POLICY IF EXISTS "mag_sections_all" ON magazine_sections;
CREATE POLICY "mag_sections_all" ON magazine_sections FOR ALL USING (
  EXISTS (
    SELECT 1 FROM class_magazines m
    JOIN classrooms c ON c.id = m.classroom_id
    WHERE m.id = magazine_id AND c.owner_id = auth.uid() AND m.status = 'draft'
  )
);

-- RLS: magazine_entries
ALTER TABLE magazine_entries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "mag_entries_select" ON magazine_entries;
CREATE POLICY "mag_entries_select" ON magazine_entries FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM magazine_sections s
    JOIN class_magazines m ON m.id = s.magazine_id
    WHERE s.id = section_id AND (
      m.status = 'published'
      OR EXISTS (SELECT 1 FROM classrooms c WHERE c.id = m.classroom_id AND c.owner_id = auth.uid())
      OR EXISTS (SELECT 1 FROM classroom_members cm WHERE cm.classroom_id = m.classroom_id AND cm.user_id = auth.uid())
    )
  )
);

DROP POLICY IF EXISTS "mag_entries_all" ON magazine_entries;
CREATE POLICY "mag_entries_all" ON magazine_entries FOR ALL USING (
  EXISTS (
    SELECT 1 FROM magazine_sections s
    JOIN class_magazines m ON m.id = s.magazine_id
    JOIN classrooms c ON c.id = m.classroom_id
    WHERE s.id = section_id AND c.owner_id = auth.uid() AND m.status = 'draft'
  )
);
```

- [ ] **Step 2: `types/index.ts`'e yeni tipler ekle**

`types/index.ts` dosyasında `export interface Classroom` bloğunun altına (AssignmentSubmission bloğunun altına) ekle:

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

export type MagazineSectionType = 'hikaye' | 'siir' | 'makale' | 'senaryo' | 'serbest'

export const MAGAZINE_SECTION_LABELS: Record<MagazineSectionType, string> = {
  hikaye: 'Hikayeler',
  siir: 'Şiirler',
  makale: 'Makaleler',
  senaryo: 'Senaryolar',
  serbest: 'Serbest',
}

export interface MagazineSection {
  id: string
  magazine_id: string
  type: MagazineSectionType
  sort_order: number
  entries?: MagazineEntry[]
}

export interface MagazineEntry {
  id: string
  section_id: string
  submission_id: string
  display_name: string | null
  is_featured: boolean
  sort_order: number
  submission?: {
    id: string
    student_id: string
    project_id: string | null
    status: string
    student?: { display_name: string | null; username: string }
    assignment?: { title: string }
    latest_content?: string
  }
}
```

- [ ] **Step 3: Commit**

```bash
git add supabase/schema.sql types/index.ts
git commit -m "feat: add class magazine schema and types"
```

- [ ] **Step 4: Supabase'e schema uygula**

Supabase Dashboard > SQL Editor > schema.sql'deki yeni bölümü (Task 1 Step 1'deki SQL) çalıştır.
Beklenen: Hata yok, 3 tablo ve RLS politikaları oluştu.

---

### Task 2: API Routes

**Files:**
- Create: `app/api/classroom/[classroomId]/magazine/route.ts`
- Create: `app/api/magazine/[magazineId]/route.ts`
- Create: `app/api/magazine/[magazineId]/publish/route.ts`
- Create: `app/api/magazine/[magazineId]/sections/route.ts`
- Create: `app/api/magazine/[magazineId]/sections/[sectionId]/route.ts`
- Create: `app/api/magazine/[magazineId]/sections/[sectionId]/entries/route.ts`
- Create: `app/api/magazine/[magazineId]/sections/[sectionId]/entries/[entryId]/route.ts`
- Create: `app/api/magazines/route.ts`

**Interfaces:**
- Consumes: `ClassMagazine`, `MagazineSection`, `MagazineEntry` from Task 1
- Produces: REST endpoints consumed by Task 3, 4, 5, 6

- [ ] **Step 1: `app/api/classroom/[classroomId]/magazine/route.ts`**

```typescript
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(_: Request, { params }: { params: Promise<{ classroomId: string }> }) {
  const { classroomId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Giriş yapman gerekiyor.' }, { status: 401 })

  const { data, error } = await supabase
    .from('class_magazines')
    .select('*')
    .eq('classroom_id', classroomId)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ magazines: data ?? [] })
}

export async function POST(req: Request, { params }: { params: Promise<{ classroomId: string }> }) {
  const { classroomId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Giriş yapman gerekiyor.' }, { status: 401 })

  const { data: classroom } = await supabase.from('classrooms').select('owner_id').eq('id', classroomId).single()
  if (!classroom || classroom.owner_id !== user.id)
    return NextResponse.json({ error: 'Yetkin yok.' }, { status: 403 })

  const { title, sections } = await req.json()
  if (!title?.trim()) return NextResponse.json({ error: 'Başlık zorunlu.' }, { status: 400 })
  if (!sections?.length) return NextResponse.json({ error: 'En az bir bölüm ekle.' }, { status: 400 })

  const { count } = await supabase
    .from('class_magazines')
    .select('*', { count: 'exact', head: true })
    .eq('classroom_id', classroomId)

  const { data: magazine, error } = await supabase
    .from('class_magazines')
    .insert({ classroom_id: classroomId, title: title.trim(), issue_number: (count ?? 0) + 1 })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const sectionRows = (sections as string[]).map((type, i) => ({
    magazine_id: magazine.id, type, sort_order: i,
  }))
  const { error: secErr } = await supabase.from('magazine_sections').insert(sectionRows)
  if (secErr) return NextResponse.json({ error: secErr.message }, { status: 500 })

  return NextResponse.json({ magazine }, { status: 201 })
}
```

- [ ] **Step 2: `app/api/magazine/[magazineId]/route.ts`**

```typescript
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(_: Request, { params }: { params: Promise<{ magazineId: string }> }) {
  const { magazineId } = await params
  const supabase = await createClient()

  const { data: magazine, error } = await supabase
    .from('class_magazines')
    .select('*')
    .eq('id', magazineId)
    .single()

  if (error || !magazine) return NextResponse.json({ error: 'Dergi bulunamadı.' }, { status: 404 })

  const { data: sections } = await supabase
    .from('magazine_sections')
    .select('*')
    .eq('magazine_id', magazineId)
    .order('sort_order')

  const { data: entries } = await supabase
    .from('magazine_entries')
    .select(`
      *,
      submission:assignment_submissions(
        id, student_id, project_id, status,
        student:profiles!assignment_submissions_student_id_fkey(display_name, username),
        assignment:classroom_assignments(title)
      )
    `)
    .in('section_id', (sections ?? []).map(s => s.id))
    .order('sort_order')

  const sectionsWithEntries = (sections ?? []).map(s => ({
    ...s,
    entries: (entries ?? []).filter(e => e.section_id === s.id),
  }))

  // Fetch latest chapter content for each entry's project
  const projectIds = [...new Set((entries ?? []).map(e => e.submission?.project_id).filter(Boolean))]
  let contentMap: Record<string, string> = {}

  if (projectIds.length > 0) {
    const { data: chapters } = await supabase
      .from('chapters')
      .select('project_id, id')
      .in('project_id', projectIds)
      .order('created_at')

    if (chapters?.length) {
      const chapterIds = chapters.map(c => c.id)
      const { data: versions } = await supabase
        .from('chapter_versions')
        .select('chapter_id, content, created_at')
        .in('chapter_id', chapterIds)
        .order('created_at', { ascending: false })

      const latestPerChapter: Record<string, string> = {}
      for (const v of versions ?? []) {
        if (!latestPerChapter[v.chapter_id]) latestPerChapter[v.chapter_id] = v.content
      }
      for (const ch of chapters) {
        if (latestPerChapter[ch.id]) contentMap[ch.project_id] = latestPerChapter[ch.id]
      }
    }
  }

  const sectionsWithContent = sectionsWithEntries.map(s => ({
    ...s,
    entries: s.entries.map(e => ({
      ...e,
      submission: e.submission ? {
        ...e.submission,
        latest_content: contentMap[e.submission.project_id ?? ''] ?? null,
      } : null,
    })),
  }))

  // Classroom info for school display
  const { data: classroom } = await supabase
    .from('classrooms')
    .select('name, school_name, owner_id')
    .eq('id', magazine.classroom_id)
    .single()

  return NextResponse.json({ magazine, sections: sectionsWithContent, classroom })
}
```

- [ ] **Step 3: `app/api/magazine/[magazineId]/publish/route.ts`**

```typescript
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(_: Request, { params }: { params: Promise<{ magazineId: string }> }) {
  const { magazineId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Giriş yapman gerekiyor.' }, { status: 401 })

  const { data: magazine } = await supabase.from('class_magazines').select('*, classroom:classrooms(owner_id)').eq('id', magazineId).single()
  if (!magazine) return NextResponse.json({ error: 'Dergi bulunamadı.' }, { status: 404 })
  if ((magazine.classroom as { owner_id: string }).owner_id !== user.id)
    return NextResponse.json({ error: 'Yetkin yok.' }, { status: 403 })
  if (magazine.status === 'published')
    return NextResponse.json({ error: 'Dergi zaten yayımlandı.' }, { status: 400 })

  const { error } = await supabase
    .from('class_magazines')
    .update({ status: 'published', published_at: new Date().toISOString() })
    .eq('id', magazineId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Öğrencilere bildirim gönder
  const { data: entries } = await supabase
    .from('magazine_entries')
    .select('submission_id, is_featured, submission:assignment_submissions(student_id)')
    .eq('section_id', supabase.from('magazine_sections').select('id').eq('magazine_id', magazineId) as unknown as string)

  // Basit yaklaşım: classroom üyelerini çek, hepsine bildirim at
  const { data: members } = await supabase
    .from('classroom_members')
    .select('user_id')
    .eq('classroom_id', magazine.classroom_id)
    .eq('role', 'student')

  if (members?.length) {
    const notifications = members.map(m => ({
      user_id: m.user_id,
      type: 'magazine_published' as const,
      payload: {
        magazine_id: magazineId,
        magazine_title: magazine.title,
        classroom_id: magazine.classroom_id,
      },
    }))
    await supabase.from('notifications').insert(notifications)
  }

  return NextResponse.json({ ok: true })
}
```

- [ ] **Step 4: `app/api/magazine/[magazineId]/sections/route.ts`**

```typescript
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: Request, { params }: { params: Promise<{ magazineId: string }> }) {
  const { magazineId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Giriş yapman gerekiyor.' }, { status: 401 })

  const { data: magazine } = await supabase
    .from('class_magazines')
    .select('status, classroom:classrooms(owner_id)')
    .eq('id', magazineId)
    .single()

  if (!magazine || (magazine.classroom as { owner_id: string }).owner_id !== user.id)
    return NextResponse.json({ error: 'Yetkin yok.' }, { status: 403 })
  if (magazine.status === 'published')
    return NextResponse.json({ error: 'Yayımlanmış dergi değiştirilemez.' }, { status: 400 })

  const { type, sort_order } = await req.json()
  const valid = ['hikaye', 'siir', 'makale', 'senaryo', 'serbest']
  if (!valid.includes(type)) return NextResponse.json({ error: 'Geçersiz bölüm tipi.' }, { status: 400 })

  const { data, error } = await supabase
    .from('magazine_sections')
    .insert({ magazine_id: magazineId, type, sort_order: sort_order ?? 0 })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ section: data }, { status: 201 })
}
```

- [ ] **Step 5: `app/api/magazine/[magazineId]/sections/[sectionId]/route.ts`**

```typescript
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

async function isTeacher(supabase: Awaited<ReturnType<typeof createClient>>, magazineId: string, userId: string) {
  const { data } = await supabase
    .from('class_magazines')
    .select('status, classroom:classrooms(owner_id)')
    .eq('id', magazineId)
    .single()
  if (!data) return { ok: false, published: false }
  return {
    ok: (data.classroom as { owner_id: string }).owner_id === userId,
    published: data.status === 'published',
  }
}

export async function DELETE(_: Request, { params }: { params: Promise<{ magazineId: string; sectionId: string }> }) {
  const { magazineId, sectionId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Giriş yapman gerekiyor.' }, { status: 401 })

  const { ok, published } = await isTeacher(supabase, magazineId, user.id)
  if (!ok) return NextResponse.json({ error: 'Yetkin yok.' }, { status: 403 })
  if (published) return NextResponse.json({ error: 'Yayımlanmış dergi değiştirilemez.' }, { status: 400 })

  const { error } = await supabase.from('magazine_sections').delete().eq('id', sectionId)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

export async function PATCH(req: Request, { params }: { params: Promise<{ magazineId: string; sectionId: string }> }) {
  const { magazineId, sectionId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Giriş yapman gerekiyor.' }, { status: 401 })

  const { ok, published } = await isTeacher(supabase, magazineId, user.id)
  if (!ok) return NextResponse.json({ error: 'Yetkin yok.' }, { status: 403 })
  if (published) return NextResponse.json({ error: 'Yayımlanmış dergi değiştirilemez.' }, { status: 400 })

  const { sort_order } = await req.json()
  const { error } = await supabase.from('magazine_sections').update({ sort_order }).eq('id', sectionId)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
```

- [ ] **Step 6: `app/api/magazine/[magazineId]/sections/[sectionId]/entries/route.ts`**

```typescript
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: Request, { params }: { params: Promise<{ magazineId: string; sectionId: string }> }) {
  const { magazineId, sectionId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Giriş yapman gerekiyor.' }, { status: 401 })

  const { data: magazine } = await supabase
    .from('class_magazines')
    .select('status, classroom:classrooms(owner_id)')
    .eq('id', magazineId)
    .single()

  if (!magazine || (magazine.classroom as { owner_id: string }).owner_id !== user.id)
    return NextResponse.json({ error: 'Yetkin yok.' }, { status: 403 })
  if (magazine.status === 'published')
    return NextResponse.json({ error: 'Yayımlanmış dergi değiştirilemez.' }, { status: 400 })

  const { submission_id, display_name, sort_order } = await req.json()
  if (!submission_id) return NextResponse.json({ error: 'submission_id zorunlu.' }, { status: 400 })

  const { data, error } = await supabase
    .from('magazine_entries')
    .insert({ section_id: sectionId, submission_id, display_name: display_name ?? null, sort_order: sort_order ?? 0 })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ entry: data }, { status: 201 })
}
```

- [ ] **Step 7: `app/api/magazine/[magazineId]/sections/[sectionId]/entries/[entryId]/route.ts`**

```typescript
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

async function guardTeacher(supabase: Awaited<ReturnType<typeof createClient>>, magazineId: string, userId: string) {
  const { data } = await supabase
    .from('class_magazines')
    .select('status, classroom:classrooms(owner_id)')
    .eq('id', magazineId)
    .single()
  if (!data) return { ok: false, published: true }
  return {
    ok: (data.classroom as { owner_id: string }).owner_id === userId,
    published: data.status === 'published',
  }
}

export async function PATCH(req: Request, { params }: { params: Promise<{ magazineId: string; sectionId: string; entryId: string }> }) {
  const { magazineId, entryId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Giriş yapman gerekiyor.' }, { status: 401 })

  const { ok, published } = await guardTeacher(supabase, magazineId, user.id)
  if (!ok) return NextResponse.json({ error: 'Yetkin yok.' }, { status: 403 })
  if (published) return NextResponse.json({ error: 'Yayımlanmış dergi değiştirilemez.' }, { status: 400 })

  const body = await req.json()
  const updates: Record<string, unknown> = {}
  if ('display_name' in body) updates.display_name = body.display_name
  if ('is_featured' in body) updates.is_featured = body.is_featured
  if ('sort_order' in body) updates.sort_order = body.sort_order

  const { error } = await supabase.from('magazine_entries').update(updates).eq('id', entryId)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

export async function DELETE(_: Request, { params }: { params: Promise<{ magazineId: string; sectionId: string; entryId: string }> }) {
  const { magazineId, entryId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Giriş yapman gerekiyor.' }, { status: 401 })

  const { ok, published } = await guardTeacher(supabase, magazineId, user.id)
  if (!ok) return NextResponse.json({ error: 'Yetkin yok.' }, { status: 403 })
  if (published) return NextResponse.json({ error: 'Yayımlanmış dergi değiştirilemez.' }, { status: 400 })

  const { error } = await supabase.from('magazine_entries').delete().eq('id', entryId)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
```

- [ ] **Step 8: `app/api/magazines/route.ts` (public keşif)**

```typescript
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const school = searchParams.get('school')
  const page = parseInt(searchParams.get('page') ?? '1')
  const limit = 12
  const offset = (page - 1) * limit

  const supabase = await createClient()

  let query = supabase
    .from('class_magazines')
    .select(`
      id, title, issue_number, published_at,
      classroom:classrooms(name, school_name)
    `, { count: 'exact' })
    .eq('status', 'published')
    .order('published_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (school) {
    query = query.ilike('classroom.school_name', `%${school}%`) as typeof query
  }

  const { data, count, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ magazines: data ?? [], total: count ?? 0, page, limit })
}
```

- [ ] **Step 9: Commit**

```bash
git add app/api/classroom app/api/magazine app/api/magazines
git commit -m "feat: add magazine API routes (CRUD, sections, entries, publish, discover)"
```

---

### Task 3: Öğretmen — Dergi Listesi + Yeni Sayı Sayfaları

**Files:**
- Create: `app/(app)/classroom/[classroomId]/magazine/page.tsx`
- Create: `app/(app)/classroom/[classroomId]/magazine/new/page.tsx`
- Create: `components/magazine/MagazineCard.tsx`

**Interfaces:**
- Consumes: `GET /api/classroom/[classroomId]/magazine`, `POST /api/classroom/[classroomId]/magazine`
- Produces: `/classroom/[id]/magazine` ve `/classroom/[id]/magazine/new` sayfaları

- [ ] **Step 1: `components/magazine/MagazineCard.tsx`**

```typescript
'use client'

import Link from 'next/link'
import { BookOpen, Clock, CheckCircle2 } from 'lucide-react'
import type { ClassMagazine } from '@/types'

interface Props {
  magazine: ClassMagazine
  classroomId: string
  isTeacher: boolean
}

export function MagazineCard({ magazine, classroomId, isTeacher }: Props) {
  const href = magazine.status === 'draft' && isTeacher
    ? `/classroom/${classroomId}/magazine/${magazine.id}/edit`
    : `/classroom/${classroomId}/magazine/${magazine.id}`

  return (
    <Link href={href} className="block p-5 rounded-2xl border border-white/[0.06] bg-white/[0.02] hover:border-primary/30 hover:bg-white/[0.04] transition-all group">
      <div className="flex items-start justify-between gap-3">
        <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
          <BookOpen className="w-5 h-5 text-primary" />
        </div>
        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0 ${magazine.status === 'published' ? 'bg-green-500/15 text-green-400' : 'bg-amber-500/15 text-amber-400'}`}>
          {magazine.status === 'published' ? 'Yayımlandı' : 'Taslak'}
        </span>
      </div>
      <div className="mt-3">
        <p className="text-sm font-semibold text-white group-hover:text-primary transition-colors line-clamp-2">{magazine.title}</p>
        <p className="text-xs text-slate-500 mt-1">Sayı #{magazine.issue_number}</p>
      </div>
      <div className="mt-3 flex items-center gap-1.5 text-xs text-slate-500">
        {magazine.status === 'published'
          ? <><CheckCircle2 className="w-3 h-3 text-green-400" />{new Date(magazine.published_at!).toLocaleDateString('tr')}</>
          : <><Clock className="w-3 h-3" />Düzenleniyor</>
        }
      </div>
    </Link>
  )
}
```

- [ ] **Step 2: `app/(app)/classroom/[classroomId]/magazine/page.tsx`**

```typescript
import { createClient } from '@/lib/supabase/server'
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { Plus, BookOpen } from 'lucide-react'
import { MagazineCard } from '@/components/magazine/MagazineCard'
import type { ClassMagazine } from '@/types'

export const dynamic = 'force-dynamic'

export default async function ClassroomMagazinePage({ params }: { params: Promise<{ classroomId: string }> }) {
  const { classroomId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: classroom } = await supabase
    .from('classrooms')
    .select('name, school_name, owner_id')
    .eq('id', classroomId)
    .single()

  if (!classroom) notFound()

  const isTeacher = classroom.owner_id === user.id

  const { data: magazines } = await supabase
    .from('class_magazines')
    .select('*')
    .eq('classroom_id', classroomId)
    .order('created_at', { ascending: false })

  const published = (magazines ?? []).filter(m => m.status === 'published')
  const drafts = (magazines ?? []).filter(m => m.status === 'draft')

  return (
    <div className="max-w-4xl mx-auto px-4 py-10 space-y-8">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold text-white flex items-center gap-2">
            <BookOpen className="w-6 h-6 text-primary" />
            Sınıf Dergisi
          </h1>
          <p className="text-sm text-slate-400 mt-1">{classroom.name} · {classroom.school_name}</p>
        </div>
        {isTeacher && (
          <Link
            href={`/classroom/${classroomId}/magazine/new`}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary hover:bg-primary/90 text-white text-sm font-semibold transition-all"
          >
            <Plus className="w-4 h-4" />
            Yeni Sayı
          </Link>
        )}
      </div>

      {isTeacher && drafts.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-xs font-semibold text-amber-400 uppercase tracking-wider">Taslaklar</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {drafts.map(m => <MagazineCard key={m.id} magazine={m as ClassMagazine} classroomId={classroomId} isTeacher={isTeacher} />)}
          </div>
        </div>
      )}

      {published.length > 0 ? (
        <div className="space-y-3">
          <h2 className="text-xs font-semibold text-green-400 uppercase tracking-wider">Yayımlanan Sayılar</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {published.map(m => <MagazineCard key={m.id} magazine={m as ClassMagazine} classroomId={classroomId} isTeacher={isTeacher} />)}
          </div>
        </div>
      ) : (
        !isTeacher && (
          <div className="text-center py-16 text-slate-500">
            <BookOpen className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="text-sm">Henüz yayımlanan sayı yok.</p>
          </div>
        )
      )}
    </div>
  )
}
```

- [ ] **Step 3: `app/(app)/classroom/[classroomId]/magazine/new/page.tsx`**

```typescript
'use client'

import { useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Plus, Trash2, BookOpen } from 'lucide-react'
import { toast } from 'sonner'
import { MAGAZINE_SECTION_LABELS, type MagazineSectionType } from '@/types'

const SECTION_TYPES: MagazineSectionType[] = ['hikaye', 'siir', 'makale', 'senaryo', 'serbest']

export default function NewMagazinePage() {
  const params = useParams<{ classroomId: string }>()
  const router = useRouter()
  const [title, setTitle] = useState('')
  const [sections, setSections] = useState<MagazineSectionType[]>(['hikaye'])
  const [loading, setLoading] = useState(false)

  function addSection(type: MagazineSectionType) {
    setSections(prev => [...prev, type])
  }

  function removeSection(i: number) {
    setSections(prev => prev.filter((_, idx) => idx !== i))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim() || sections.length === 0) return
    setLoading(true)
    try {
      const res = await fetch(`/api/classroom/${params.classroomId}/magazine`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: title.trim(), sections }),
      })
      const data = await res.json()
      if (res.ok) {
        toast.success('Dergi oluşturuldu! Şimdi yazıları ekle.')
        router.push(`/classroom/${params.classroomId}/magazine/${data.magazine.id}/edit`)
      } else {
        toast.error(data.error || 'Bir sorun oluştu.')
      }
    } catch {
      toast.error('Bağlantı hatası.')
    } finally {
      setLoading(false)
    }
  }

  const inputClass = "w-full bg-white/[0.03] border border-white/[0.08] focus:border-primary/50 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:ring-1 focus:ring-primary/40 transition-all placeholder:text-slate-600 disabled:opacity-50"

  return (
    <div className="max-w-xl mx-auto px-4 py-12 space-y-8">
      <Link href={`/classroom/${params.classroomId}/magazine`} className="inline-flex items-center gap-2 text-xs text-slate-400 hover:text-white transition-colors uppercase tracking-wider font-semibold">
        <ArrowLeft className="w-4 h-4" /> Geri
      </Link>

      <div>
        <h1 className="text-2xl font-display font-bold text-white flex items-center gap-2">
          <BookOpen className="w-6 h-6 text-primary" />
          Yeni Dergi Sayısı
        </h1>
        <p className="text-sm text-slate-400 mt-1">Başlık belirle, bölümleri ayarla, sonra yazıları ekle.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-2">
          <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Sayı Başlığı *</label>
          <input type="text" required value={title} onChange={e => setTitle(e.target.value)} placeholder="Örn: Bahar Sayısı 2026" className={inputClass} disabled={loading} />
        </div>

        <div className="space-y-3">
          <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Bölümler *</label>
          {sections.map((s, i) => (
            <div key={i} className="flex items-center gap-2">
              <div className="flex-1 px-4 py-2.5 rounded-xl border border-white/[0.06] bg-white/[0.02] text-sm text-white">
                {MAGAZINE_SECTION_LABELS[s]}
              </div>
              <button type="button" onClick={() => removeSection(i)} disabled={sections.length <= 1} className="p-2 rounded-lg text-slate-500 hover:text-red-400 transition-colors disabled:opacity-30">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
          <div className="flex flex-wrap gap-2 pt-1">
            {SECTION_TYPES.map(type => (
              <button key={type} type="button" onClick={() => addSection(type)}
                className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg border border-white/[0.06] text-slate-400 hover:text-white hover:border-primary/40 transition-all">
                <Plus className="w-3 h-3" /> {MAGAZINE_SECTION_LABELS[type]}
              </button>
            ))}
          </div>
        </div>

        <button type="submit" disabled={loading || !title.trim() || sections.length === 0}
          className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white text-sm font-semibold transition-all disabled:opacity-50">
          {loading ? 'Oluşturuluyor...' : 'Dergiyi Oluştur ve Düzenle →'}
        </button>
      </form>
    </div>
  )
}
```

- [ ] **Step 4: Commit**

```bash
git add components/magazine app/(app)/classroom
git commit -m "feat: add magazine list and new issue pages"
```

---

### Task 4: Dergi Editörü

**Files:**
- Create: `app/(app)/classroom/[classroomId]/magazine/[magazineId]/edit/page.tsx`
- Create: `components/magazine/MagazineEditor.tsx`
- Create: `components/magazine/SectionPanel.tsx`
- Create: `components/magazine/EntryCard.tsx`

**Interfaces:**
- Consumes: `GET /api/magazine/[magazineId]`, `POST /api/magazine/[magazineId]/publish`, tüm section/entry API'leri
- Consumes: `MagazineSection`, `MagazineEntry`, `MAGAZINE_SECTION_LABELS` from Task 1

- [ ] **Step 1: `components/magazine/EntryCard.tsx`**

```typescript
'use client'

import { useState } from 'react'
import { Star, Eye, EyeOff, Trash2 } from 'lucide-react'
import type { MagazineEntry } from '@/types'

interface Props {
  entry: MagazineEntry
  magazineId: string
  sectionId: string
  onUpdate: (entryId: string, changes: Partial<MagazineEntry>) => void
  onRemove: (entryId: string) => void
}

export function EntryCard({ entry, magazineId, sectionId, onUpdate, onRemove }: Props) {
  const [loading, setLoading] = useState(false)

  async function patch(changes: Record<string, unknown>) {
    setLoading(true)
    await fetch(`/api/magazine/${magazineId}/sections/${sectionId}/entries/${entry.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(changes),
    })
    onUpdate(entry.id, changes as Partial<MagazineEntry>)
    setLoading(false)
  }

  async function remove() {
    setLoading(true)
    await fetch(`/api/magazine/${magazineId}/sections/${sectionId}/entries/${entry.id}`, { method: 'DELETE' })
    onRemove(entry.id)
    setLoading(false)
  }

  const studentName = entry.submission?.student?.display_name ?? entry.submission?.student?.username ?? 'Öğrenci'
  const assignmentTitle = entry.submission?.assignment?.title ?? 'Ödev'

  return (
    <div className={`p-3 rounded-xl border transition-colors ${entry.is_featured ? 'border-amber-500/40 bg-amber-500/5' : 'border-white/[0.06] bg-white/[0.02]'}`}>
      <div className="flex items-start gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-white truncate">{assignmentTitle}</p>
          <p className="text-xs text-slate-400 mt-0.5">
            {entry.display_name ?? 'Anonim'} · {studentName}
          </p>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={() => patch({ is_featured: !entry.is_featured })}
            disabled={loading}
            title="Öne Çıkan"
            className={`p-1.5 rounded-lg transition-colors ${entry.is_featured ? 'text-amber-400 bg-amber-500/10' : 'text-slate-500 hover:text-amber-400'}`}
          >
            <Star className="w-3.5 h-3.5" fill={entry.is_featured ? 'currentColor' : 'none'} />
          </button>
          <button
            onClick={() => patch({ display_name: entry.display_name ? null : studentName })}
            disabled={loading}
            title={entry.display_name ? 'Anonime çevir' : 'İsimli yayımla'}
            className="p-1.5 rounded-lg text-slate-500 hover:text-white transition-colors"
          >
            {entry.display_name ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
          </button>
          <button onClick={remove} disabled={loading} className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 transition-colors">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: `components/magazine/SectionPanel.tsx`**

```typescript
'use client'

import { useState } from 'react'
import { ChevronDown, ChevronUp, Plus, Trash2 } from 'lucide-react'
import { EntryCard } from './EntryCard'
import { MAGAZINE_SECTION_LABELS, type MagazineSection, type MagazineEntry } from '@/types'

interface Submission {
  id: string
  student: { display_name: string | null; username: string } | null
  assignment: { title: string } | null
  project_id: string | null
}

interface Props {
  section: MagazineSection
  magazineId: string
  availableSubmissions: Submission[]
  onEntryUpdate: (sectionId: string, entryId: string, changes: Partial<MagazineEntry>) => void
  onEntryRemove: (sectionId: string, entryId: string) => void
  onEntryAdd: (sectionId: string, entry: MagazineEntry) => void
  onSectionRemove: (sectionId: string) => void
}

export function SectionPanel({ section, magazineId, availableSubmissions, onEntryUpdate, onEntryRemove, onEntryAdd, onSectionRemove }: Props) {
  const [expanded, setExpanded] = useState(true)
  const [adding, setAdding] = useState(false)
  const [selectedSubmission, setSelectedSubmission] = useState('')

  const usedIds = new Set((section.entries ?? []).map(e => e.submission_id))
  const available = availableSubmissions.filter(s => s.project_id && !usedIds.has(s.id))

  async function addEntry() {
    if (!selectedSubmission) return
    setAdding(true)
    const res = await fetch(`/api/magazine/${magazineId}/sections/${section.id}/entries`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ submission_id: selectedSubmission, sort_order: (section.entries?.length ?? 0) }),
    })
    const data = await res.json()
    if (res.ok) {
      const sub = availableSubmissions.find(s => s.id === selectedSubmission)
      onEntryAdd(section.id, {
        ...data.entry,
        submission: sub ? { id: sub.id, student_id: '', project_id: sub.project_id, status: '', student: sub.student ?? undefined, assignment: sub.assignment ?? undefined } : undefined,
      })
      setSelectedSubmission('')
    }
    setAdding(false)
  }

  return (
    <div className="rounded-2xl border border-white/[0.06] bg-white/[0.01] overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.04]">
        <button onClick={() => setExpanded(v => !v)} className="flex items-center gap-2 text-sm font-semibold text-white hover:text-primary transition-colors">
          {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          {MAGAZINE_SECTION_LABELS[section.type]}
          <span className="text-xs text-slate-500 font-normal">({section.entries?.length ?? 0} yazı)</span>
        </button>
        <button onClick={() => onSectionRemove(section.id)} className="p-1.5 rounded text-slate-600 hover:text-red-400 transition-colors">
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>

      {expanded && (
        <div className="p-3 space-y-2">
          {(section.entries ?? []).map(entry => (
            <EntryCard
              key={entry.id}
              entry={entry}
              magazineId={magazineId}
              sectionId={section.id}
              onUpdate={(eid, changes) => onEntryUpdate(section.id, eid, changes)}
              onRemove={eid => onEntryRemove(section.id, eid)}
            />
          ))}

          {available.length > 0 && (
            <div className="flex gap-2 pt-1">
              <select
                value={selectedSubmission}
                onChange={e => setSelectedSubmission(e.target.value)}
                className="flex-1 bg-white/[0.03] border border-white/[0.08] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-primary/50"
              >
                <option value="">Yazı seç...</option>
                {available.map(s => (
                  <option key={s.id} value={s.id}>
                    {s.assignment?.title ?? 'Ödev'} — {s.student?.display_name ?? s.student?.username ?? 'Öğrenci'}
                  </option>
                ))}
              </select>
              <button onClick={addEntry} disabled={!selectedSubmission || adding}
                className="flex items-center gap-1 px-3 py-2 rounded-xl bg-primary/20 text-primary border border-primary/30 text-xs font-medium transition-all hover:bg-primary/30 disabled:opacity-50">
                <Plus className="w-3.5 h-3.5" />
                Ekle
              </button>
            </div>
          )}

          {available.length === 0 && (section.entries?.length ?? 0) === 0 && (
            <p className="text-xs text-slate-500 text-center py-3">Tüm teslimler kullanıldı veya henüz teslim yok.</p>
          )}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 3: `components/magazine/MagazineEditor.tsx`**

```typescript
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Send } from 'lucide-react'
import { SectionPanel } from './SectionPanel'
import type { ClassMagazine, MagazineSection, MagazineEntry } from '@/types'

interface Submission {
  id: string
  student: { display_name: string | null; username: string } | null
  assignment: { title: string } | null
  project_id: string | null
}

interface Props {
  magazine: ClassMagazine
  initialSections: MagazineSection[]
  submissions: Submission[]
  classroomId: string
}

export function MagazineEditor({ magazine, initialSections, submissions, classroomId }: Props) {
  const router = useRouter()
  const [sections, setSections] = useState<MagazineSection[]>(initialSections)
  const [publishing, setPublishing] = useState(false)

  function updateEntry(sectionId: string, entryId: string, changes: Partial<MagazineEntry>) {
    setSections(prev => prev.map(s =>
      s.id !== sectionId ? s : {
        ...s,
        entries: s.entries?.map(e => e.id !== entryId ? e : { ...e, ...changes })
      }
    ))
  }

  function removeEntry(sectionId: string, entryId: string) {
    setSections(prev => prev.map(s =>
      s.id !== sectionId ? s : { ...s, entries: s.entries?.filter(e => e.id !== entryId) }
    ))
  }

  function addEntry(sectionId: string, entry: MagazineEntry) {
    setSections(prev => prev.map(s =>
      s.id !== sectionId ? s : { ...s, entries: [...(s.entries ?? []), entry] }
    ))
  }

  async function removeSection(sectionId: string) {
    const res = await fetch(`/api/magazine/${magazine.id}/sections/${sectionId}`, { method: 'DELETE' })
    if (res.ok) setSections(prev => prev.filter(s => s.id !== sectionId))
    else toast.error('Bölüm silinemedi.')
  }

  async function publish() {
    const totalEntries = sections.reduce((n, s) => n + (s.entries?.length ?? 0), 0)
    if (totalEntries === 0) { toast.error('En az bir yazı ekle.'); return }
    setPublishing(true)
    const res = await fetch(`/api/magazine/${magazine.id}/publish`, { method: 'POST' })
    const data = await res.json()
    if (res.ok) {
      toast.success('Dergi yayımlandı!')
      router.push(`/classroom/${classroomId}/magazine/${magazine.id}`)
      router.refresh()
    } else {
      toast.error(data.error || 'Yayımlanamadı.')
      setPublishing(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-400">
          {sections.reduce((n, s) => n + (s.entries?.length ?? 0), 0)} yazı · {sections.length} bölüm
        </p>
        <button
          onClick={publish}
          disabled={publishing}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-green-600 hover:bg-green-500 text-white text-sm font-semibold transition-all disabled:opacity-50"
        >
          <Send className="w-4 h-4" />
          {publishing ? 'Yayımlanıyor...' : 'Sayıyı Yayımla'}
        </button>
      </div>

      <div className="space-y-3">
        {sections.map(section => (
          <SectionPanel
            key={section.id}
            section={section}
            magazineId={magazine.id}
            availableSubmissions={submissions}
            onEntryUpdate={updateEntry}
            onEntryRemove={removeEntry}
            onEntryAdd={addEntry}
            onSectionRemove={removeSection}
          />
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 4: `app/(app)/classroom/[classroomId]/magazine/[magazineId]/edit/page.tsx`**

```typescript
import { createClient } from '@/lib/supabase/server'
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, BookOpen } from 'lucide-react'
import { MagazineEditor } from '@/components/magazine/MagazineEditor'

export const dynamic = 'force-dynamic'

export default async function MagazineEditPage({
  params,
}: {
  params: Promise<{ classroomId: string; magazineId: string }>
}) {
  const { classroomId, magazineId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const res = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL}/api/magazine/${magazineId}`, {
    cache: 'no-store',
    headers: { cookie: '' },
  })

  // Server component'te direkt supabase kullan (fetch yerine)
  const { data: magazine } = await supabase.from('class_magazines').select('*').eq('id', magazineId).single()
  if (!magazine) notFound()

  const { data: classroom } = await supabase.from('classrooms').select('owner_id, name').eq('id', classroomId).single()
  if (!classroom || classroom.owner_id !== user.id) redirect(`/classroom/${classroomId}/magazine`)
  if (magazine.status === 'published') redirect(`/classroom/${classroomId}/magazine/${magazineId}`)

  const { data: sections } = await supabase
    .from('magazine_sections')
    .select('*')
    .eq('magazine_id', magazineId)
    .order('sort_order')

  const sectionIds = (sections ?? []).map(s => s.id)
  const { data: entries } = sectionIds.length > 0
    ? await supabase.from('magazine_entries').select('*').in('section_id', sectionIds).order('sort_order')
    : { data: [] }

  const sectionsWithEntries = (sections ?? []).map(s => ({
    ...s,
    entries: (entries ?? []).filter(e => e.section_id === s.id),
  }))

  // Sınıfın tüm submitted/graded teslimlerini çek
  const { data: submissions } = await supabase
    .from('assignment_submissions')
    .select(`
      id, project_id, status,
      student:profiles!assignment_submissions_student_id_fkey(display_name, username),
      assignment:classroom_assignments!assignment_submissions_assignment_id_fkey(title, classroom_id)
    `)
    .in('status', ['submitted', 'graded'])
    .not('project_id', 'is', null)

  // Sadece bu sınıfın teslimlerini filtrele
  const classSubmissions = (submissions ?? []).filter(
    (s: { assignment: { classroom_id: string } | null }) => s.assignment?.classroom_id === classroomId
  )

  return (
    <div className="max-w-2xl mx-auto px-4 py-10 space-y-6">
      <div className="flex items-center gap-3">
        <Link href={`/classroom/${classroomId}/magazine`} className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/[0.04] transition-all">
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div>
          <h1 className="text-xl font-display font-bold text-white flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-primary" />
            {magazine.title}
          </h1>
          <p className="text-xs text-slate-400">Sayı #{magazine.issue_number} · Taslak</p>
        </div>
      </div>

      <MagazineEditor
        magazine={magazine}
        initialSections={sectionsWithEntries}
        submissions={classSubmissions as Parameters<typeof MagazineEditor>[0]['submissions']}
        classroomId={classroomId}
      />
    </div>
  )
}
```

- [ ] **Step 5: Commit**

```bash
git add components/magazine app/(app)/classroom
git commit -m "feat: add magazine editor with section/entry management"
```

---

### Task 5: Dergi Okuyucu + PDF Print CSS

**Files:**
- Create: `app/(app)/classroom/[classroomId]/magazine/[magazineId]/page.tsx`
- Create: `components/magazine/MagazineReader.tsx`
- Modify: `app/globals.css` (print CSS ekle)

**Interfaces:**
- Consumes: `GET /api/magazine/[magazineId]`
- Produces: Okuyucu sayfası — hem sınıf içi hem public URL

- [ ] **Step 1: `components/magazine/MagazineReader.tsx`**

```typescript
'use client'

import { useState } from 'react'
import { Star, Printer } from 'lucide-react'
import { MAGAZINE_SECTION_LABELS, type MagazineSection } from '@/types'

interface Props {
  title: string
  issueNumber: number
  classroomName: string
  schoolName: string
  publishedAt: string
  sections: MagazineSection[]
}

export function MagazineReader({ title, issueNumber, classroomName, schoolName, publishedAt, sections }: Props) {
  const [activeSection, setActiveSection] = useState(sections[0]?.id ?? '')

  const current = sections.find(s => s.id === activeSection) ?? sections[0]

  return (
    <div className="flex flex-col min-h-[calc(100dvh-4rem)]">
      {/* Kapak başlık */}
      <div className="border-b border-white/[0.06] bg-gradient-to-r from-primary/10 to-transparent px-6 py-6 print:py-12 print:border-none">
        <div className="max-w-4xl mx-auto">
          <p className="text-xs text-primary font-semibold uppercase tracking-widest mb-1 print:text-black">{schoolName} · {classroomName}</p>
          <h1 className="text-3xl font-display font-black text-white print:text-black">{title}</h1>
          <p className="text-sm text-slate-400 mt-1 print:text-gray-600">
            Sayı #{issueNumber} · {new Date(publishedAt).toLocaleDateString('tr-TR', { year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>
      </div>

      <div className="flex flex-1 max-w-4xl mx-auto w-full px-4 py-6 gap-6">
        {/* Sidebar — bölüm nav */}
        <nav className="w-40 shrink-0 print:hidden">
          <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider mb-3">Bölümler</p>
          <div className="space-y-1">
            {sections.map(s => (
              <button
                key={s.id}
                onClick={() => setActiveSection(s.id)}
                className={`w-full text-left text-sm px-3 py-2 rounded-lg transition-colors ${s.id === activeSection ? 'bg-primary/15 text-primary font-medium' : 'text-slate-400 hover:text-white hover:bg-white/[0.03]'}`}
              >
                {MAGAZINE_SECTION_LABELS[s.type]}
                <span className="text-[10px] text-slate-500 ml-1">({s.entries?.length ?? 0})</span>
              </button>
            ))}
          </div>
          <button
            onClick={() => window.print()}
            className="mt-6 w-full flex items-center gap-2 text-xs px-3 py-2 rounded-lg border border-white/[0.06] text-slate-400 hover:text-white hover:border-white/[0.12] transition-all"
          >
            <Printer className="w-3.5 h-3.5" /> PDF / Çıktı
          </button>
        </nav>

        {/* İçerik */}
        <div className="flex-1 min-w-0 space-y-8 print:space-y-12">
          {current && (
            <>
              <h2 className="text-lg font-display font-bold text-white print:text-black border-b border-white/[0.06] pb-3">
                {MAGAZINE_SECTION_LABELS[current.type]}
              </h2>

              {/* Öne çıkanlar önce */}
              {(current.entries ?? []).filter(e => e.is_featured).map(entry => (
                <article key={entry.id} className="space-y-3 print:break-after-page">
                  <div className="flex items-center gap-2">
                    <Star className="w-4 h-4 text-amber-400 shrink-0" fill="currentColor" />
                    <span className="text-[10px] text-amber-400 font-semibold uppercase tracking-wider">Öne Çıkan</span>
                  </div>
                  <h3 className="text-xl font-display font-bold text-white print:text-black">
                    {entry.submission?.assignment?.title}
                  </h3>
                  <p className="text-xs text-slate-400 print:text-gray-600">
                    {entry.display_name ?? 'Anonim'}
                  </p>
                  <div
                    className="prose prose-invert max-w-none text-sm leading-relaxed print:text-black print:prose-neutral"
                    dangerouslySetInnerHTML={{ __html: entry.submission?.latest_content ?? '<p><em>İçerik bulunamadı.</em></p>' }}
                  />
                </article>
              ))}

              {/* Diğerleri */}
              {(current.entries ?? []).filter(e => !e.is_featured).map(entry => (
                <article key={entry.id} className="space-y-2 border-t border-white/[0.04] pt-6 print:break-before-page">
                  <h3 className="text-base font-display font-semibold text-white print:text-black">
                    {entry.submission?.assignment?.title}
                  </h3>
                  <p className="text-xs text-slate-400 print:text-gray-600">{entry.display_name ?? 'Anonim'}</p>
                  <div
                    className="prose prose-invert max-w-none text-sm leading-relaxed print:text-black print:prose-neutral"
                    dangerouslySetInnerHTML={{ __html: entry.submission?.latest_content ?? '<p><em>İçerik bulunamadı.</em></p>' }}
                  />
                </article>
              ))}

              {(current.entries ?? []).length === 0 && (
                <p className="text-sm text-slate-500 text-center py-8">Bu bölümde yazı yok.</p>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: `app/(app)/classroom/[classroomId]/magazine/[magazineId]/page.tsx`**

```typescript
import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { MagazineReader } from '@/components/magazine/MagazineReader'
import type { MagazineSection } from '@/types'

export const dynamic = 'force-dynamic'

export default async function MagazineReaderPage({
  params,
}: {
  params: Promise<{ classroomId: string; magazineId: string }>
}) {
  const { classroomId, magazineId } = await params
  const supabase = await createClient()

  const { data: magazine } = await supabase.from('class_magazines').select('*').eq('id', magazineId).single()
  if (!magazine) notFound()

  const { data: classroom } = await supabase.from('classrooms').select('name, school_name').eq('id', classroomId).single()
  if (!classroom) notFound()

  const { data: sections } = await supabase
    .from('magazine_sections')
    .select('*')
    .eq('magazine_id', magazineId)
    .order('sort_order')

  const sectionIds = (sections ?? []).map(s => s.id)
  const { data: entries } = sectionIds.length > 0
    ? await supabase.from('magazine_entries').select(`
        *,
        submission:assignment_submissions(
          id, project_id, status,
          student:profiles!assignment_submissions_student_id_fkey(display_name, username),
          assignment:classroom_assignments!assignment_submissions_assignment_id_fkey(title)
        )
      `).in('section_id', sectionIds).order('sort_order')
    : { data: [] }

  // İçerikleri çek
  const projectIds = [...new Set((entries ?? []).map((e: { submission?: { project_id?: string } }) => e.submission?.project_id).filter(Boolean) as string[])]
  let contentMap: Record<string, string> = {}

  if (projectIds.length > 0) {
    const { data: chapters } = await supabase.from('chapters').select('project_id, id').in('project_id', projectIds)
    const chapterIds = (chapters ?? []).map(c => c.id)
    if (chapterIds.length > 0) {
      const { data: versions } = await supabase
        .from('chapter_versions')
        .select('chapter_id, content, created_at')
        .in('chapter_id', chapterIds)
        .order('created_at', { ascending: false })

      const latestPerChapter: Record<string, string> = {}
      for (const v of versions ?? []) {
        if (!latestPerChapter[v.chapter_id]) latestPerChapter[v.chapter_id] = v.content
      }
      for (const ch of chapters ?? []) {
        if (latestPerChapter[ch.id]) contentMap[ch.project_id] = latestPerChapter[ch.id]
      }
    }
  }

  const sectionsWithEntries: MagazineSection[] = (sections ?? []).map(s => ({
    ...s,
    entries: (entries ?? [])
      .filter((e: { section_id: string }) => e.section_id === s.id)
      .map((e: Record<string, unknown>) => ({
        ...e,
        submission: e.submission ? {
          ...(e.submission as Record<string, unknown>),
          latest_content: contentMap[(e.submission as { project_id?: string }).project_id ?? ''] ?? null,
        } : null,
      })),
  }))

  return (
    <MagazineReader
      title={magazine.title}
      issueNumber={magazine.issue_number}
      classroomName={classroom.name}
      schoolName={classroom.school_name}
      publishedAt={magazine.published_at ?? magazine.created_at}
      sections={sectionsWithEntries}
    />
  )
}
```

- [ ] **Step 3: `app/globals.css`'e print CSS ekle**

`app/globals.css` dosyasının sonuna ekle:

```css
@media print {
  nav, header, .print\:hidden { display: none !important; }
  body { background: white !important; color: black !important; }
  .prose { color: black !important; }
  .prose * { color: black !important; }
  article { page-break-inside: avoid; }
}
```

- [ ] **Step 4: Commit**

```bash
git add components/magazine app/(app)/classroom app/globals.css
git commit -m "feat: add magazine reader with section nav and print CSS"
```

---

### Task 6: Public Keşif Sayfası + Classroom'a Dergi Linki

**Files:**
- Create: `app/(public)/discover/magazines/page.tsx`
- Modify: `app/(app)/classroom/[classroomId]/page.tsx` (Dergi sekmesi/linki ekle)

**Interfaces:**
- Consumes: `GET /api/magazines`
- Produces: `/discover/magazines` keşif sayfası + classroom panelinde "Dergi" butonu

- [ ] **Step 1: `app/(public)/discover/magazines/page.tsx`**

```typescript
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { BookOpen } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function DiscoverMagazinesPage() {
  const supabase = await createClient()

  const { data: magazines } = await supabase
    .from('class_magazines')
    .select('id, title, issue_number, published_at, classroom_id, classroom:classrooms(name, school_name)')
    .eq('status', 'published')
    .order('published_at', { ascending: false })
    .limit(24)

  return (
    <div className="max-w-5xl mx-auto px-4 py-12 space-y-8">
      <div className="space-y-1">
        <h1 className="text-3xl font-display font-bold text-white flex items-center gap-2">
          <BookOpen className="w-7 h-7 text-primary" />
          Sınıf Dergileri
        </h1>
        <p className="text-sm text-slate-400">Öğretmen ve öğrencilerin oluşturduğu dönemsel yazı dergileri.</p>
      </div>

      {(magazines ?? []).length === 0 ? (
        <div className="text-center py-20 text-slate-500">
          <BookOpen className="w-12 h-12 mx-auto mb-3 opacity-20" />
          <p>Henüz yayımlanan dergi yok.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {(magazines ?? []).map((m) => {
            const cls = m.classroom as { name: string; school_name: string } | null
            return (
              <Link
                key={m.id}
                href={`/classroom/${m.classroom_id}/magazine/${m.id}`}
                className="p-5 rounded-2xl border border-white/[0.06] bg-white/[0.02] hover:border-primary/30 hover:bg-white/[0.04] transition-all group"
              >
                <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center mb-3">
                  <BookOpen className="w-5 h-5 text-primary" />
                </div>
                <p className="text-sm font-semibold text-white group-hover:text-primary transition-colors line-clamp-2">{m.title}</p>
                <p className="text-xs text-slate-500 mt-1">Sayı #{m.issue_number}</p>
                {cls && <p className="text-xs text-slate-500 mt-0.5">{cls.name} · {cls.school_name}</p>}
                {m.published_at && (
                  <p className="text-xs text-slate-600 mt-2">
                    {new Date(m.published_at).toLocaleDateString('tr-TR', { year: 'numeric', month: 'long' })}
                  </p>
                )}
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Classroom detail sayfasına Dergi linki ekle**

`app/(app)/classroom/[classroomId]/page.tsx` dosyasını oku. İçinde öğretmen için olan buton/link grubunu bul (genellikle "Yeni Ödev", "Analitik" gibi butonlar). Aşağıdaki linki o gruba ekle:

```tsx
import { BookOpen } from 'lucide-react'

// Mevcut butonların yanına:
<Link
  href={`/classroom/${classroomId}/magazine`}
  className="flex items-center gap-2 px-3 py-2 rounded-xl border border-white/[0.06] text-slate-300 hover:text-white hover:border-white/[0.12] text-sm transition-all"
>
  <BookOpen className="w-4 h-4 text-primary" />
  Dergi
</Link>
```

Öğretmen değil (student/parent) ise de aynı link görünsün — yayımlanan sayıları herkes görebilir.

- [ ] **Step 3: `/discover/magazines` linkini Navbar'a ekle**

`components/shared/Navbar.tsx` dosyasında "Keşfet" dropdown menüsünü bul. Mevcut "Evrenleri Keşfet", "Yazarlar Topluluğu" linklerinin yanına ekle:

```tsx
<DropdownMenuItem asChild>
  <Link href="/discover/magazines" className="flex items-center gap-2">
    <BookOpen className="w-4 h-4 text-primary" />
    Sınıf Dergileri
  </Link>
</DropdownMenuItem>
```

Not: Bu projede `DropdownMenuTrigger`'da `asChild` desteklenmiyor ama `DropdownMenuItem`'da asChild çalışıyor. Eğer çalışmazsa:
```tsx
<DropdownMenuItem>
  <Link href="/discover/magazines" className="flex items-center gap-2 w-full">
    <BookOpen className="w-4 h-4 text-primary" />
    Sınıf Dergileri
  </Link>
</DropdownMenuItem>
```

- [ ] **Step 4: Commit**

```bash
git add app/(public)/discover/magazines app/(app)/classroom components/shared/Navbar.tsx
git commit -m "feat: add magazine discover page, classroom link, navbar entry"
```
