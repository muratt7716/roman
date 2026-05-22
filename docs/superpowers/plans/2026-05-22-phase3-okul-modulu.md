# Faz 3 — Okul Modülü Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Öğretmenin sınıf oluşturup ödev atayabildiği, öğrencinin join koduyla katılıp mevcut TipTap editörüyle yazıp teslim ettiği, öğretmenin not + yorum verdiği okul modülünü eklemek.

**Architecture:** 4 yeni bağımsız tablo (`classrooms`, `classroom_members`, `classroom_assignments`, `assignment_submissions`) mevcut `projects` sisteminden ayrı tutulur. Öğrenci teslimi mevcut `projects` kaydına FK ile bağlanır — TipTap, versiyon geçmişi bedava gelir. `join_classroom_by_code` SECURITY DEFINER fonksiyonu join akışını güvenle yönetir. ChapterEditorClient'a `locked` + `submissionId` prop eklenerek teslim sonrası editör kilitlenir.

**Tech Stack:** Next.js 16 App Router · Supabase RLS · TypeScript · Tailwind v4 · shadcn/ui · lucide-react

---

## Dosya Haritası

| Dosya | İşlem | Sorumluluk |
|-------|-------|-----------|
| `supabase/schema.sql` | Modify | 4 yeni tablo + SECURITY DEFINER fn + RLS |
| `types/index.ts` | Modify | Classroom, Assignment, Submission tipleri |
| `app/api/classroom/route.ts` | Create | GET list / POST create |
| `app/api/classroom/join/route.ts` | Create | POST join (RPC wrapper) |
| `app/api/classroom/[classroomId]/route.ts` | Create | GET detail+members / DELETE |
| `app/api/classroom/[classroomId]/assignments/route.ts` | Create | GET list / POST create |
| `app/api/classroom/[classroomId]/assignments/[assignmentId]/route.ts` | Create | GET detail+submissions / PATCH update |
| `app/api/classroom/[classroomId]/assignments/[assignmentId]/start/route.ts` | Create | POST: proje+submission oluştur |
| `app/api/submissions/[submissionId]/route.ts` | Create | PATCH: submit veya grade |
| `components/classroom/ClassroomCard.tsx` | Create | Sınıf kartı |
| `components/classroom/AssignmentCard.tsx` | Create | Ödev kartı |
| `components/classroom/JoinCodeDisplay.tsx` | Create | Kod görüntüleme + kopyala |
| `components/classroom/GradePanel.tsx` | Create | Not + yorum formu (client) |
| `components/classroom/SubmissionList.tsx` | Create | Öğretmen: teslim listesi |
| `components/classroom/StudentAssignmentView.tsx` | Create | Öğrenci: ödev detay + aksiyonlar |
| `components/editor/TipTapEditor.tsx` | Modify | `editable?: boolean` prop ekle |
| `components/editor/ChapterEditorClient.tsx` | Modify | `locked` + `submissionId` prop + Teslim Et butonu |
| `app/(app)/projects/[slug]/write/[chapterId]/page.tsx` | Modify | searchParams `submission_id` okuma |
| `app/(app)/classroom/page.tsx` | Create | Öğretmen/öğrenci sınıf listesi |
| `app/(app)/classroom/new/page.tsx` | Create | Öğretmen: sınıf oluştur |
| `app/(app)/classroom/join/page.tsx` | Create | Öğrenci: kod giriş |
| `app/(app)/classroom/[classroomId]/page.tsx` | Create | Sınıf paneli (rol bazlı) |
| `app/(app)/classroom/[classroomId]/assignments/new/page.tsx` | Create | Öğretmen: ödev oluştur |
| `app/(app)/classroom/[classroomId]/assignments/[assignmentId]/page.tsx` | Create | Ödev sayfası (rol bazlı) |
| `components/shared/Navbar.tsx` | Modify | "Sınıfım" linki ekle |
| `CLAUDE.md` | Modify | Faz 3 dosya haritası + durum güncellemesi |

---

### Task 1: DB Schema

**Files:**
- Modify: `supabase/schema.sql`

- [ ] **Step 1:** `supabase/schema.sql` içinde `-- Chapter Reactions` bloğunun hemen öncesine ekle:

```sql
-- ============================================================
-- CLASSROOMS (Faz 3)
-- ============================================================

CREATE TABLE IF NOT EXISTS classrooms (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id    uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name        text NOT NULL CHECK (char_length(name) BETWEEN 2 AND 100),
  description text CHECK (char_length(description) <= 500),
  join_code   text NOT NULL UNIQUE CHECK (join_code ~ '^[A-Z0-9]{6}$'),
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_classrooms_owner     ON classrooms(owner_id);
CREATE INDEX IF NOT EXISTS idx_classrooms_join_code ON classrooms(join_code);

CREATE TABLE IF NOT EXISTS classroom_members (
  classroom_id uuid NOT NULL REFERENCES classrooms(id) ON DELETE CASCADE,
  user_id      uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role         text NOT NULL CHECK (role IN ('teacher','student')),
  joined_at    timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (classroom_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_classroom_members_user ON classroom_members(user_id);

CREATE TABLE IF NOT EXISTS classroom_assignments (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  classroom_id uuid NOT NULL REFERENCES classrooms(id) ON DELETE CASCADE,
  title        text NOT NULL CHECK (char_length(title) BETWEEN 3 AND 200),
  description  text CHECK (char_length(description) <= 2000),
  due_date     timestamptz,
  visibility   text NOT NULL DEFAULT 'private' CHECK (visibility IN ('private','class_visible')),
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_assignments_classroom ON classroom_assignments(classroom_id);

CREATE TABLE IF NOT EXISTS assignment_submissions (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id   uuid NOT NULL REFERENCES classroom_assignments(id) ON DELETE CASCADE,
  student_id      uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  project_id      uuid REFERENCES projects(id) ON DELETE SET NULL,
  status          text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','submitted','graded')),
  grade           int  CHECK (grade BETWEEN 0 AND 100),
  teacher_comment text CHECK (char_length(teacher_comment) <= 1000),
  submitted_at    timestamptz,
  graded_at       timestamptz,
  UNIQUE (assignment_id, student_id)
);

CREATE INDEX IF NOT EXISTS idx_submissions_assignment ON assignment_submissions(assignment_id);
CREATE INDEX IF NOT EXISTS idx_submissions_student    ON assignment_submissions(student_id);

-- SECURITY DEFINER: join kodu ile sınıfa katılma (RLS bypass gerektirir)
CREATE OR REPLACE FUNCTION join_classroom_by_code(p_code text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_classroom classrooms%ROWTYPE;
  v_user_id   uuid := auth.uid();
BEGIN
  IF v_user_id IS NULL THEN
    RETURN json_build_object('error', 'Giriş yapman gerekiyor.');
  END IF;

  SELECT * INTO v_classroom FROM classrooms WHERE join_code = upper(p_code);

  IF NOT FOUND THEN
    RETURN json_build_object('error', 'Sınıf bulunamadı.');
  END IF;

  IF EXISTS (
    SELECT 1 FROM classroom_members
    WHERE classroom_id = v_classroom.id AND user_id = v_user_id
  ) THEN
    RETURN json_build_object('classroom_id', v_classroom.id, 'already_member', true);
  END IF;

  INSERT INTO classroom_members (classroom_id, user_id, role)
  VALUES (v_classroom.id, v_user_id, 'student');

  RETURN json_build_object('classroom_id', v_classroom.id, 'already_member', false);
END;
$$;

-- RLS: classrooms
ALTER TABLE classrooms ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "classrooms_select_member" ON classrooms;
DROP POLICY IF EXISTS "classrooms_insert_owner"  ON classrooms;
DROP POLICY IF EXISTS "classrooms_update_owner"  ON classrooms;
DROP POLICY IF EXISTS "classrooms_delete_owner"  ON classrooms;

CREATE POLICY "classrooms_select_member" ON classrooms FOR SELECT USING (
  owner_id = auth.uid()
  OR EXISTS (SELECT 1 FROM classroom_members WHERE classroom_id = id AND user_id = auth.uid())
);
CREATE POLICY "classrooms_insert_owner" ON classrooms FOR INSERT WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "classrooms_update_owner" ON classrooms FOR UPDATE USING (auth.uid() = owner_id);
CREATE POLICY "classrooms_delete_owner" ON classrooms FOR DELETE USING (auth.uid() = owner_id);

-- RLS: classroom_members
ALTER TABLE classroom_members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "cls_members_select" ON classroom_members;
DROP POLICY IF EXISTS "cls_members_insert" ON classroom_members;
DROP POLICY IF EXISTS "cls_members_delete" ON classroom_members;

CREATE POLICY "cls_members_select" ON classroom_members FOR SELECT USING (
  user_id = auth.uid()
  OR EXISTS (SELECT 1 FROM classrooms WHERE id = classroom_id AND owner_id = auth.uid())
);
CREATE POLICY "cls_members_insert" ON classroom_members FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "cls_members_delete" ON classroom_members FOR DELETE USING (
  user_id = auth.uid()
  OR EXISTS (SELECT 1 FROM classrooms WHERE id = classroom_id AND owner_id = auth.uid())
);

-- RLS: classroom_assignments
ALTER TABLE classroom_assignments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "assignments_select_member"  ON classroom_assignments;
DROP POLICY IF EXISTS "assignments_insert_teacher" ON classroom_assignments;
DROP POLICY IF EXISTS "assignments_update_teacher" ON classroom_assignments;
DROP POLICY IF EXISTS "assignments_delete_teacher" ON classroom_assignments;

CREATE POLICY "assignments_select_member" ON classroom_assignments FOR SELECT USING (
  EXISTS (SELECT 1 FROM classroom_members WHERE classroom_id = classroom_assignments.classroom_id AND user_id = auth.uid())
  OR EXISTS (SELECT 1 FROM classrooms WHERE id = classroom_assignments.classroom_id AND owner_id = auth.uid())
);
CREATE POLICY "assignments_insert_teacher" ON classroom_assignments FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM classrooms WHERE id = classroom_id AND owner_id = auth.uid())
);
CREATE POLICY "assignments_update_teacher" ON classroom_assignments FOR UPDATE USING (
  EXISTS (SELECT 1 FROM classrooms WHERE id = classroom_id AND owner_id = auth.uid())
);
CREATE POLICY "assignments_delete_teacher" ON classroom_assignments FOR DELETE USING (
  EXISTS (SELECT 1 FROM classrooms WHERE id = classroom_id AND owner_id = auth.uid())
);

-- RLS: assignment_submissions
ALTER TABLE assignment_submissions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "submissions_select_own_or_teacher" ON assignment_submissions;
DROP POLICY IF EXISTS "submissions_select_class_visible"  ON assignment_submissions;
DROP POLICY IF EXISTS "submissions_insert_student"        ON assignment_submissions;
DROP POLICY IF EXISTS "submissions_update_student_draft"  ON assignment_submissions;
DROP POLICY IF EXISTS "submissions_update_teacher_grade"  ON assignment_submissions;

CREATE POLICY "submissions_select_own_or_teacher" ON assignment_submissions FOR SELECT USING (
  student_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM classroom_assignments ca
    JOIN classrooms c ON c.id = ca.classroom_id
    WHERE ca.id = assignment_id AND c.owner_id = auth.uid()
  )
  OR (
    EXISTS (SELECT 1 FROM classroom_assignments ca WHERE ca.id = assignment_id AND ca.visibility = 'class_visible')
    AND EXISTS (
      SELECT 1 FROM classroom_assignments ca
      JOIN classroom_members cm ON cm.classroom_id = ca.classroom_id
      WHERE ca.id = assignment_id AND cm.user_id = auth.uid()
    )
  )
);
CREATE POLICY "submissions_insert_student" ON assignment_submissions FOR INSERT WITH CHECK (
  auth.uid() = student_id
);
CREATE POLICY "submissions_update_student_draft" ON assignment_submissions FOR UPDATE USING (
  student_id = auth.uid() AND status = 'draft'
) WITH CHECK (grade IS NULL AND teacher_comment IS NULL);
CREATE POLICY "submissions_update_teacher_grade" ON assignment_submissions FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM classroom_assignments ca
    JOIN classrooms c ON c.id = ca.classroom_id
    WHERE ca.id = assignment_id AND c.owner_id = auth.uid()
  )
);
```

- [ ] **Step 2:** Commit:

```bash
git add supabase/schema.sql
git commit -m "feat: add classroom, assignment, submission tables and RLS to schema"
```

> **Supabase'e uygula:** Dashboard > SQL Editor > bu bloğu çalıştır.

---

### Task 2: Tip Tanımları

**Files:**
- Modify: `types/index.ts`

- [ ] **Step 1:** `types/index.ts` dosyasının sonuna ekle:

```typescript
export type ClassroomRole = 'teacher' | 'student'
export type SubmissionStatus = 'draft' | 'submitted' | 'graded'
export type AssignmentVisibility = 'private' | 'class_visible'

export interface Classroom {
  id: string
  owner_id: string
  name: string
  description: string | null
  join_code: string
  created_at: string
}

export interface ClassroomMember {
  classroom_id: string
  user_id: string
  role: ClassroomRole
  joined_at: string
  profile?: Pick<Profile, 'id' | 'username' | 'display_name' | 'avatar_url'>
}

export interface ClassroomAssignment {
  id: string
  classroom_id: string
  title: string
  description: string | null
  due_date: string | null
  visibility: AssignmentVisibility
  created_at: string
}

export interface AssignmentSubmission {
  id: string
  assignment_id: string
  student_id: string
  project_id: string | null
  status: SubmissionStatus
  grade: number | null
  teacher_comment: string | null
  submitted_at: string | null
  graded_at: string | null
  student?: Pick<Profile, 'id' | 'username' | 'display_name' | 'avatar_url'>
}
```

- [ ] **Step 2:** Build kontrol:

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3:** Commit:

```bash
git add types/index.ts
git commit -m "feat: add Phase 3 classroom type definitions"
```

---

### Task 3: Classroom CRUD API Rotaları

**Files:**
- Create: `app/api/classroom/route.ts`
- Create: `app/api/classroom/join/route.ts`
- Create: `app/api/classroom/[classroomId]/route.ts`

- [ ] **Step 1:** `app/api/classroom/route.ts` oluştur:

```typescript
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

function generateJoinCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  return Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
}

// GET /api/classroom — kullanıcının öğretmen/öğrenci olduğu sınıflar
export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Giriş yapman gerekiyor.' }, { status: 401 })

  const { data, error } = await supabase
    .from('classroom_members')
    .select('role, classroom:classrooms(*)')
    .eq('user_id', user.id)
    .order('joined_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ classrooms: data ?? [] })
}

// POST /api/classroom — sınıf oluştur
// Body: { name: string, description?: string }
export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Giriş yapman gerekiyor.' }, { status: 401 })

  const { name, description } = await req.json()
  if (!name || name.trim().length < 2 || name.trim().length > 100) {
    return NextResponse.json({ error: 'Sınıf adı 2-100 karakter olmalı.' }, { status: 400 })
  }

  // Benzersiz join_code üret (çakışma ihtimali ihmal edilebilir; retry yok)
  const join_code = generateJoinCode()

  const { data: classroom, error } = await supabase
    .from('classrooms')
    .insert({ owner_id: user.id, name: name.trim(), description: description?.trim() || null, join_code })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Öğretmeni üye olarak ekle
  await supabase.from('classroom_members').insert({
    classroom_id: classroom.id,
    user_id: user.id,
    role: 'teacher',
  })

  return NextResponse.json({ classroom }, { status: 201 })
}
```

- [ ] **Step 2:** `app/api/classroom/join/route.ts` oluştur:

```typescript
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// POST /api/classroom/join
// Body: { join_code: string }
export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Giriş yapman gerekiyor.' }, { status: 401 })

  const { join_code } = await req.json()
  if (!join_code || typeof join_code !== 'string') {
    return NextResponse.json({ error: 'Geçersiz kod.' }, { status: 400 })
  }

  const { data, error } = await supabase.rpc('join_classroom_by_code', {
    p_code: join_code.trim().toUpperCase(),
  })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (data?.error) return NextResponse.json({ error: data.error }, { status: 400 })

  return NextResponse.json({
    classroom_id: data.classroom_id,
    already_member: data.already_member,
  })
}
```

- [ ] **Step 3:** `app/api/classroom/[classroomId]/route.ts` oluştur:

```typescript
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

interface Params { params: Promise<{ classroomId: string }> }

// GET /api/classroom/[classroomId] — sınıf detayı + üyeler
export async function GET(_req: Request, { params }: Params) {
  const { classroomId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Giriş yapman gerekiyor.' }, { status: 401 })

  const [{ data: classroom }, { data: members }] = await Promise.all([
    supabase.from('classrooms').select('*').eq('id', classroomId).single(),
    supabase
      .from('classroom_members')
      .select('*, profile:profiles(id, username, display_name, avatar_url)')
      .eq('classroom_id', classroomId),
  ])

  if (!classroom) return NextResponse.json({ error: 'Sınıf bulunamadı.' }, { status: 404 })

  const myRole = members?.find((m: any) => m.user_id === user.id)?.role ?? null
  if (!myRole) return NextResponse.json({ error: 'Bu sınıfa erişim yetkin yok.' }, { status: 403 })

  return NextResponse.json({ classroom, members: members ?? [], myRole })
}

// DELETE /api/classroom/[classroomId] — sınıfı sil (sadece owner)
export async function DELETE(_req: Request, { params }: Params) {
  const { classroomId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Giriş yapman gerekiyor.' }, { status: 401 })

  const { error } = await supabase
    .from('classrooms')
    .delete()
    .eq('id', classroomId)
    .eq('owner_id', user.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
```

- [ ] **Step 4:** Build kontrol:

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 5:** Commit:

```bash
git add app/api/classroom/route.ts app/api/classroom/join/route.ts "app/api/classroom/[classroomId]/route.ts"
git commit -m "feat: add classroom CRUD and join API routes"
```

---

### Task 4: Assignment API Rotaları

**Files:**
- Create: `app/api/classroom/[classroomId]/assignments/route.ts`
- Create: `app/api/classroom/[classroomId]/assignments/[assignmentId]/route.ts`

- [ ] **Step 1:** `app/api/classroom/[classroomId]/assignments/route.ts` oluştur:

```typescript
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

interface Params { params: Promise<{ classroomId: string }> }

// GET /api/classroom/[classroomId]/assignments
export async function GET(_req: Request, { params }: Params) {
  const { classroomId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Giriş yapman gerekiyor.' }, { status: 401 })

  const { data, error } = await supabase
    .from('classroom_assignments')
    .select('*')
    .eq('classroom_id', classroomId)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ assignments: data ?? [] })
}

// POST /api/classroom/[classroomId]/assignments
// Body: { title, description?, due_date?, visibility }
export async function POST(req: Request, { params }: Params) {
  const { classroomId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Giriş yapman gerekiyor.' }, { status: 401 })

  // Sadece öğretmen ödev oluşturabilir
  const { data: classroom } = await supabase
    .from('classrooms')
    .select('id')
    .eq('id', classroomId)
    .eq('owner_id', user.id)
    .single()

  if (!classroom) return NextResponse.json({ error: 'Yetki yok.' }, { status: 403 })

  const { title, description, due_date, visibility } = await req.json()
  if (!title || title.trim().length < 3 || title.trim().length > 200) {
    return NextResponse.json({ error: 'Başlık 3-200 karakter olmalı.' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('classroom_assignments')
    .insert({
      classroom_id: classroomId,
      title: title.trim(),
      description: description?.trim() || null,
      due_date: due_date || null,
      visibility: visibility === 'class_visible' ? 'class_visible' : 'private',
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ assignment: data }, { status: 201 })
}
```

- [ ] **Step 2:** `app/api/classroom/[classroomId]/assignments/[assignmentId]/route.ts` oluştur:

```typescript
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

interface Params { params: Promise<{ classroomId: string; assignmentId: string }> }

// GET /api/classroom/[classroomId]/assignments/[assignmentId]
// Öğretmen: tüm teslimler + öğrenci profili; Öğrenci: kendi teslimi
export async function GET(_req: Request, { params }: Params) {
  const { classroomId, assignmentId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Giriş yapman gerekiyor.' }, { status: 401 })

  const [{ data: assignment }, { data: myMembership }] = await Promise.all([
    supabase.from('classroom_assignments').select('*').eq('id', assignmentId).single(),
    supabase.from('classroom_members').select('role').eq('classroom_id', classroomId).eq('user_id', user.id).single(),
  ])

  if (!assignment || !myMembership) return NextResponse.json({ error: 'Erişim yok.' }, { status: 404 })

  const isTeacher = myMembership.role === 'teacher'

  if (isTeacher) {
    const { data: submissions } = await supabase
      .from('assignment_submissions')
      .select('*, student:profiles(id, username, display_name, avatar_url)')
      .eq('assignment_id', assignmentId)
      .order('submitted_at', { ascending: false })
    return NextResponse.json({ assignment, submissions: submissions ?? [], myRole: 'teacher' })
  } else {
    const { data: submission } = await supabase
      .from('assignment_submissions')
      .select('*')
      .eq('assignment_id', assignmentId)
      .eq('student_id', user.id)
      .maybeSingle()
    return NextResponse.json({ assignment, submission: submission ?? null, myRole: 'student' })
  }
}

// PATCH /api/classroom/[classroomId]/assignments/[assignmentId]
// Body: { title?, description?, due_date?, visibility? }
export async function PATCH(req: Request, { params }: Params) {
  const { classroomId, assignmentId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Giriş yapman gerekiyor.' }, { status: 401 })

  const { data: classroom } = await supabase
    .from('classrooms')
    .select('id')
    .eq('id', classroomId)
    .eq('owner_id', user.id)
    .single()
  if (!classroom) return NextResponse.json({ error: 'Yetki yok.' }, { status: 403 })

  const body = await req.json()
  const updates: Record<string, unknown> = {}
  if (body.title) updates.title = body.title.trim()
  if (body.description !== undefined) updates.description = body.description?.trim() || null
  if (body.due_date !== undefined) updates.due_date = body.due_date || null
  if (body.visibility) updates.visibility = body.visibility

  const { data, error } = await supabase
    .from('classroom_assignments')
    .update(updates)
    .eq('id', assignmentId)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ assignment: data })
}
```

- [ ] **Step 3:** Build kontrol:

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4:** Commit:

```bash
git add "app/api/classroom/[classroomId]/assignments/route.ts" "app/api/classroom/[classroomId]/assignments/[assignmentId]/route.ts"
git commit -m "feat: add assignment CRUD API routes"
```

---

### Task 5: Submission API Rotaları

**Files:**
- Create: `app/api/classroom/[classroomId]/assignments/[assignmentId]/start/route.ts`
- Create: `app/api/submissions/[submissionId]/route.ts`

- [ ] **Step 1:** `app/api/classroom/[classroomId]/assignments/[assignmentId]/start/route.ts` oluştur:

```typescript
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

interface Params { params: Promise<{ classroomId: string; assignmentId: string }> }

// POST /api/classroom/[classroomId]/assignments/[assignmentId]/start
// Öğrenci için project + chapter + submission kaydı oluşturur
// Zaten başladıysa mevcut submission'ı döner
export async function POST(_req: Request, { params }: Params) {
  const { classroomId, assignmentId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Giriş yapman gerekiyor.' }, { status: 401 })

  // Öğrenci mi kontrol et
  const { data: membership } = await supabase
    .from('classroom_members')
    .select('role')
    .eq('classroom_id', classroomId)
    .eq('user_id', user.id)
    .single()
  if (!membership || membership.role !== 'student') {
    return NextResponse.json({ error: 'Sadece öğrenciler başlayabilir.' }, { status: 403 })
  }

  // Zaten başladı mı?
  const { data: existing } = await supabase
    .from('assignment_submissions')
    .select('id, project_id')
    .eq('assignment_id', assignmentId)
    .eq('student_id', user.id)
    .maybeSingle()

  if (existing?.project_id) {
    // chapter_id bul
    const { data: chapter } = await supabase
      .from('chapters')
      .select('id')
      .eq('project_id', existing.project_id)
      .order('created_at', { ascending: true })
      .limit(1)
      .single()
    return NextResponse.json({
      submission_id: existing.id,
      project_id: existing.project_id,
      chapter_id: chapter?.id,
    })
  }

  // Ödev bilgisi al
  const { data: assignment } = await supabase
    .from('classroom_assignments')
    .select('title')
    .eq('id', assignmentId)
    .single()
  if (!assignment) return NextResponse.json({ error: 'Ödev bulunamadı.' }, { status: 404 })

  // Profile için username al (slug için)
  const { data: profile } = await supabase
    .from('profiles')
    .select('username')
    .eq('id', user.id)
    .single()

  const slug = `odev-${assignmentId.slice(0, 8)}-${user.id.slice(0, 8)}`

  // Project oluştur
  const { data: project, error: projectError } = await supabase
    .from('projects')
    .insert({
      owner_id: user.id,
      title: assignment.title,
      slug,
      visibility: 'closed',
      collaboration_status: 'active',
    })
    .select()
    .single()
  if (projectError) return NextResponse.json({ error: projectError.message }, { status: 500 })

  // Chapter oluştur
  const { data: chapter, error: chapterError } = await supabase
    .from('chapters')
    .insert({
      project_id: project.id,
      title: assignment.title,
      status: 'draft',
      order_index: 1,
      created_by: user.id,
    })
    .select()
    .single()
  if (chapterError) return NextResponse.json({ error: chapterError.message }, { status: 500 })

  // Submission kaydı oluştur
  const { data: submission, error: subError } = await supabase
    .from('assignment_submissions')
    .insert({
      assignment_id: assignmentId,
      student_id: user.id,
      project_id: project.id,
      status: 'draft',
    })
    .select()
    .single()
  if (subError) return NextResponse.json({ error: subError.message }, { status: 500 })

  return NextResponse.json({
    submission_id: submission.id,
    project_id: project.id,
    chapter_id: chapter.id,
  }, { status: 201 })
}
```

- [ ] **Step 2:** `app/api/submissions/[submissionId]/route.ts` oluştur:

```typescript
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

interface Params { params: Promise<{ submissionId: string }> }

// PATCH /api/submissions/[submissionId]
// Body: { action: 'submit' } | { action: 'grade', grade: number, comment?: string } | { action: 'reopen' }
export async function PATCH(req: Request, { params }: Params) {
  const { submissionId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Giriş yapman gerekiyor.' }, { status: 401 })

  const body = await req.json()
  const { action } = body

  if (action === 'submit') {
    // Öğrenci kendi draft teslimini gönderir
    const { data, error } = await supabase
      .from('assignment_submissions')
      .update({ status: 'submitted', submitted_at: new Date().toISOString() })
      .eq('id', submissionId)
      .eq('student_id', user.id)
      .eq('status', 'draft')
      .select()
      .single()
    if (error || !data) return NextResponse.json({ error: 'Teslim edilemedi.' }, { status: 400 })
    return NextResponse.json({ submission: data })
  }

  if (action === 'grade') {
    const { grade, comment } = body
    if (typeof grade !== 'number' || grade < 0 || grade > 100) {
      return NextResponse.json({ error: 'Not 0-100 arasında olmalı.' }, { status: 400 })
    }
    // Öğretmen mi? — submission üzerinden classroom owner kontrolü
    const { data: submission } = await supabase
      .from('assignment_submissions')
      .select('assignment_id')
      .eq('id', submissionId)
      .single()
    if (!submission) return NextResponse.json({ error: 'Teslim bulunamadı.' }, { status: 404 })

    const { data: ownerCheck } = await supabase
      .from('classroom_assignments')
      .select('classrooms!inner(owner_id)')
      .eq('id', submission.assignment_id)
      .single()
    const ownerId = (ownerCheck as any)?.classrooms?.owner_id
    if (ownerId !== user.id) return NextResponse.json({ error: 'Yetki yok.' }, { status: 403 })

    const { data, error } = await supabase
      .from('assignment_submissions')
      .update({
        grade,
        teacher_comment: comment?.trim() || null,
        status: 'graded',
        graded_at: new Date().toISOString(),
      })
      .eq('id', submissionId)
      .select()
      .single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ submission: data })
  }

  if (action === 'reopen') {
    // Öğretmen "Revize Et" yapar → draft'a döner
    const { data: submission } = await supabase
      .from('assignment_submissions')
      .select('assignment_id')
      .eq('id', submissionId)
      .single()
    if (!submission) return NextResponse.json({ error: 'Teslim bulunamadı.' }, { status: 404 })

    const { data: ownerCheck } = await supabase
      .from('classroom_assignments')
      .select('classrooms!inner(owner_id)')
      .eq('id', submission.assignment_id)
      .single()
    const ownerId = (ownerCheck as any)?.classrooms?.owner_id
    if (ownerId !== user.id) return NextResponse.json({ error: 'Yetki yok.' }, { status: 403 })

    const { data, error } = await supabase
      .from('assignment_submissions')
      .update({ status: 'draft', submitted_at: null })
      .eq('id', submissionId)
      .select()
      .single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ submission: data })
  }

  return NextResponse.json({ error: 'Geçersiz action.' }, { status: 400 })
}
```

- [ ] **Step 3:** Build kontrol:

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4:** Commit:

```bash
git add "app/api/classroom/[classroomId]/assignments/[assignmentId]/start/route.ts" "app/api/submissions/[submissionId]/route.ts"
git commit -m "feat: add assignment start and submission PATCH API routes"
```

---

### Task 6: ClassroomCard + AssignmentCard Bileşenleri

**Files:**
- Create: `components/classroom/ClassroomCard.tsx`
- Create: `components/classroom/AssignmentCard.tsx`
- Create: `components/classroom/JoinCodeDisplay.tsx`

- [ ] **Step 1:** `components/classroom/ClassroomCard.tsx` oluştur:

```typescript
import Link from 'next/link'
import { Users, BookOpen } from 'lucide-react'
import type { Classroom, ClassroomRole } from '@/types'

interface Props {
  classroom: Classroom
  role: ClassroomRole
  memberCount?: number
  assignmentCount?: number
}

export function ClassroomCard({ classroom, role, memberCount = 0, assignmentCount = 0 }: Props) {
  return (
    <Link
      href={`/classroom/${classroom.id}`}
      className="glass-card rounded-2xl p-5 block hover:border-white/[0.15] transition-colors space-y-3"
    >
      <div className="flex items-start justify-between gap-2">
        <h3 className="font-display font-semibold text-white line-clamp-1">{classroom.name}</h3>
        <span className={`shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full ${
          role === 'teacher'
            ? 'bg-violet-500/20 text-violet-300'
            : 'bg-sky-500/20 text-sky-300'
        }`}>
          {role === 'teacher' ? 'Öğretmen' : 'Öğrenci'}
        </span>
      </div>
      {classroom.description && (
        <p className="text-xs text-muted-foreground line-clamp-2">{classroom.description}</p>
      )}
      <div className="flex items-center gap-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1"><Users className="w-3.5 h-3.5" />{memberCount}</span>
        <span className="flex items-center gap-1"><BookOpen className="w-3.5 h-3.5" />{assignmentCount} ödev</span>
      </div>
    </Link>
  )
}
```

- [ ] **Step 2:** `components/classroom/AssignmentCard.tsx` oluştur:

```typescript
import Link from 'next/link'
import { Clock, CheckCircle2, Circle, Pencil } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { ClassroomAssignment, AssignmentSubmission } from '@/types'

interface Props {
  assignment: ClassroomAssignment
  classroomId: string
  submission?: AssignmentSubmission | null
  isTeacher?: boolean
}

const STATUS_META = {
  draft:     { label: 'Devam Ediyor', color: 'text-amber-400',   icon: Pencil },
  submitted: { label: 'Teslim Edildi', color: 'text-sky-400',    icon: CheckCircle2 },
  graded:    { label: 'Notlandı',      color: 'text-emerald-400', icon: CheckCircle2 },
}

export function AssignmentCard({ assignment, classroomId, submission, isTeacher = false }: Props) {
  const isPast = assignment.due_date ? new Date(assignment.due_date) < new Date() : false
  const status = submission?.status
  const StatusIcon = status ? STATUS_META[status].icon : Circle

  return (
    <Link
      href={`/classroom/${classroomId}/assignments/${assignment.id}`}
      className="glass-card rounded-xl p-4 block hover:border-white/[0.15] transition-colors"
    >
      <div className="flex items-start justify-between gap-2">
        <p className="font-medium text-white text-sm line-clamp-2">{assignment.title}</p>
        {!isTeacher && status && (
          <span className={cn('shrink-0 flex items-center gap-1 text-[10px] font-medium', STATUS_META[status].color)}>
            <StatusIcon className="w-3 h-3" />
            {STATUS_META[status].label}
          </span>
        )}
        {!isTeacher && !status && (
          <span className="shrink-0 text-[10px] text-muted-foreground">Başlanmadı</span>
        )}
      </div>

      {assignment.due_date && (
        <p className={cn('text-xs mt-2 flex items-center gap-1', isPast ? 'text-red-400' : 'text-muted-foreground')}>
          <Clock className="w-3 h-3" />
          {new Date(assignment.due_date).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })}
        </p>
      )}

      {!isTeacher && submission?.grade !== null && submission?.grade !== undefined && (
        <p className="text-xs mt-1 text-emerald-400 font-medium">Not: {submission.grade}/100</p>
      )}
    </Link>
  )
}
```

- [ ] **Step 3:** `components/classroom/JoinCodeDisplay.tsx` oluştur:

```typescript
'use client'

import { useState } from 'react'
import { Copy, Check } from 'lucide-react'

interface Props {
  code: string
}

export function JoinCodeDisplay({ code }: Props) {
  const [copied, setCopied] = useState(false)

  function copy() {
    navigator.clipboard.writeText(code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="glass-card rounded-xl p-4 flex items-center justify-between gap-4">
      <div>
        <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Katılım Kodu</p>
        <p className="text-3xl font-display font-bold tracking-[0.2em] text-white">{code}</p>
      </div>
      <button
        onClick={copy}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/[0.06] hover:bg-white/[0.1] text-xs text-muted-foreground hover:text-white transition-colors"
      >
        {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
        {copied ? 'Kopyalandı' : 'Kopyala'}
      </button>
    </div>
  )
}
```

- [ ] **Step 4:** Build kontrol:

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 5:** Commit:

```bash
git add components/classroom/ClassroomCard.tsx components/classroom/AssignmentCard.tsx components/classroom/JoinCodeDisplay.tsx
git commit -m "feat: add ClassroomCard, AssignmentCard, JoinCodeDisplay components"
```

---

### Task 7: GradePanel + SubmissionList + StudentAssignmentView Bileşenleri

**Files:**
- Create: `components/classroom/GradePanel.tsx`
- Create: `components/classroom/SubmissionList.tsx`
- Create: `components/classroom/StudentAssignmentView.tsx`

- [ ] **Step 1:** `components/classroom/GradePanel.tsx` oluştur:

```typescript
'use client'

import { useState } from 'react'
import { Check, RotateCcw } from 'lucide-react'
import type { AssignmentSubmission } from '@/types'

interface Props {
  submission: AssignmentSubmission
  onGraded: (updated: AssignmentSubmission) => void
}

export function GradePanel({ submission, onGraded }: Props) {
  const [grade, setGrade] = useState(submission.grade?.toString() ?? '')
  const [comment, setComment] = useState(submission.teacher_comment ?? '')
  const [saving, setSaving] = useState(false)
  const [reopening, setReopening] = useState(false)

  async function saveGrade() {
    const g = parseInt(grade)
    if (isNaN(g) || g < 0 || g > 100) return
    setSaving(true)
    const res = await fetch(`/api/submissions/${submission.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'grade', grade: g, comment }),
    })
    if (res.ok) {
      const { submission: updated } = await res.json()
      onGraded(updated)
    }
    setSaving(false)
  }

  async function reopen() {
    setReopening(true)
    const res = await fetch(`/api/submissions/${submission.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'reopen' }),
    })
    if (res.ok) {
      const { submission: updated } = await res.json()
      onGraded(updated)
    }
    setReopening(false)
  }

  return (
    <div className="space-y-3 p-4 bg-white/[0.02] rounded-xl border border-white/[0.06]">
      <div className="flex items-center gap-3">
        <div className="flex-1">
          <label className="text-[10px] text-muted-foreground uppercase tracking-wider block mb-1">Not (0-100)</label>
          <input
            type="number"
            min={0}
            max={100}
            value={grade}
            onChange={e => setGrade(e.target.value)}
            className="w-full bg-white/[0.06] border border-white/[0.1] rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:ring-1 focus:ring-primary"
            placeholder="85"
          />
        </div>
        <button
          onClick={saveGrade}
          disabled={saving || !grade}
          className="mt-5 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 text-xs font-medium transition-colors disabled:opacity-50"
        >
          <Check className="w-3.5 h-3.5" />
          {saving ? 'Kaydediliyor...' : 'Kaydet'}
        </button>
      </div>

      <div>
        <label className="text-[10px] text-muted-foreground uppercase tracking-wider block mb-1">Yorum (opsiyonel)</label>
        <textarea
          value={comment}
          onChange={e => setComment(e.target.value)}
          rows={2}
          maxLength={1000}
          className="w-full bg-white/[0.06] border border-white/[0.1] rounded-lg px-3 py-2 text-sm text-white resize-none focus:outline-none focus:ring-1 focus:ring-primary"
          placeholder="Öğrenciye geri bildirim..."
        />
      </div>

      {(submission.status === 'submitted' || submission.status === 'graded') && (
        <button
          onClick={reopen}
          disabled={reopening}
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-white transition-colors"
        >
          <RotateCcw className="w-3 h-3" />
          {reopening ? 'Açılıyor...' : 'Revize Et (Draft\'a Döndür)'}
        </button>
      )}
    </div>
  )
}
```

- [ ] **Step 2:** `components/classroom/SubmissionList.tsx` oluştur:

```typescript
'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ExternalLink, ChevronDown, ChevronUp } from 'lucide-react'
import { GradePanel } from './GradePanel'
import { cn } from '@/lib/utils'
import type { AssignmentSubmission } from '@/types'

interface Props {
  initialSubmissions: AssignmentSubmission[]
  classroomId: string
}

const STATUS_LABEL: Record<string, { label: string; color: string }> = {
  draft:     { label: 'Devam Ediyor', color: 'text-amber-400' },
  submitted: { label: 'Teslim Edildi', color: 'text-sky-400' },
  graded:    { label: 'Notlandı',      color: 'text-emerald-400' },
}

export function SubmissionList({ initialSubmissions, classroomId }: Props) {
  const [submissions, setSubmissions] = useState(initialSubmissions)
  const [expanded, setExpanded] = useState<string | null>(null)

  function updateSubmission(updated: AssignmentSubmission) {
    setSubmissions(prev => prev.map(s => s.id === updated.id ? { ...s, ...updated } : s))
  }

  if (submissions.length === 0) {
    return <p className="text-sm text-muted-foreground py-4">Henüz teslim yok.</p>
  }

  return (
    <div className="space-y-2">
      {submissions.map(sub => {
        const meta = STATUS_LABEL[sub.status]
        const isOpen = expanded === sub.id
        const student = (sub as any).student

        return (
          <div key={sub.id} className="glass-card rounded-xl overflow-hidden">
            <button
              className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left hover:bg-white/[0.02] transition-colors"
              onClick={() => setExpanded(isOpen ? null : sub.id)}
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold text-primary shrink-0">
                  {student?.display_name?.[0] ?? student?.username?.[0] ?? '?'}
                </div>
                <span className="text-sm font-medium truncate">
                  {student?.display_name ?? student?.username ?? 'Öğrenci'}
                </span>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <span className={cn('text-xs font-medium', meta?.color)}>{meta?.label}</span>
                {sub.grade !== null && <span className="text-xs text-emerald-400 font-bold">{sub.grade}/100</span>}
                {isOpen ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
              </div>
            </button>

            {isOpen && (
              <div className="px-4 pb-4 space-y-3 border-t border-white/[0.05]">
                {sub.project_id && (
                  <Link
                    href={`/projects/${sub.project_id}/write`}
                    target="_blank"
                    className="flex items-center gap-1.5 text-xs text-primary hover:text-accent transition-colors mt-3"
                  >
                    <ExternalLink className="w-3.5 h-3.5" /> Yazıyı Görüntüle
                  </Link>
                )}
                {(sub.status === 'submitted' || sub.status === 'graded') && (
                  <GradePanel submission={sub} onGraded={updateSubmission} />
                )}
                {sub.status === 'draft' && (
                  <p className="text-xs text-muted-foreground">Öğrenci henüz teslim etmedi.</p>
                )}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
```

- [ ] **Step 3:** `components/classroom/StudentAssignmentView.tsx` oluştur:

```typescript
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { PenLine, Send, Lock } from 'lucide-react'
import type { ClassroomAssignment, AssignmentSubmission } from '@/types'

interface Props {
  assignment: ClassroomAssignment
  classroomId: string
  initialSubmission: AssignmentSubmission | null
}

export function StudentAssignmentView({ assignment, classroomId, initialSubmission }: Props) {
  const [submission, setSubmission] = useState(initialSubmission)
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function startWriting() {
    setLoading(true)
    const res = await fetch(
      `/api/classroom/${classroomId}/assignments/${assignment.id}/start`,
      { method: 'POST' }
    )
    if (res.ok) {
      const { submission_id, project_id, chapter_id } = await res.json()
      router.push(`/projects/${project_id}/write/${chapter_id}?submission_id=${submission_id}`)
    }
    setLoading(false)
  }

  function continueWriting() {
    if (!submission?.project_id) return
    // chapter_id'yi bulmak için projeye yönlendir; write sayfası zaten ilk chapter'ı bulur
    router.push(`/projects/${submission.project_id}/write`)
  }

  const isLocked = submission?.status === 'submitted' || submission?.status === 'graded'

  return (
    <div className="space-y-4">
      {/* Ödev açıklaması */}
      {assignment.description && (
        <div className="glass-card rounded-xl p-4 text-sm text-muted-foreground whitespace-pre-wrap">
          {assignment.description}
        </div>
      )}

      {/* Durum ve aksiyonlar */}
      {!submission && (
        <button
          onClick={startWriting}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-white text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
        >
          <PenLine className="w-4 h-4" />
          {loading ? 'Hazırlanıyor...' : 'Yazmaya Başla'}
        </button>
      )}

      {submission?.status === 'draft' && (
        <button
          onClick={continueWriting}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary/20 text-primary text-sm font-medium hover:bg-primary/30 transition-colors"
        >
          <PenLine className="w-4 h-4" /> Yazmaya Devam Et
        </button>
      )}

      {isLocked && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Lock className="w-4 h-4" />
          {submission.status === 'submitted' ? 'Teslim edildi — öğretmen değerlendiriyor.' : 'Değerlendirildi.'}
        </div>
      )}

      {/* Not + yorum gösterimi */}
      {submission?.status === 'graded' && (
        <div className="glass-card rounded-xl p-4 space-y-2 border-l-2 border-emerald-500/50">
          <p className="text-2xl font-display font-bold text-emerald-400">{submission.grade}<span className="text-sm text-muted-foreground font-normal">/100</span></p>
          {submission.teacher_comment && (
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">{submission.teacher_comment}</p>
          )}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 4:** Build kontrol:

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 5:** Commit:

```bash
git add components/classroom/GradePanel.tsx components/classroom/SubmissionList.tsx components/classroom/StudentAssignmentView.tsx
git commit -m "feat: add GradePanel, SubmissionList, StudentAssignmentView components"
```

---

### Task 8: TipTapEditor `editable` Prop + ChapterEditorClient Kilitleme

**Files:**
- Modify: `components/editor/TipTapEditor.tsx`
- Modify: `components/editor/ChapterEditorClient.tsx`
- Modify: `app/(app)/projects/[slug]/write/[chapterId]/page.tsx`

- [ ] **Step 1:** `components/editor/TipTapEditor.tsx` — interface ve useEditor'a `editable` ekle.

Mevcut interface'i bul (satır 28-34):
```typescript
interface Props {
  chapterId: string
  projectId: string
  initialContent: string
  chapterTitle?: string
  onWordCountChange?: (count: number) => void
}
```
Şu hale getir:
```typescript
interface Props {
  chapterId: string
  projectId: string
  initialContent: string
  chapterTitle?: string
  onWordCountChange?: (count: number) => void
  editable?: boolean
}
```

`export function TipTapEditor({` satırını bul ve `editable = true` ekle:
```typescript
export function TipTapEditor({ chapterId, projectId, initialContent, chapterTitle, onWordCountChange, editable = true }: Props) {
```

`const editor = useEditor({` bloğuna `editable` ekle (satır 152'nin hemen altına, `immediatelyRender: false,`'dan sonra):
```typescript
  const editor = useEditor({
    immediatelyRender: false,
    editable,
    extensions: [
```

- [ ] **Step 2:** `components/editor/ChapterEditorClient.tsx` — interface, Props ve JSX güncelle.

Mevcut interface'e ekle:
```typescript
interface Props {
  chapter: Chapter
  projectId: string
  currentUser: { id: string; username: string; displayName: string | null; avatarUrl: string | null }
  initialContent: string
  memberIds?: string[]
  isOwner?: boolean
  locked?: boolean
  submissionId?: string
}
```

`export function ChapterEditorClient(` satırını bul, `locked = false, submissionId` ekle:
```typescript
export function ChapterEditorClient({ chapter, projectId, currentUser, initialContent, memberIds = [], isOwner = false, locked = false, submissionId }: Props) {
```

Başlık çubuğunun `</div>` kapanışından önce (Pomodoro timer'dan önce), `locked` ve `submissionId` için UI ekle. Mevcut `<div className="flex items-center gap-1.5 sm:gap-2 shrink-0">` bloğuna, başına şunu ekle:

```typescript
          {/* Teslim Et butonu — sadece ödev yazarken gösterilir */}
          {submissionId && !locked && (
            <SubmitButton submissionId={submissionId} />
          )}
          {locked && (
            <span className="flex items-center gap-1.5 text-xs text-muted-foreground px-2 py-1 rounded-lg bg-white/[0.03] border border-white/[0.06]">
              <Lock className="w-3 h-3" /> Kilitli
            </span>
          )}
```

Import satırlarına ekle:
```typescript
import { Lightbulb, MessageSquare, X, Lock } from 'lucide-react'
import { SubmitButton } from './SubmitButton'
```

`<TipTapEditor` kullanımına `editable={!locked}` ekle:
```typescript
          <TipTapEditor
            chapterId={chapter.id}
            projectId={projectId}
            initialContent={initialContent}
            chapterTitle={chapter.title}
            onWordCountChange={setWordCount}
            editable={!locked}
          />
```

- [ ] **Step 3:** `components/editor/SubmitButton.tsx` oluştur (ChapterEditorClient içinde kullanılan client component):

```typescript
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Send } from 'lucide-react'

interface Props {
  submissionId: string
}

export function SubmitButton({ submissionId }: Props) {
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function submit() {
    if (!confirm('Teslim etmek istediğine emin misin? Teslim sonrası düzenleme kilitlenir.')) return
    setLoading(true)
    const res = await fetch(`/api/submissions/${submissionId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'submit' }),
    })
    if (res.ok) {
      router.back()
    } else {
      alert('Teslim edilemedi, tekrar dene.')
    }
    setLoading(false)
  }

  return (
    <button
      onClick={submit}
      disabled={loading}
      className="flex items-center gap-1.5 px-2 sm:px-3 py-1.5 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-medium hover:bg-emerald-500/30 transition-colors disabled:opacity-50"
    >
      <Send className="w-3.5 h-3.5" />
      <span className="hidden sm:inline">{loading ? 'Teslim ediliyor...' : 'Teslim Et'}</span>
    </button>
  )
}
```

- [ ] **Step 4:** `app/(app)/projects/[slug]/write/[chapterId]/page.tsx` — `searchParams` ve submission status okuma. Mevcut dosyayı şu hale getir:

```typescript
import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ChapterEditorClient } from '@/components/editor/ChapterEditorClient'

export const dynamic = 'force-dynamic'

interface Props {
  params: Promise<{ slug: string; chapterId: string }>
  searchParams: Promise<{ submission_id?: string }>
}

export default async function ChapterEditorPage({ params, searchParams }: Props) {
  const { slug: projectId, chapterId } = await params
  const { submission_id } = await searchParams
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const queries: [
    ReturnType<typeof supabase.from>,
    ReturnType<typeof supabase.from>,
    ReturnType<typeof supabase.from>,
    ReturnType<typeof supabase.from>,
    ReturnType<typeof supabase.from>,
  ] = [
    supabase.from('chapters').select('*').eq('id', chapterId).single() as any,
    supabase.from('profiles').select('id, username, display_name, avatar_url').eq('id', user.id).single() as any,
    supabase.from('chapter_versions').select('content').eq('chapter_id', chapterId).order('created_at', { ascending: false }).limit(1).single() as any,
    supabase.from('project_members').select('user_id').eq('project_id', projectId) as any,
    supabase.from('projects').select('owner_id').eq('id', projectId).single() as any,
  ]

  const [{ data: chapter }, { data: profile }, { data: latestVersion }, { data: members }, { data: project }] = await Promise.all(queries)

  if (!chapter) notFound()

  // Submission lock durumu
  let locked = false
  if (submission_id) {
    const { data: submission } = await supabase
      .from('assignment_submissions')
      .select('status')
      .eq('id', submission_id)
      .eq('student_id', user.id)
      .maybeSingle()
    locked = submission?.status === 'submitted' || submission?.status === 'graded'
  }

  const currentUser = {
    id: user.id,
    username: profile?.username ?? user.email?.split('@')[0] ?? 'user',
    displayName: profile?.display_name ?? null,
    avatarUrl: profile?.avatar_url ?? null,
  }

  const memberIds = (members ?? []).map((m: any) => m.user_id as string)
  const isOwner = project?.owner_id === user.id

  return (
    <ChapterEditorClient
      chapter={chapter}
      projectId={projectId}
      currentUser={currentUser}
      initialContent={latestVersion?.content ?? ''}
      memberIds={memberIds}
      isOwner={isOwner}
      locked={locked}
      submissionId={submission_id}
    />
  )
}
```

- [ ] **Step 5:** Build kontrol:

```bash
npx tsc --noEmit
```

Expected: no errors. Eğer TypeScript `Promise.all` tipinde şikayet ederse, her sorguyu `as any` ile cast et.

- [ ] **Step 6:** Commit:

```bash
git add components/editor/TipTapEditor.tsx components/editor/ChapterEditorClient.tsx components/editor/SubmitButton.tsx "app/(app)/projects/[slug]/write/[chapterId]/page.tsx"
git commit -m "feat: add locked mode and Teslim Et button to chapter editor"
```

---

### Task 9: Classroom Liste + Oluşturma + Katılma Sayfaları

**Files:**
- Create: `app/(app)/classroom/page.tsx`
- Create: `app/(app)/classroom/new/page.tsx`
- Create: `app/(app)/classroom/join/page.tsx`

- [ ] **Step 1:** `app/(app)/classroom/page.tsx` oluştur:

```typescript
import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Plus, LogIn } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { ClassroomCard } from '@/components/classroom/ClassroomCard'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export const metadata: Metadata = { title: 'Sınıflarım — Kalem Birliği' }
export const dynamic = 'force-dynamic'

export default async function ClassroomPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: memberships } = await supabase
    .from('classroom_members')
    .select('role, classroom:classrooms(*)')
    .eq('user_id', user.id)
    .order('joined_at', { ascending: false })

  const items = (memberships ?? []) as { role: string; classroom: any }[]

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-12 space-y-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold">Sınıflarım</h1>
          <p className="text-muted-foreground mt-1">Öğretmen veya öğrenci olarak katıldığın sınıflar.</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Link
            href="/classroom/join"
            className={cn(buttonVariants({ variant: 'outline' }), 'gap-1.5 text-sm')}
          >
            <LogIn className="w-4 h-4" /> Katıl
          </Link>
          <Link
            href="/classroom/new"
            className={cn(buttonVariants(), 'bg-primary hover:bg-primary/90 text-white gap-1.5 text-sm')}
          >
            <Plus className="w-4 h-4" /> Yeni Sınıf
          </Link>
        </div>
      </div>

      {items.length === 0 ? (
        <div className="glass-card rounded-2xl p-12 text-center space-y-3">
          <p className="text-muted-foreground text-sm">Henüz sınıfın yok.</p>
          <div className="flex items-center justify-center gap-3">
            <Link href="/classroom/new" className="text-primary hover:text-accent text-sm transition-colors">Sınıf oluştur</Link>
            <span className="text-muted-foreground/40">veya</span>
            <Link href="/classroom/join" className="text-primary hover:text-accent text-sm transition-colors">Koda göre katıl</Link>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {items.map(({ role, classroom }) => (
            <ClassroomCard key={classroom.id} classroom={classroom} role={role as any} />
          ))}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2:** `app/(app)/classroom/new/page.tsx` oluştur:

```typescript
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

export default function NewClassroomPage() {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (name.trim().length < 2) { setError('Sınıf adı en az 2 karakter olmalı.'); return }
    setLoading(true)
    setError('')
    const res = await fetch('/api/classroom', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: name.trim(), description: description.trim() || undefined }),
    })
    const data = await res.json()
    if (!res.ok) { setError(data.error ?? 'Bir hata oluştu.'); setLoading(false); return }
    router.push(`/classroom/${data.classroom.id}`)
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-12 space-y-8">
      <div className="flex items-center gap-3">
        <Link href="/classroom" className="text-muted-foreground hover:text-white transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <h1 className="text-2xl font-display font-bold">Yeni Sınıf</h1>
      </div>

      <form onSubmit={handleSubmit} className="glass-card rounded-2xl p-6 space-y-5">
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Sınıf Adı *</label>
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            maxLength={100}
            required
            placeholder="örn: 10-B Türkçe Yazarlık Kursu"
            className="w-full bg-white/[0.06] border border-white/[0.1] rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-medium text-muted-foreground">Açıklama (opsiyonel)</label>
          <textarea
            value={description}
            onChange={e => setDescription(e.target.value)}
            maxLength={500}
            rows={3}
            placeholder="Sınıf hakkında kısa bilgi..."
            className="w-full bg-white/[0.06] border border-white/[0.1] rounded-xl px-4 py-2.5 text-sm text-white resize-none focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>

        {error && <p className="text-sm text-red-400">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="w-full py-2.5 rounded-xl bg-primary text-white font-medium text-sm hover:bg-primary/90 transition-colors disabled:opacity-50"
        >
          {loading ? 'Oluşturuluyor...' : 'Sınıf Oluştur'}
        </button>
      </form>
    </div>
  )
}
```

- [ ] **Step 3:** `app/(app)/classroom/join/page.tsx` oluştur:

```typescript
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

export default function JoinClassroomPage() {
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = code.trim().toUpperCase()
    if (trimmed.length !== 6) { setError('Kod 6 karakter olmalı.'); return }
    setLoading(true)
    setError('')
    const res = await fetch('/api/classroom/join', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ join_code: trimmed }),
    })
    const data = await res.json()
    if (!res.ok) { setError(data.error ?? 'Sınıf bulunamadı.'); setLoading(false); return }
    router.push(`/classroom/${data.classroom_id}`)
  }

  return (
    <div className="max-w-sm mx-auto px-4 py-12 space-y-8">
      <div className="flex items-center gap-3">
        <Link href="/classroom" className="text-muted-foreground hover:text-white transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <h1 className="text-2xl font-display font-bold">Sınıfa Katıl</h1>
      </div>

      <form onSubmit={handleSubmit} className="glass-card rounded-2xl p-6 space-y-5">
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Katılım Kodu</label>
          <input
            type="text"
            value={code}
            onChange={e => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6))}
            maxLength={6}
            required
            placeholder="AX7K2M"
            className="w-full bg-white/[0.06] border border-white/[0.1] rounded-xl px-4 py-3 text-2xl font-display font-bold tracking-[0.25em] text-center text-white focus:outline-none focus:ring-1 focus:ring-primary"
          />
          <p className="text-xs text-muted-foreground text-center">Öğretmeninden aldığın 6 karakterlik kodu gir.</p>
        </div>

        {error && <p className="text-sm text-red-400 text-center">{error}</p>}

        <button
          type="submit"
          disabled={loading || code.length !== 6}
          className="w-full py-2.5 rounded-xl bg-primary text-white font-medium text-sm hover:bg-primary/90 transition-colors disabled:opacity-50"
        >
          {loading ? 'Kontrol ediliyor...' : 'Katıl'}
        </button>
      </form>
    </div>
  )
}
```

- [ ] **Step 4:** Build kontrol:

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 5:** Commit:

```bash
git add "app/(app)/classroom/page.tsx" "app/(app)/classroom/new/page.tsx" "app/(app)/classroom/join/page.tsx"
git commit -m "feat: add classroom list, create, and join pages"
```

---

### Task 10: Sınıf Paneli Sayfası

**Files:**
- Create: `app/(app)/classroom/[classroomId]/page.tsx`

- [ ] **Step 1:** `app/(app)/classroom/[classroomId]/page.tsx` oluştur:

```typescript
import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { Plus, Users, ArrowLeft } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { JoinCodeDisplay } from '@/components/classroom/JoinCodeDisplay'
import { AssignmentCard } from '@/components/classroom/AssignmentCard'
import type { ClassroomAssignment, AssignmentSubmission } from '@/types'

export const dynamic = 'force-dynamic'

export async function generateMetadata({ params }: { params: Promise<{ classroomId: string }> }): Promise<Metadata> {
  return { title: 'Sınıf — Kalem Birliği' }
}

interface Props { params: Promise<{ classroomId: string }> }

export default async function ClassroomDetailPage({ params }: Props) {
  const { classroomId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [{ data: classroom }, { data: members }, { data: assignments }] = await Promise.all([
    supabase.from('classrooms').select('*').eq('id', classroomId).single(),
    supabase.from('classroom_members').select('*, profile:profiles(id, username, display_name, avatar_url)').eq('classroom_id', classroomId),
    supabase.from('classroom_assignments').select('*').eq('classroom_id', classroomId).order('created_at', { ascending: false }),
  ])

  if (!classroom) notFound()

  const myMembership = (members ?? []).find((m: any) => m.user_id === user.id)
  if (!myMembership) notFound()

  const isTeacher = myMembership.role === 'teacher'

  // Öğrenci ise kendi submission'larını çek
  let mySubmissions: AssignmentSubmission[] = []
  if (!isTeacher && assignments && assignments.length > 0) {
    const { data: subs } = await supabase
      .from('assignment_submissions')
      .select('*')
      .eq('student_id', user.id)
      .in('assignment_id', assignments.map((a: any) => a.id))
    mySubmissions = (subs ?? []) as AssignmentSubmission[]
  }

  const submissionMap = new Map(mySubmissions.map(s => [s.assignment_id, s]))
  const memberList = (members ?? []) as any[]

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-12 space-y-10">
      {/* Header */}
      <div className="space-y-1">
        <Link href="/classroom" className="flex items-center gap-1.5 text-muted-foreground hover:text-white transition-colors text-sm mb-3">
          <ArrowLeft className="w-4 h-4" /> Sınıflarım
        </Link>
        <h1 className="text-3xl font-display font-bold">{classroom.name}</h1>
        {classroom.description && <p className="text-muted-foreground">{classroom.description}</p>}
      </div>

      {/* Öğretmen: join kodu */}
      {isTeacher && <JoinCodeDisplay code={classroom.join_code} />}

      {/* Ödevler */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-display font-semibold">Ödevler</h2>
          {isTeacher && (
            <Link
              href={`/classroom/${classroomId}/assignments/new`}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary/20 text-primary hover:bg-primary/30 text-xs font-medium transition-colors"
            >
              <Plus className="w-3.5 h-3.5" /> Yeni Ödev
            </Link>
          )}
        </div>
        {!assignments || assignments.length === 0 ? (
          <p className="text-sm text-muted-foreground">Henüz ödev yok.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {(assignments as ClassroomAssignment[]).map(a => (
              <AssignmentCard
                key={a.id}
                assignment={a}
                classroomId={classroomId}
                submission={isTeacher ? undefined : (submissionMap.get(a.id) ?? null)}
                isTeacher={isTeacher}
              />
            ))}
          </div>
        )}
      </section>

      {/* Üyeler */}
      <section className="space-y-4">
        <h2 className="flex items-center gap-2 text-lg font-display font-semibold">
          <Users className="w-5 h-5 text-sky-400" /> Üyeler ({memberList.length})
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {memberList.map((m: any) => (
            <div key={m.user_id} className="glass-card rounded-xl p-3 flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold text-primary shrink-0">
                {m.profile?.display_name?.[0] ?? m.profile?.username?.[0] ?? '?'}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-medium truncate">{m.profile?.display_name ?? m.profile?.username}</p>
                <p className="text-[10px] text-muted-foreground">{m.role === 'teacher' ? 'Öğretmen' : 'Öğrenci'}</p>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
```

- [ ] **Step 2:** Build kontrol:

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3:** Commit:

```bash
git add "app/(app)/classroom/[classroomId]/page.tsx"
git commit -m "feat: add classroom detail page (teacher/student dual view)"
```

---

### Task 11: Ödev Oluşturma + Ödev Detay Sayfaları

**Files:**
- Create: `app/(app)/classroom/[classroomId]/assignments/new/page.tsx`
- Create: `app/(app)/classroom/[classroomId]/assignments/[assignmentId]/page.tsx`

- [ ] **Step 1:** `app/(app)/classroom/[classroomId]/assignments/new/page.tsx` oluştur:

```typescript
'use client'

import { useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

export default function NewAssignmentPage() {
  const params = useParams<{ classroomId: string }>()
  const classroomId = params.classroomId
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [visibility, setVisibility] = useState<'private' | 'class_visible'>('private')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (title.trim().length < 3) { setError('Başlık en az 3 karakter olmalı.'); return }
    setLoading(true)
    setError('')
    const res = await fetch(`/api/classroom/${classroomId}/assignments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: title.trim(),
        description: description.trim() || undefined,
        due_date: dueDate || undefined,
        visibility,
      }),
    })
    const data = await res.json()
    if (!res.ok) { setError(data.error ?? 'Bir hata oluştu.'); setLoading(false); return }
    router.push(`/classroom/${classroomId}/assignments/${data.assignment.id}`)
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-12 space-y-8">
      <div className="flex items-center gap-3">
        <Link href={`/classroom/${classroomId}`} className="text-muted-foreground hover:text-white transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <h1 className="text-2xl font-display font-bold">Yeni Ödev</h1>
      </div>

      <form onSubmit={handleSubmit} className="glass-card rounded-2xl p-6 space-y-5">
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Başlık *</label>
          <input
            type="text"
            value={title}
            onChange={e => setTitle(e.target.value)}
            maxLength={200}
            required
            placeholder="örn: Sonbahar temalı kısa hikaye"
            className="w-full bg-white/[0.06] border border-white/[0.1] rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-medium text-muted-foreground">Açıklama / Yönerge (opsiyonel)</label>
          <textarea
            value={description}
            onChange={e => setDescription(e.target.value)}
            maxLength={2000}
            rows={4}
            placeholder="Yazı için ipuçları, kısıtlamalar, beklentiler..."
            className="w-full bg-white/[0.06] border border-white/[0.1] rounded-xl px-4 py-2.5 text-sm text-white resize-none focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-medium text-muted-foreground">Son Teslim Tarihi (opsiyonel)</label>
          <input
            type="datetime-local"
            value={dueDate}
            onChange={e => setDueDate(e.target.value)}
            className="w-full bg-white/[0.06] border border-white/[0.1] rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-medium text-muted-foreground">Görünürlük</label>
          <div className="flex gap-3">
            {[
              { value: 'private', label: 'Gizli', desc: 'Sadece öğretmen görür' },
              { value: 'class_visible', label: 'Sınıfa Açık', desc: 'Herkes birbirinin yazısını görebilir' },
            ].map(opt => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setVisibility(opt.value as any)}
                className={`flex-1 p-3 rounded-xl border text-left transition-colors text-xs ${
                  visibility === opt.value
                    ? 'border-primary bg-primary/10 text-white'
                    : 'border-white/[0.08] text-muted-foreground hover:border-white/[0.15]'
                }`}
              >
                <p className="font-medium">{opt.label}</p>
                <p className="mt-0.5 opacity-70">{opt.desc}</p>
              </button>
            ))}
          </div>
        </div>

        {error && <p className="text-sm text-red-400">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="w-full py-2.5 rounded-xl bg-primary text-white font-medium text-sm hover:bg-primary/90 transition-colors disabled:opacity-50"
        >
          {loading ? 'Oluşturuluyor...' : 'Ödev Oluştur'}
        </button>
      </form>
    </div>
  )
}
```

- [ ] **Step 2:** `app/(app)/classroom/[classroomId]/assignments/[assignmentId]/page.tsx` oluştur:

```typescript
import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { ArrowLeft, Clock } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { SubmissionList } from '@/components/classroom/SubmissionList'
import { StudentAssignmentView } from '@/components/classroom/StudentAssignmentView'
import type { AssignmentSubmission } from '@/types'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'Ödev — Kalem Birliği' }

interface Props { params: Promise<{ classroomId: string; assignmentId: string }> }

export default async function AssignmentPage({ params }: Props) {
  const { classroomId, assignmentId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: membership } = await supabase
    .from('classroom_members')
    .select('role')
    .eq('classroom_id', classroomId)
    .eq('user_id', user.id)
    .single()

  if (!membership) notFound()

  const isTeacher = membership.role === 'teacher'

  const { data: assignment } = await supabase
    .from('classroom_assignments')
    .select('*')
    .eq('id', assignmentId)
    .single()

  if (!assignment) notFound()

  let submissions: AssignmentSubmission[] = []
  let mySubmission: AssignmentSubmission | null = null

  if (isTeacher) {
    const { data } = await supabase
      .from('assignment_submissions')
      .select('*, student:profiles(id, username, display_name, avatar_url)')
      .eq('assignment_id', assignmentId)
      .order('submitted_at', { ascending: false })
    submissions = (data ?? []) as AssignmentSubmission[]
  } else {
    const { data } = await supabase
      .from('assignment_submissions')
      .select('*')
      .eq('assignment_id', assignmentId)
      .eq('student_id', user.id)
      .maybeSingle()
    mySubmission = (data ?? null) as AssignmentSubmission | null
  }

  const isPast = assignment.due_date ? new Date(assignment.due_date) < new Date() : false

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-12 space-y-8">
      <div className="space-y-1">
        <Link href={`/classroom/${classroomId}`} className="flex items-center gap-1.5 text-muted-foreground hover:text-white transition-colors text-sm mb-3">
          <ArrowLeft className="w-4 h-4" /> Sınıfa Dön
        </Link>
        <h1 className="text-2xl font-display font-bold">{assignment.title}</h1>
        {assignment.due_date && (
          <p className={`text-sm flex items-center gap-1.5 ${isPast ? 'text-red-400' : 'text-muted-foreground'}`}>
            <Clock className="w-4 h-4" />
            Son Tarih: {new Date(assignment.due_date).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
          </p>
        )}
      </div>

      {isTeacher ? (
        <section className="space-y-4">
          <h2 className="text-lg font-display font-semibold">
            Teslimler ({submissions.length})
          </h2>
          <SubmissionList initialSubmissions={submissions} classroomId={classroomId} />
        </section>
      ) : (
        <StudentAssignmentView
          assignment={assignment}
          classroomId={classroomId}
          initialSubmission={mySubmission}
        />
      )}
    </div>
  )
}
```

- [ ] **Step 3:** Build kontrol:

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4:** Commit:

```bash
git add "app/(app)/classroom/[classroomId]/assignments/new/page.tsx" "app/(app)/classroom/[classroomId]/assignments/[assignmentId]/page.tsx"
git commit -m "feat: add assignment create and detail pages (teacher/student dual view)"
```

---

### Task 12: Navbar "Sınıfım" Linki + CLAUDE.md

**Files:**
- Modify: `components/shared/Navbar.tsx`
- Modify: `CLAUDE.md`

- [ ] **Step 1:** `components/shared/Navbar.tsx` dosyasını aç. `import` satırlarında `BookOpen` veya kullanılmayan bir ikonu `GraduationCap` ile değiştir ya da ekle:

```typescript
import {
  LogOut, User, Bell, LayoutDashboard,
  Compass, Users, Lightbulb, Wand2, Gamepad2, Menu, X, ChevronRight,
  MessageSquarePlus, ShieldCheck, GraduationCap
} from 'lucide-react'
```

Fikir Odası linkinin hemen altına "Sınıfım" linkini ekle (her iki nav bölümüne — desktop dropdown ve mobile bottom sheet):

Desktop dropdown'da (`/fikir-odasi` DropdownMenuItem'ından sonra):
```tsx
<DropdownMenuItem className="rounded-xl px-3 py-2 cursor-pointer hover:bg-white/[0.03]">
  <Link href="/classroom" className="flex w-full items-center gap-2.5 text-[13px] text-muted-foreground hover:text-white font-medium">
    <GraduationCap className="w-4 h-4 text-sky-400" /> Sınıfım
  </Link>
</DropdownMenuItem>
```

Mobile sheet'te de (`/fikir-odasi` linkinin yanındaki dizide):
```typescript
{ href: '/classroom', label: 'Sınıfım', icon: <GraduationCap className="w-4 h-4 text-sky-400" /> },
```

- [ ] **Step 2:** Build kontrol:

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3:** `CLAUDE.md` içinde `## Dosya Yapısı — Kritik Dosyalar` bölümündeki `components/home/` bloğundan sonra ekle:

```
app/(app)/classroom/
  page.tsx                          # Sınıf listesi (öğretmen + öğrenci)
  new/page.tsx                      # Öğretmen: sınıf oluştur
  join/page.tsx                     # Öğrenci: katılım kodu giriş
  [classroomId]/
    page.tsx                        # Sınıf paneli (öğretmen: üyeler+kod / öğrenci: ödevler+notlar)
    assignments/
      new/page.tsx                  # Öğretmen: ödev oluştur
      [assignmentId]/page.tsx       # Ödev detayı (öğretmen: teslimler+notlama / öğrenci: yaz+teslim)
app/api/classroom/
  route.ts                          # GET list / POST create
  join/route.ts                     # POST join_classroom_by_code RPC
  [classroomId]/route.ts            # GET detail+members / DELETE
  [classroomId]/assignments/route.ts                           # GET / POST
  [classroomId]/assignments/[assignmentId]/route.ts            # GET / PATCH
  [classroomId]/assignments/[assignmentId]/start/route.ts      # POST: proje+submission başlat
app/api/submissions/[submissionId]/route.ts   # PATCH: submit | grade | reopen
components/classroom/
  ClassroomCard.tsx                 # Sınıf kartı
  AssignmentCard.tsx                # Ödev kartı (teslim durumu + not)
  JoinCodeDisplay.tsx               # 6 haneli kod + kopyala
  GradePanel.tsx                    # Öğretmen: not + yorum formu (client)
  SubmissionList.tsx                # Öğretmen: accordion teslim listesi (client)
  StudentAssignmentView.tsx         # Öğrenci: başla/teslim et/not görüntüle (client)
components/editor/
  SubmitButton.tsx                  # Editörde Teslim Et butonu (client)
```

`## Platform Faz Yol Haritası` tablosundaki Faz 3 satırını güncelle:
```
| **Faz 3** | Okul Modülü | ✅ Tamamlandı | Sınıf yönetimi, join kodu, ödev sistemi, not+yorum, editör kilitleme |
```

`## Henüz Uygulanmamış / Bekleyen` bölümüne Faz 3 Supabase tabloları ekle:
```
- **Faz 3 tabloları:** `classrooms`, `classroom_members`, `classroom_assignments`, `assignment_submissions` + `join_classroom_by_code` SECURITY DEFINER function
```

- [ ] **Step 4:** Commit:

```bash
git add components/shared/Navbar.tsx CLAUDE.md
git commit -m "docs: add classroom nav link and update CLAUDE.md with Phase 3"
```

---

## Özet: Bağımlılık Sırası

```
Task 1 (Schema)
  └── Task 2 (Types)
        ├── Task 3 (Classroom API)
        ├── Task 4 (Assignment API)
        ├── Task 5 (Submission API) ← Task 3'e bağlı
        ├── Task 6 (ClassroomCard, AssignmentCard, JoinCodeDisplay)
        ├── Task 7 (GradePanel, SubmissionList, StudentAssignmentView) ← Task 5+6'ya bağlı
        ├── Task 8 (Editor kilitleme) ← Task 5'e bağlı
        ├── Task 9 (Liste, Yeni, Katıl sayfaları) ← Task 3+6'ya bağlı
        ├── Task 10 (Sınıf Paneli) ← Task 6+9'a bağlı
        ├── Task 11 (Ödev sayfaları) ← Task 4+5+7'ye bağlı
        └── Task 12 (Navbar + CLAUDE.md) ← Son
```

Tasks 3, 4, 6 paralel çalışabilir. Tasks 5, 7, 8 paralel çalışabilir (Task 3'ten sonra). Tasks 9-11 paralel çalışabilir (Task 5+6+7'den sonra).
