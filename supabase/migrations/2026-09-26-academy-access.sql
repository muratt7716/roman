-- ============================================================
-- Akademi erişim açıkları — 26 Eyl 2026
-- Supabase Dashboard > SQL Editor'da BU DOSYAYI çalıştır.
-- Hepsi canlıda gerçek oturumlarla test edilerek bulundu.
-- ============================================================

-- 1) Şifresiz sınıfa katılma
--    cls_members_insert politikası `role = 'student'` dalıyla herkesin
--    kendini İSTEDİĞİ sınıfa öğrenci olarak eklemesine izin veriyordu:
--      supabase.from('classroom_members').insert({ classroom_id, user_id: me, role: 'student' })
--    → şifre sorulmadan içeride; ödev listesi ve sınıfa açık teslimler görünür.
--    Meşru katılım yalnızca join_classroom_by_password (SECURITY DEFINER,
--    RLS'i baypas eder) üzerinden olur, dolayısıyla bu dal gereksiz.
DROP POLICY IF EXISTS "cls_members_insert" ON classroom_members;
CREATE POLICY "cls_members_insert" ON classroom_members FOR INSERT WITH CHECK (
  auth.uid() = user_id
  AND role IN ('teacher', 'parent')
  AND auth_is_classroom_owner(classroom_id)
);

-- 2) Eski koddan katılma — şifreyi atlıyor
--    Uygulama artık şifreyle katılıyor ama bu fonksiyon hâlâ çağrılabiliyordu;
--    öğretmen sayfasında görünen 6 haneli kodu bilen şifresiz girerdi.
DO $$ BEGIN
  REVOKE EXECUTE ON FUNCTION join_classroom_by_code(text) FROM PUBLIC, anon, authenticated;
EXCEPTION WHEN undefined_function THEN NULL; END $$;

-- 3) Öğrenci kendi teslimini "notlandı" yapabiliyordu
--    WITH CHECK yalnızca grade/teacher_comment'e bakıyordu; status serbestti.
DROP POLICY IF EXISTS "submissions_update_student_draft" ON assignment_submissions;
CREATE POLICY "submissions_update_student_draft" ON assignment_submissions FOR UPDATE USING (
  student_id = auth.uid() AND status = 'draft'
) WITH CHECK (
  grade IS NULL AND teacher_comment IS NULL AND status IN ('draft', 'submitted')
);

-- 4) Teslim satırını kim okur
--    a) Veli dalındaki isim çakışması: `cm.student_id = student_id` —
--       nitelenmemiş student_id classroom_members.student_id'ye çözülür, kolon
--       kendisiyle karşılaştırılır; veli sınıftaki TÜM teslimleri görür. (Veli
--       ekleme arayüzü şu an yok, ama geri gelirse çocuk verisi sızar.)
--    b) "Sınıfa açık" dalı kaldırıldı: satırın TAMAMINI döndürüyordu, yani
--       sınıf arkadaşı API'den doğrudan grade ve teacher_comment okuyabiliyordu.
--       Akran okuma artık yalnızca ad döndüren get_peer_submissions RPC'siyle.
DROP POLICY IF EXISTS "submissions_select_own_or_teacher" ON assignment_submissions;
CREATE POLICY "submissions_select_own_or_teacher" ON assignment_submissions FOR SELECT USING (
  assignment_submissions.student_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM classroom_assignments ca
    JOIN classrooms c ON c.id = ca.classroom_id
    WHERE ca.id = assignment_submissions.assignment_id AND c.owner_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM classroom_members cm
    JOIN classroom_assignments ca ON ca.classroom_id = cm.classroom_id
    WHERE ca.id = assignment_submissions.assignment_id
      AND cm.user_id = auth.uid()
      AND cm.role = 'parent'
      AND cm.student_id = assignment_submissions.student_id
  )
);

-- 5) Akran okuma — tek kural, iki fonksiyon
--    Koşul: ödev sınıfa açık + son tarih geçmiş + teslim edilmiş + çağıran o
--    sınıfın üyesi. Uygulamadaki review sayfası da aynı koşulu kullanır.
CREATE OR REPLACE FUNCTION can_peer_read(p_submission_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1
    FROM assignment_submissions s
    JOIN classroom_assignments ca ON ca.id = s.assignment_id
    JOIN classroom_members cm ON cm.classroom_id = ca.classroom_id AND cm.user_id = auth.uid()
    WHERE s.id = p_submission_id
      AND ca.visibility = 'class_visible'
      AND ca.due_date IS NOT NULL AND ca.due_date < now()
      AND s.status IN ('submitted', 'graded')
  );
$$;

-- Akran listesi: yalnızca teslim kimliği ve ad — not/yorum asla
CREATE OR REPLACE FUNCTION get_peer_submissions(p_assignment_id uuid)
RETURNS TABLE(submission_id uuid, student_name text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT s.id, COALESCE(p.display_name, p.username)
  FROM assignment_submissions s
  JOIN profiles p ON p.id = s.student_id
  WHERE s.assignment_id = p_assignment_id
    AND s.student_id <> auth.uid()
    AND can_peer_read(s.id)
  ORDER BY s.submitted_at;
$$;

-- Metin: öğrencinin kendisi, öğretmen ya da (kurala uyan) sınıf arkadaşı
CREATE OR REPLACE FUNCTION get_submission_review_content(p_submission_id uuid)
RETURNS TABLE(chapter_id uuid, chapter_title text, order_index int, content text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_project_id uuid;
  v_student_id uuid;
  v_owner_id   uuid;
BEGIN
  SELECT s.project_id, s.student_id, c.owner_id
    INTO v_project_id, v_student_id, v_owner_id
  FROM assignment_submissions s
  JOIN classroom_assignments ca ON ca.id = s.assignment_id
  JOIN classrooms c ON c.id = ca.classroom_id
  WHERE s.id = p_submission_id;

  IF v_project_id IS NULL THEN RETURN; END IF;
  IF auth.uid() IS DISTINCT FROM v_student_id
     AND auth.uid() IS DISTINCT FROM v_owner_id
     AND NOT can_peer_read(p_submission_id) THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT ch.id, ch.title, ch.order_index,
         (SELECT cv.content FROM chapter_versions cv
           WHERE cv.chapter_id = ch.id
           ORDER BY cv.created_at DESC LIMIT 1)
  FROM chapters ch
  WHERE ch.project_id = v_project_id
  ORDER BY ch.order_index;
END;
$$;

-- 7) Sınıf dergisi metinleri
--    Okuyucu sayfası öğrenci bölümlerini doğrudan sorguluyordu; öğrenci
--    projeleri özel olduğu için dergi, derginin yazarı dışında herkese
--    "İçerik bulunamadı" gösteriyordu. Erişim kuralı magazines_select ile aynı:
--    yayımlanmış dergi herkese, taslak yalnızca sınıfa. İsim DÖNDÜRÜLMEZ —
--    okuyucu öğretmenin seçtiği magazine_entries.display_name'i gösterir.
CREATE OR REPLACE FUNCTION get_magazine_content(p_magazine_id uuid)
RETURNS TABLE(entry_id uuid, assignment_title text, content text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT e.id, ca.title,
         (SELECT cv.content FROM chapters ch
            JOIN chapter_versions cv ON cv.chapter_id = ch.id
           WHERE ch.project_id = s.project_id
           ORDER BY ch.order_index, cv.created_at DESC LIMIT 1)
  FROM class_magazines m
  JOIN magazine_sections sec ON sec.magazine_id = m.id
  JOIN magazine_entries e ON e.section_id = sec.id
  JOIN assignment_submissions s ON s.id = e.submission_id
  JOIN classroom_assignments ca ON ca.id = s.assignment_id
  WHERE m.id = p_magazine_id
    AND (
      m.status = 'published'
      OR EXISTS (SELECT 1 FROM classrooms c WHERE c.id = m.classroom_id AND c.owner_id = auth.uid())
      OR EXISTS (SELECT 1 FROM classroom_members cm WHERE cm.classroom_id = m.classroom_id AND cm.user_id = auth.uid())
    );
$$;

REVOKE EXECUTE ON FUNCTION can_peer_read(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION get_peer_submissions(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION can_peer_read(uuid), get_peer_submissions(uuid) TO authenticated;

-- 6) Mevcut ödev projelerini özel yap — 'closed' herkese açık sayılıyordu
--    (giriş yapmamış ziyaretçi /projects/odev-... sayfasını açabiliyordu).
UPDATE projects p SET visibility = 'draft'
WHERE visibility = 'closed'
  AND EXISTS (SELECT 1 FROM assignment_submissions s WHERE s.project_id = p.id);

NOTIFY pgrst, 'reload schema';

-- Doğrulama — 3 satır dönmeli
SELECT polname, pg_get_expr(polqual, polrelid) AS using_, pg_get_expr(polwithcheck, polrelid) AS check_
FROM pg_policy
WHERE polname IN ('cls_members_insert', 'submissions_update_student_draft', 'submissions_select_own_or_teacher');
