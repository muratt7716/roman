# Faz 3 — Okul Modülü Tasarım Dokümanı

## Genel Bakış

**Amaç:** Kalem Birliği'ni ortaokul/lise yazarlık kurslarında kullanılabilir hale getirmek — öğretmen sınıf yönetir, görev atar, not verir; öğrenci join koduyla katılır, mevcut TipTap editörüyle yazar, teslim eder.

**Stack:** Next.js 16 App Router · Supabase (PostgreSQL + RLS) · TypeScript · Tailwind v4 · shadcn/ui

---

## Mimari Yaklaşım

Sınıf sistemi mevcut `projects` tablosundan **tamamen bağımsız** yeni tablolar olarak modellenir. Öğrenci teslimi ise mevcut `projects` kaydına FK ile bağlanır — böylece TipTap editörü, versiyon geçmişi ve yorum paneli sıfır değişiklikle çalışır.

---

## Özellikler

### 1. Sınıf Yönetimi (Öğretmen)

- Öğretmen sınıf oluşturur: isim + opsiyonel açıklama
- Sunucu 6 karakterlik benzersiz `join_code` üretir (büyük harf + rakam, örn: `AX7K2M`)
- Sınıf panelinde: üye listesi, ödev listesi, join kodu görünür
- Öğretmen üye çıkarabilir, sınıfı silebilir

### 2. Sınıfa Katılma (Öğrenci)

- `/classroom/join` sayfasında 6 karakterlik kod girilir
- Kod doğrulanır → `classroom_members` INSERT (`role='student'`)
- Aynı koda iki kez katılma engellenir (UNIQUE constraint)
- Geçersiz kod → "Sınıf bulunamadı" hatası

### 3. Ödev Sistemi

Öğretmen her ödev için şunları belirler:
- **Başlık** ve **açıklama** (yazı konusu/yönlendirmesi)
- **Son teslim tarihi** (opsiyonel)
- **Görünürlük:** `private` (sadece öğretmen görür) veya `class_visible` (tüm sınıf görebilir)

### 4. Öğrenci Yazma & Teslim Akışı

1. Öğrenci ödevi görür → "Yazmaya Başla" → `/api/classroom/.../start` POST → sunucu `projects` INSERT (ödev adıyla, `visibility='closed'`) + `assignment_submissions` INSERT (`status='draft'`) → `projects/[id]/write?submission_id=...` editörüne yönlendirir
2. Öğrenci istediği zaman editörden çıkıp geri döner, yazısı kayıtlı
3. Editörde "Teslim Et" butonu (sadece `submission_id` query param varsa gösterilir) → `status='submitted'`, `submitted_at` set, TipTap `editable=false` olarak kilitleniyor
4. Öğretmen "Revize Et" → `status='draft'`'a döner, editör tekrar açılır

**Editör değişikliği:** `ChapterEditorClient` mevcut dosyasına `locked?: boolean` prop eklenir. `locked=true` ise TipTap `editable={false}` ve toolbar gizlenir. `submission_id` query param'ı page.tsx'ten `ChapterEditorClient`'a geçirilir.

### 5. Notlandırma

- Öğretmen ödev sayfasında tüm teslimleri listeler
- Her teslim için: projeyi görüntüle + 0–100 arası not + yorum
- Kaydet → `status='graded'`, `graded_at` set
- Öğrenci sınıf panelinde notunu ve yorumu görür

### 6. Görünürlük Kuralı

| `visibility` | Öğrenci A kendi yazısını görür | Öğrenci A başkasının yazısını görür | Öğretmen |
|---|---|---|---|
| `private` | ✅ | ❌ | ✅ |
| `class_visible` | ✅ | ✅ (sadece okuma) | ✅ |

---

## Veri Modeli

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

CREATE INDEX IF NOT EXISTS idx_classrooms_owner ON classrooms(owner_id);
CREATE INDEX IF NOT EXISTS idx_classrooms_join_code ON classrooms(join_code);

-- ============================================================
-- CLASSROOM MEMBERS
-- ============================================================

CREATE TABLE IF NOT EXISTS classroom_members (
  classroom_id uuid NOT NULL REFERENCES classrooms(id) ON DELETE CASCADE,
  user_id      uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role         text NOT NULL CHECK (role IN ('teacher','student')),
  joined_at    timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (classroom_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_classroom_members_user ON classroom_members(user_id);

-- ============================================================
-- CLASSROOM ASSIGNMENTS
-- ============================================================

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

-- ============================================================
-- ASSIGNMENT SUBMISSIONS
-- ============================================================

CREATE TABLE IF NOT EXISTS assignment_submissions (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id uuid NOT NULL REFERENCES classroom_assignments(id) ON DELETE CASCADE,
  student_id    uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  project_id    uuid REFERENCES projects(id) ON DELETE SET NULL,
  status        text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','submitted','graded')),
  grade         int CHECK (grade BETWEEN 0 AND 100),
  teacher_comment text CHECK (char_length(teacher_comment) <= 1000),
  submitted_at  timestamptz,
  graded_at     timestamptz,
  UNIQUE (assignment_id, student_id)
);

CREATE INDEX IF NOT EXISTS idx_submissions_assignment ON assignment_submissions(assignment_id);
CREATE INDEX IF NOT EXISTS idx_submissions_student ON assignment_submissions(student_id);
```

---

## RLS Politikaları

```sql
-- join_classroom_by_code: SECURITY DEFINER — join flow için RLS bypass
-- API route bu fonksiyonu çağırır; doğrudan SELECT yerine güvenli lookup sağlar
CREATE OR REPLACE FUNCTION join_classroom_by_code(p_code text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_classroom classrooms%ROWTYPE;
  v_user_id uuid := auth.uid();
BEGIN
  IF v_user_id IS NULL THEN
    RETURN json_build_object('error', 'Giriş yapman gerekiyor.');
  END IF;

  SELECT * INTO v_classroom FROM classrooms WHERE join_code = upper(p_code);

  IF NOT FOUND THEN
    RETURN json_build_object('error', 'Sınıf bulunamadı.');
  END IF;

  -- Zaten üye mi?
  IF EXISTS (SELECT 1 FROM classroom_members WHERE classroom_id = v_classroom.id AND user_id = v_user_id) THEN
    RETURN json_build_object('classroom_id', v_classroom.id, 'already_member', true);
  END IF;

  INSERT INTO classroom_members (classroom_id, user_id, role)
  VALUES (v_classroom.id, v_user_id, 'student');

  RETURN json_build_object('classroom_id', v_classroom.id, 'already_member', false);
END;
$$;

-- classrooms: sadece üyeler ve owner görebilir
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

-- classroom_members: kendi satırını + aynı sınıftaki diğer üyeleri görebilir
-- (Self-referential join yerine owner check ile basitleştirildi — sonsuz döngü riski yok)
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

-- classroom_assignments
ALTER TABLE classroom_assignments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "assignments_select_member" ON classroom_assignments;
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

-- assignment_submissions
ALTER TABLE assignment_submissions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "submissions_select_own_or_teacher"  ON assignment_submissions;
DROP POLICY IF EXISTS "submissions_select_class_visible"   ON assignment_submissions;
DROP POLICY IF EXISTS "submissions_insert_student"         ON assignment_submissions;
DROP POLICY IF EXISTS "submissions_update_student_draft"   ON assignment_submissions;
DROP POLICY IF EXISTS "submissions_update_teacher_grade"   ON assignment_submissions;

-- Öğrenci kendi teslimini, öğretmen tüm teslimleri görür
CREATE POLICY "submissions_select_own_or_teacher" ON assignment_submissions FOR SELECT USING (
  student_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM classroom_assignments ca
    JOIN classrooms c ON c.id = ca.classroom_id
    WHERE ca.id = assignment_id AND c.owner_id = auth.uid()
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
CREATE POLICY "submissions_insert_student" ON assignment_submissions FOR INSERT WITH CHECK (
  auth.uid() = student_id
);
-- Öğrenci sadece kendi draft teslimini güncelleyebilir
CREATE POLICY "submissions_update_student_draft" ON assignment_submissions FOR UPDATE USING (
  student_id = auth.uid() AND status = 'draft'
) WITH CHECK (grade IS NULL AND teacher_comment IS NULL);
-- Öğretmen not + yorum + status güncelleyebilir
CREATE POLICY "submissions_update_teacher_grade" ON assignment_submissions FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM classroom_assignments ca
    JOIN classrooms c ON c.id = ca.classroom_id
    WHERE ca.id = assignment_id AND c.owner_id = auth.uid()
  )
);
```

---

## API Rotaları

```
app/api/classroom/
  route.ts                          # GET: kullanıcının sınıfları | POST: sınıf oluştur
  join/route.ts                     # POST { join_code } → join_classroom_by_code() RPC çağırır
  [classroomId]/
    route.ts                        # GET: sınıf detayı + üyeler | DELETE: sınıfı sil
    assignments/
      route.ts                      # GET: ödev listesi | POST: ödev oluştur
      [assignmentId]/
        route.ts                    # GET: ödev + teslimler | PATCH: ödev güncelle
        submit/route.ts             # POST: teslim et (status→submitted)
        grade/route.ts              # POST { submission_id, grade, comment } → notla
        start/route.ts              # POST: proje oluştur + submission kaydı başlat
```

---

## Sayfa Yapısı

```
app/(app)/classroom/
  page.tsx                          # Liste: öğretmen sınıfları + öğrenci sınıfları
  new/page.tsx                      # Öğretmen: sınıf oluştur
  join/page.tsx                     # Öğrenci: kod giriş ekranı

  [classroomId]/
    page.tsx                        # Öğretmen: panel (üyeler + ödevler + kod)
                                    # Öğrenci: ödev listesi + notlar
    assignments/
      new/page.tsx                  # Öğretmen: ödev oluştur
      [assignmentId]/
        page.tsx                    # Öğretmen: tüm teslimler + not girişi
                                    # Öğrenci: ödev detayı + başla/teslim et
```

---

## Bileşenler

```
components/classroom/
  ClassroomCard.tsx                 # Sınıf kartı (isim, üye sayısı, ödev sayısı)
  AssignmentCard.tsx                # Ödev kartı (başlık, son tarih, teslim durumu, not)
  JoinCodeDisplay.tsx               # Büyük font kod + kopyala butonu (öğretmen için)
  SubmissionList.tsx                # Öğretmen: tüm öğrenci teslimlerini listeler
  GradePanel.tsx                    # Öğretmen: not + yorum formu (client)
  StudentAssignmentView.tsx         # Öğrenci: ödev detayı + başla/teslim et/revize
```

---

## Kapsam Dışı (Bu Fazda Değil)

- Veli/ebeveyn paneli — Faz 4'e bırakıldı
- İçerik moderasyonu / filtresi — Faz 4
- Öğrenci performans raporları (tüm dönem istatistik) — Faz 4
- Akran değerlendirmesi (öğrenciden öğrenciye yorum) — Faz 4
- Toplu öğrenci ekleme (CSV import) — Faz 4
- Sınıf şablonları — Faz 4

---

## DB Özeti — Yeni Tablolar

| Tablo | Amaç |
|-------|------|
| `classrooms` | Sınıf kaydı + join_code |
| `classroom_members` | Öğretmen/öğrenci üyelik |
| `classroom_assignments` | Ödev tanımları |
| `assignment_submissions` | Öğrenci teslimleri + not/yorum |
