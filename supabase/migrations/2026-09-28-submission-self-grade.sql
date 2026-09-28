-- ============================================================
-- Öğrenci kendine not verebiliyordu — 28 Eyl 2026
-- Supabase Dashboard > SQL Editor'da BU DOSYAYI çalıştır.
-- ============================================================
--
-- Canlıda kanıtlandı: öğrenci kendi oturumuyla
--   update assignment_submissions set status='graded', grade=100,
--          teacher_comment='Harika!' where id = <kendi teslimi>
-- çalıştırabiliyordu.
--
-- Sebep, Postgres'in RLS kuralı: aynı tablo için birden çok UPDATE politikası
-- varsa, yeni satır HERHANGİ birinin WITH CHECK'inden geçerse kabul edilir —
-- USING ile WITH CHECK politika bazında eşleşmez. Öğrencinin satırı kendi
-- politikasının USING'inden geçiyor, yeni hali ise öğretmen politikasının
-- WITH CHECK'inden (status IN ('submitted','graded')) geçiyordu.
--
-- Çözüm: her WITH CHECK, kimin için olduğunu da söylesin.
-- Yan kazanç: öğretmenin "yeniden aç" (status → draft) işlemi notlanmış
-- teslimlerde engelleniyordu; öğretmen kontrolüne 'draft' eklendi.

DROP POLICY IF EXISTS "submissions_update_student_draft" ON assignment_submissions;
CREATE POLICY "submissions_update_student_draft" ON assignment_submissions FOR UPDATE USING (
  student_id = auth.uid() AND status = 'draft'
) WITH CHECK (
  student_id = auth.uid()
  AND grade IS NULL
  AND teacher_comment IS NULL
  AND status IN ('draft', 'submitted')
);

DROP POLICY IF EXISTS "submissions_update_teacher_grade" ON assignment_submissions;
CREATE POLICY "submissions_update_teacher_grade" ON assignment_submissions FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM classroom_assignments ca
    JOIN classrooms c ON c.id = ca.classroom_id
    WHERE ca.id = assignment_submissions.assignment_id AND c.owner_id = auth.uid()
  )
) WITH CHECK (
  EXISTS (
    SELECT 1 FROM classroom_assignments ca
    JOIN classrooms c ON c.id = ca.classroom_id
    WHERE ca.id = assignment_submissions.assignment_id AND c.owner_id = auth.uid()
  )
  AND status IN ('draft', 'submitted', 'graded')
);

-- Öğrencinin kendine verdiği sahte notlar var mı? (0 satır beklenir)
-- Not verilmiş ama graded_at boş olanlar, API dışından notlanmış demektir.
SELECT s.id, s.status, s.grade, s.teacher_comment, s.graded_at
FROM assignment_submissions s
WHERE s.status = 'graded' AND (s.graded_at IS NULL OR s.grade IS NULL);
