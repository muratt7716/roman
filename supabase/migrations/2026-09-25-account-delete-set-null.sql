-- ============================================================
-- Hesap silme — ortak projelere katkı veren kullanıcı silinemiyordu
-- 25 Eyl 2026 · Supabase Dashboard > SQL Editor'da BU DOSYAYI çalıştır
-- ============================================================
--
-- Belirti: /api/account/delete → "Database error deleting user".
-- Canlıda doğrulandı: A kullanıcısı B'nin projesine bir bölüm ekleyince
-- auth.admin.deleteUser(A) başarısız oluyor.
--
-- Sebep: aşağıdaki 4 kolon profiles(id)'ye ON DELETE kuralı olmadan bağlı
-- (varsayılan NO ACTION). Kullanıcının kendi projesindeki satırlar proje ile
-- birlikte cascade'le gittiği için sorun yalnızca BAŞKASININ projesine katkı
-- verenlerde çıkıyor — yani tam da ortak yazım yapan kullanıcılarda.
--
-- Neden CASCADE değil SET NULL: chapter_versions bölüm METNİNİN kendisi.
-- CASCADE, ayrılan bir ortak yazarın yazdığı her versiyonu (çoğu zaman bölümün
-- en güncel halini) proje sahibinin kitabından silerdi. SET NULL kişisel veri
-- bağını (kim yazdı) koparır, eser projede kalır. Silme diyaloğu da kullanıcıya
-- bunu söylüyor: "Ortak olduğun projelerdeki katkıların ... görünmeye devam eder."
--
-- Kısıt adları korunuyor: app/(public)/page.tsx ilişkiyi
-- `profiles!chapters_created_by_fkey` adıyla çağırıyor.

DO $$
DECLARE
  t record;
  old_name text;
BEGIN
  FOR t IN SELECT * FROM (VALUES
    ('chapters',           'created_by'),
    ('chapter_versions',   'author_id'),
    ('character_profiles', 'created_by'),
    ('timeline_events',    'created_by')
  ) AS v(tbl, col)
  LOOP
    SELECT c.conname INTO old_name
    FROM pg_constraint c
    JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = ANY (c.conkey)
    WHERE c.conrelid = ('public.' || t.tbl)::regclass
      AND c.contype = 'f'
      AND c.confrelid = 'public.profiles'::regclass
      AND a.attname = t.col;

    IF old_name IS NOT NULL THEN
      EXECUTE format('ALTER TABLE public.%I DROP CONSTRAINT %I', t.tbl, old_name);
    END IF;

    EXECUTE format('ALTER TABLE public.%I ALTER COLUMN %I DROP NOT NULL', t.tbl, t.col);
    EXECUTE format(
      'ALTER TABLE public.%I ADD CONSTRAINT %I FOREIGN KEY (%I) REFERENCES public.profiles(id) ON DELETE SET NULL',
      t.tbl, t.tbl || '_' || t.col || '_fkey', t.col
    );
  END LOOP;
END $$;

-- PostgREST ilişki önbelleğini tazele (profiles!chapters_created_by_fkey join'i için)
NOTIFY pgrst, 'reload schema';

-- Doğrulama — 4 satır, hepsi confdeltype = 'n' (SET NULL) olmalı:
SELECT conrelid::regclass AS tablo, conname, confdeltype
FROM pg_constraint
WHERE confrelid = 'public.profiles'::regclass
  AND conname IN ('chapters_created_by_fkey', 'chapter_versions_author_id_fkey',
                  'character_profiles_created_by_fkey', 'timeline_events_created_by_fkey');

-- Kalan engel var mı? Kullanıcı silmeyi durdurabilecek her FK (NO ACTION / RESTRICT).
-- BOŞ dönmeli. Satır dönerse o tablo da aynı şekilde düzeltilmeli.
SELECT conrelid::regclass AS tablo, conname, confrelid::regclass AS hedef, confdeltype
FROM pg_constraint
WHERE contype = 'f'
  AND confrelid IN ('public.profiles'::regclass, 'auth.users'::regclass)
  AND confdeltype IN ('a', 'r')
  AND connamespace = 'public'::regnamespace;
