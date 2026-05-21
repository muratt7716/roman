-- ============================================================
-- Writer Squad — Tam Veritabanı Şeması
-- Supabase SQL Editor'a yapıştır ve çalıştır.
-- VERİ KAYBETMEZ: Tablolar silinmez, sadece eksikler oluşturulur.
-- Politikalar, fonksiyonlar ve trigger'lar her seferinde yenilenir.
-- ============================================================

-- ============================================================
-- 1. ENUMs (yoksa oluştur)
-- ============================================================

DO $$ BEGIN
  CREATE TYPE project_visibility AS ENUM ('draft', 'open', 'closed', 'published');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE collaboration_status AS ENUM ('recruiting', 'active', 'completed');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE application_status AS ENUM ('pending', 'accepted', 'rejected');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE chapter_status AS ENUM ('draft', 'review', 'final');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE notification_type AS ENUM ('application', 'acceptance', 'rejection', 'comment', 'mention', 'invite', 'suggestion');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Yeni notification tipleri (idempotent — varsa hata vermez)
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'new_chapter';
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'new_follower';

DO $$ BEGIN
  CREATE TYPE brainstorm_note_type AS ENUM ('plot', 'character', 'lore', 'relationship', 'sticky');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============================================================
-- 2. TABLOLAR (yoksa oluştur — varsa dokunma)
-- ============================================================

CREATE TABLE IF NOT EXISTS profiles (
  id              uuid PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  username        text UNIQUE NOT NULL,
  display_name    text,
  bio             text,
  avatar_url      text,
  portfolio_url   text,
  writing_status  text NOT NULL DEFAULT 'open' CHECK (writing_status IN ('active', 'open', 'busy')),
  reputation_score int NOT NULL DEFAULT 0,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS projects (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id             uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title                text NOT NULL,
  slug                 text UNIQUE NOT NULL,
  genre                text,
  synopsis             text,
  tags                 text[] NOT NULL DEFAULT '{}',
  target_word_count    int,
  current_word_count   int NOT NULL DEFAULT 0,
  visibility           project_visibility   NOT NULL DEFAULT 'draft',
  collaboration_status collaboration_status NOT NULL DEFAULT 'recruiting',
  cover_image_url      text,
  created_at           timestamptz NOT NULL DEFAULT now(),
  updated_at           timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS project_roles (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id  uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name        text NOT NULL,
  description text,
  max_members int NOT NULL DEFAULT 1,
  permissions jsonb NOT NULL DEFAULT '{}'
);

CREATE TABLE IF NOT EXISTS project_members (
  id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id              uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id                 uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role_id                 uuid NOT NULL REFERENCES project_roles(id) ON DELETE CASCADE,
  joined_at               timestamptz NOT NULL DEFAULT now(),
  contribution_percentage numeric NOT NULL DEFAULT 0,
  UNIQUE(project_id, user_id)
);

CREATE TABLE IF NOT EXISTS project_invites (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id  uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  inviter_id  uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  invitee_id  uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role_id     uuid NOT NULL REFERENCES project_roles(id) ON DELETE CASCADE,
  message     text,
  status      text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined')),
  created_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE(project_id, invitee_id)
);

CREATE TABLE IF NOT EXISTS applications (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id      uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  applicant_id    uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role_id         uuid NOT NULL REFERENCES project_roles(id) ON DELETE CASCADE,
  intro           text NOT NULL,
  writing_sample  text,
  portfolio_links text[] NOT NULL DEFAULT '{}',
  status          application_status NOT NULL DEFAULT 'pending',
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS chapters (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id  uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  title       text NOT NULL,
  order_index int NOT NULL,
  status      chapter_status NOT NULL DEFAULT 'draft',
  word_count  int NOT NULL DEFAULT 0,
  created_by  uuid NOT NULL REFERENCES profiles(id),
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS chapter_versions (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chapter_id  uuid NOT NULL REFERENCES chapters(id) ON DELETE CASCADE,
  author_id   uuid NOT NULL REFERENCES profiles(id),
  content     text NOT NULL,
  word_count  int NOT NULL DEFAULT 0,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS chapter_suggestions (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chapter_id  uuid NOT NULL REFERENCES chapters(id) ON DELETE CASCADE,
  author_id   uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content     text NOT NULL,
  note        text,
  status      text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS comments (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chapter_id      uuid NOT NULL REFERENCES chapters(id) ON DELETE CASCADE,
  author_id       uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content         text NOT NULL,
  selection_range jsonb,
  resolved        boolean NOT NULL DEFAULT false,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS brainstorm_notes (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id  uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  author_id   uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type        brainstorm_note_type NOT NULL DEFAULT 'sticky',
  title       text,
  content     jsonb NOT NULL DEFAULT '{}',
  position_x  numeric NOT NULL DEFAULT 0,
  position_y  numeric NOT NULL DEFAULT 0,
  color       text NOT NULL DEFAULT '#7C3AED',
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS character_profiles (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id    uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name          text NOT NULL,
  role          text,
  description   text,
  traits        text[] NOT NULL DEFAULT '{}',
  image_url     text,
  relationships jsonb NOT NULL DEFAULT '{}',
  arc_notes     text,
  created_by    uuid NOT NULL REFERENCES profiles(id),
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS timeline_events (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id  uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  title       text NOT NULL,
  description text,
  event_date  text,
  arc         text,
  order_index int NOT NULL,
  created_by  uuid NOT NULL REFERENCES profiles(id),
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS notifications (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type       notification_type NOT NULL,
  payload    jsonb NOT NULL DEFAULT '{}',
  read       boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Bölüm görüntüleme sayacı (chapters tablosuna kolon)
ALTER TABLE chapters ADD COLUMN IF NOT EXISTS view_count int NOT NULL DEFAULT 0;

-- Alkış/tepki sistemi
CREATE TABLE IF NOT EXISTS chapter_reactions (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chapter_id  uuid NOT NULL REFERENCES chapters(id) ON DELETE CASCADE,
  user_id     uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  reaction    text NOT NULL CHECK (reaction IN ('fire', 'drop', 'bolt')),
  created_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE(chapter_id, user_id, reaction)
);

-- Okuma listesi
CREATE TABLE IF NOT EXISTS reading_lists (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  status     text NOT NULL CHECK (status IN ('want', 'reading', 'done')),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, project_id)
);

-- Takip sistemi
CREATE TABLE IF NOT EXISTS follows (
  follower_id  uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  following_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at   timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY(follower_id, following_id),
  CHECK(follower_id != following_id)
);

CREATE INDEX IF NOT EXISTS idx_follows_following ON follows(following_id);
CREATE INDEX IF NOT EXISTS idx_reading_lists_project ON reading_lists(project_id);

-- ============================================================
-- 3. TRIGGER'LAR (her seferinde yenile — veri içermez)
-- ============================================================

-- Bölüm görüntüleme sayacı (RLS bypass — SECURITY DEFINER)
CREATE OR REPLACE FUNCTION public.increment_chapter_view(p_chapter_id uuid)
RETURNS void AS $$
  UPDATE chapters
  SET view_count = COALESCE(view_count, 0) + 1
  WHERE id = p_chapter_id
    AND status = 'final'
    AND EXISTS (
      SELECT 1 FROM projects
      WHERE id = chapters.project_id AND visibility = 'published'
    );
$$ LANGUAGE sql SECURITY DEFINER;

-- Yeni bölüm yayınlanınca takipçilere bildirim
CREATE OR REPLACE FUNCTION public.notify_chapter_followers()
RETURNS trigger AS $$
DECLARE
  v_project_id    uuid;
  v_owner_id      uuid;
  v_project_title text;
  v_project_slug  text;
  v_follower      record;
BEGIN
  IF NEW.status = 'final' AND (OLD.status IS NULL OR OLD.status::text != 'final') THEN
    SELECT p.id, p.owner_id, p.title, p.slug
      INTO v_project_id, v_owner_id, v_project_title, v_project_slug
      FROM projects p WHERE p.id = NEW.project_id;
    FOR v_follower IN
      SELECT follower_id FROM follows WHERE following_id = v_owner_id
    LOOP
      INSERT INTO notifications (user_id, type, payload)
      VALUES (
        v_follower.follower_id,
        'new_chapter',
        jsonb_build_object(
          'chapter_id', NEW.id,
          'chapter_title', NEW.title,
          'project_id', v_project_id,
          'project_title', v_project_title,
          'project_slug', v_project_slug,
          'author_id', v_owner_id
        )
      );
    END LOOP;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Yeni takipçi bildirimi
CREATE OR REPLACE FUNCTION public.notify_new_follower()
RETURNS trigger AS $$
DECLARE
  v_name text; v_username text;
BEGIN
  SELECT display_name, username INTO v_name, v_username
    FROM profiles WHERE id = NEW.follower_id;
  INSERT INTO notifications (user_id, type, payload)
  VALUES (
    NEW.following_id,
    'new_follower',
    jsonb_build_object(
      'follower_id', NEW.follower_id,
      'follower_display_name', v_name,
      'follower_username', v_username
    )
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, username, display_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1) || '_' || substr(NEW.id::text, 1, 4)),
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1))
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_chapter_published ON chapters;
CREATE TRIGGER on_chapter_published
  AFTER UPDATE ON chapters
  FOR EACH ROW EXECUTE PROCEDURE public.notify_chapter_followers();

DROP TRIGGER IF EXISTS on_new_follow ON follows;
CREATE TRIGGER on_new_follow
  AFTER INSERT ON follows
  FOR EACH ROW EXECUTE PROCEDURE public.notify_new_follower();

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS trigger AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_updated_at ON projects;
DROP TRIGGER IF EXISTS set_updated_at ON chapters;
DROP TRIGGER IF EXISTS set_updated_at ON brainstorm_notes;
DROP TRIGGER IF EXISTS set_updated_at ON character_profiles;

CREATE TRIGGER set_updated_at BEFORE UPDATE ON projects           FOR EACH ROW EXECUTE PROCEDURE public.update_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON chapters           FOR EACH ROW EXECUTE PROCEDURE public.update_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON brainstorm_notes   FOR EACH ROW EXECUTE PROCEDURE public.update_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON character_profiles FOR EACH ROW EXECUTE PROCEDURE public.update_updated_at();

-- ============================================================
-- 4. ROW LEVEL SECURITY (her seferinde yenile — veri içermez)
-- ============================================================

ALTER TABLE profiles            ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects            ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_roles       ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_members     ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_invites     ENABLE ROW LEVEL SECURITY;
ALTER TABLE applications        ENABLE ROW LEVEL SECURITY;
ALTER TABLE chapters            ENABLE ROW LEVEL SECURITY;
ALTER TABLE chapter_versions    ENABLE ROW LEVEL SECURITY;
ALTER TABLE chapter_suggestions ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments            ENABLE ROW LEVEL SECURITY;
ALTER TABLE brainstorm_notes    ENABLE ROW LEVEL SECURITY;
ALTER TABLE character_profiles  ENABLE ROW LEVEL SECURITY;
ALTER TABLE timeline_events     ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications       ENABLE ROW LEVEL SECURITY;
ALTER TABLE chapter_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE reading_lists     ENABLE ROW LEVEL SECURITY;
ALTER TABLE follows           ENABLE ROW LEVEL SECURITY;

-- Yardımcı fonksiyonlar
CREATE OR REPLACE FUNCTION public.is_project_member(p_project_id uuid)
RETURNS boolean AS $$
  SELECT EXISTS (SELECT 1 FROM project_members WHERE project_id = p_project_id AND user_id = auth.uid());
$$ LANGUAGE sql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.is_project_owner(p_project_id uuid)
RETURNS boolean AS $$
  SELECT EXISTS (SELECT 1 FROM projects WHERE id = p_project_id AND owner_id = auth.uid());
$$ LANGUAGE sql SECURITY DEFINER;

-- Tüm politikaları sil ve yeniden oluştur (politikalar veri içermez)
DROP POLICY IF EXISTS "profiles_select_all"          ON profiles;
DROP POLICY IF EXISTS "profiles_update_own"           ON profiles;
DROP POLICY IF EXISTS "projects_select_public"        ON projects;
DROP POLICY IF EXISTS "projects_insert_auth"          ON projects;
DROP POLICY IF EXISTS "projects_update_owner"         ON projects;
DROP POLICY IF EXISTS "projects_delete_owner"         ON projects;
DROP POLICY IF EXISTS "roles_select_member"           ON project_roles;
DROP POLICY IF EXISTS "roles_insert_owner"            ON project_roles;
DROP POLICY IF EXISTS "roles_update_owner"            ON project_roles;
DROP POLICY IF EXISTS "roles_delete_owner"            ON project_roles;
DROP POLICY IF EXISTS "members_select_member"         ON project_members;
DROP POLICY IF EXISTS "members_insert_owner"          ON project_members;
DROP POLICY IF EXISTS "members_delete_owner"          ON project_members;
DROP POLICY IF EXISTS "invites_select"                ON project_invites;
DROP POLICY IF EXISTS "invites_insert"                ON project_invites;
DROP POLICY IF EXISTS "invites_update"                ON project_invites;
DROP POLICY IF EXISTS "applications_select"           ON applications;
DROP POLICY IF EXISTS "applications_insert_auth"      ON applications;
DROP POLICY IF EXISTS "applications_update_owner"     ON applications;
DROP POLICY IF EXISTS "chapters_select_member"        ON chapters;
DROP POLICY IF EXISTS "chapters_insert_member"        ON chapters;
DROP POLICY IF EXISTS "chapters_update_member"        ON chapters;
DROP POLICY IF EXISTS "chapters_delete_owner"         ON chapters;
DROP POLICY IF EXISTS "versions_select_member"        ON chapter_versions;
DROP POLICY IF EXISTS "versions_insert_member"        ON chapter_versions;
DROP POLICY IF EXISTS "suggestions_select"            ON chapter_suggestions;
DROP POLICY IF EXISTS "suggestions_insert"            ON chapter_suggestions;
DROP POLICY IF EXISTS "suggestions_update"            ON chapter_suggestions;
DROP POLICY IF EXISTS "comments_select_member"        ON comments;
DROP POLICY IF EXISTS "comments_insert_member"        ON comments;
DROP POLICY IF EXISTS "comments_update_author"        ON comments;
DROP POLICY IF EXISTS "comments_delete_author"        ON comments;
DROP POLICY IF EXISTS "brainstorm_select_member"      ON brainstorm_notes;
DROP POLICY IF EXISTS "brainstorm_insert_member"      ON brainstorm_notes;
DROP POLICY IF EXISTS "brainstorm_update_member"      ON brainstorm_notes;
DROP POLICY IF EXISTS "brainstorm_delete_author"      ON brainstorm_notes;
DROP POLICY IF EXISTS "chars_select_member"           ON character_profiles;
DROP POLICY IF EXISTS "chars_insert_member"           ON character_profiles;
DROP POLICY IF EXISTS "chars_update_member"           ON character_profiles;
DROP POLICY IF EXISTS "chars_delete_owner"            ON character_profiles;
DROP POLICY IF EXISTS "timeline_select_member"        ON timeline_events;
DROP POLICY IF EXISTS "timeline_insert_member"        ON timeline_events;
DROP POLICY IF EXISTS "timeline_update_member"        ON timeline_events;
DROP POLICY IF EXISTS "timeline_delete_owner"         ON timeline_events;
DROP POLICY IF EXISTS "notifications_select_own"      ON notifications;
DROP POLICY IF EXISTS "notifications_update_own"      ON notifications;
DROP POLICY IF EXISTS "notifications_insert_service"  ON notifications;
DROP POLICY IF EXISTS "reactions_select_all"     ON chapter_reactions;
DROP POLICY IF EXISTS "reactions_insert_auth"    ON chapter_reactions;
DROP POLICY IF EXISTS "reactions_delete_own"     ON chapter_reactions;
DROP POLICY IF EXISTS "readinglist_select_own"   ON reading_lists;
DROP POLICY IF EXISTS "readinglist_insert_auth"  ON reading_lists;
DROP POLICY IF EXISTS "readinglist_update_own"   ON reading_lists;
DROP POLICY IF EXISTS "readinglist_delete_own"   ON reading_lists;
DROP POLICY IF EXISTS "follows_select_all"       ON follows;
DROP POLICY IF EXISTS "follows_insert_auth"      ON follows;
DROP POLICY IF EXISTS "follows_delete_own"       ON follows;

-- Profiles
CREATE POLICY "profiles_select_all" ON profiles FOR SELECT USING (true);
CREATE POLICY "profiles_update_own" ON profiles FOR UPDATE USING (id = auth.uid());

-- Projects
CREATE POLICY "projects_select_public" ON projects FOR SELECT USING (visibility IN ('open', 'closed', 'published') OR owner_id = auth.uid() OR is_project_member(id));
CREATE POLICY "projects_insert_auth"   ON projects FOR INSERT WITH CHECK (auth.uid() IS NOT NULL AND owner_id = auth.uid());
CREATE POLICY "projects_update_owner"  ON projects FOR UPDATE USING (owner_id = auth.uid());
CREATE POLICY "projects_delete_owner"  ON projects FOR DELETE USING (owner_id = auth.uid());

-- Project Roles
CREATE POLICY "roles_select_member" ON project_roles FOR SELECT USING (is_project_owner(project_id) OR is_project_member(project_id) OR EXISTS (SELECT 1 FROM projects WHERE id = project_id AND visibility IN ('open', 'closed', 'published')));
CREATE POLICY "roles_insert_owner"  ON project_roles FOR INSERT WITH CHECK (is_project_owner(project_id));
CREATE POLICY "roles_update_owner"  ON project_roles FOR UPDATE USING (is_project_owner(project_id));
CREATE POLICY "roles_delete_owner"  ON project_roles FOR DELETE USING (is_project_owner(project_id));

-- Project Members
CREATE POLICY "members_select_member" ON project_members FOR SELECT USING (
  is_project_owner(project_id) OR is_project_member(project_id)
  OR EXISTS (SELECT 1 FROM projects WHERE id = project_id AND visibility IN ('open', 'closed', 'published'))
);
CREATE POLICY "members_insert_owner"  ON project_members FOR INSERT WITH CHECK (
  is_project_owner(project_id) OR (
    user_id = auth.uid() AND EXISTS (
      SELECT 1 FROM project_invites
      WHERE project_invites.project_id = project_members.project_id
        AND project_invites.invitee_id = auth.uid()
        AND project_invites.status = 'pending'
    )
  )
);
CREATE POLICY "members_delete_owner" ON project_members FOR DELETE USING (is_project_owner(project_id));

-- Project Invites
CREATE POLICY "invites_select" ON project_invites FOR SELECT USING (inviter_id = auth.uid() OR invitee_id = auth.uid());
CREATE POLICY "invites_insert" ON project_invites FOR INSERT WITH CHECK (inviter_id = auth.uid() AND is_project_owner(project_id));
CREATE POLICY "invites_update" ON project_invites FOR UPDATE USING (invitee_id = auth.uid() OR inviter_id = auth.uid());

-- Applications
CREATE POLICY "applications_select"       ON applications FOR SELECT USING (applicant_id = auth.uid() OR is_project_owner(project_id));
CREATE POLICY "applications_insert_auth"  ON applications FOR INSERT WITH CHECK (auth.uid() IS NOT NULL AND applicant_id = auth.uid());
CREATE POLICY "applications_update_owner" ON applications FOR UPDATE USING (is_project_owner(project_id));

-- Chapters
CREATE POLICY "chapters_select_member" ON chapters FOR SELECT USING (
  is_project_owner(project_id)
  OR is_project_member(project_id)
  OR (status = 'final' AND EXISTS (
    SELECT 1 FROM projects WHERE id = project_id AND visibility = 'published'
  ))
);
CREATE POLICY "chapters_insert_member" ON chapters FOR INSERT WITH CHECK (is_project_owner(project_id) OR is_project_member(project_id));
CREATE POLICY "chapters_update_member" ON chapters FOR UPDATE USING (is_project_owner(project_id) OR is_project_member(project_id));
CREATE POLICY "chapters_delete_owner"  ON chapters FOR DELETE USING (is_project_owner(project_id));

-- Chapter Versions
CREATE POLICY "versions_select_member" ON chapter_versions FOR SELECT USING (EXISTS (SELECT 1 FROM chapters c WHERE c.id = chapter_id AND (is_project_owner(c.project_id) OR is_project_member(c.project_id))));
CREATE POLICY "versions_insert_member" ON chapter_versions FOR INSERT WITH CHECK (author_id = auth.uid() AND EXISTS (SELECT 1 FROM chapters c WHERE c.id = chapter_id AND (is_project_owner(c.project_id) OR is_project_member(c.project_id))));

-- Chapter Suggestions
CREATE POLICY "suggestions_select" ON chapter_suggestions FOR SELECT USING (
  EXISTS (SELECT 1 FROM chapters c WHERE c.id = chapter_id AND (is_project_owner(c.project_id) OR is_project_member(c.project_id)))
);
CREATE POLICY "suggestions_insert" ON chapter_suggestions FOR INSERT WITH CHECK (
  author_id = auth.uid() AND
  EXISTS (SELECT 1 FROM chapters c WHERE c.id = chapter_id AND (is_project_owner(c.project_id) OR is_project_member(c.project_id)))
);
CREATE POLICY "suggestions_update" ON chapter_suggestions FOR UPDATE USING (
  EXISTS (SELECT 1 FROM chapters c WHERE c.id = chapter_id AND is_project_owner(c.project_id))
);

-- Comments
CREATE POLICY "comments_select_member" ON comments FOR SELECT USING (EXISTS (SELECT 1 FROM chapters c WHERE c.id = chapter_id AND (is_project_owner(c.project_id) OR is_project_member(c.project_id))));
CREATE POLICY "comments_insert_member" ON comments FOR INSERT WITH CHECK (author_id = auth.uid() AND EXISTS (SELECT 1 FROM chapters c WHERE c.id = chapter_id AND (is_project_owner(c.project_id) OR is_project_member(c.project_id))));
CREATE POLICY "comments_update_author" ON comments FOR UPDATE USING (author_id = auth.uid());
CREATE POLICY "comments_delete_author" ON comments FOR DELETE USING (author_id = auth.uid() OR EXISTS (SELECT 1 FROM chapters c WHERE c.id = chapter_id AND is_project_owner(c.project_id)));

-- Brainstorm Notes
CREATE POLICY "brainstorm_select_member" ON brainstorm_notes FOR SELECT USING (is_project_owner(project_id) OR is_project_member(project_id));
CREATE POLICY "brainstorm_insert_member" ON brainstorm_notes FOR INSERT WITH CHECK (auth.uid() = author_id AND (is_project_owner(project_id) OR is_project_member(project_id)));
CREATE POLICY "brainstorm_update_member" ON brainstorm_notes FOR UPDATE USING (is_project_owner(project_id) OR is_project_member(project_id));
CREATE POLICY "brainstorm_delete_author" ON brainstorm_notes FOR DELETE USING (author_id = auth.uid() OR is_project_owner(project_id));

-- Character Profiles
CREATE POLICY "chars_select_member" ON character_profiles FOR SELECT USING (is_project_owner(project_id) OR is_project_member(project_id));
CREATE POLICY "chars_insert_member" ON character_profiles FOR INSERT WITH CHECK (is_project_owner(project_id) OR is_project_member(project_id));
CREATE POLICY "chars_update_member" ON character_profiles FOR UPDATE USING (is_project_owner(project_id) OR is_project_member(project_id));
CREATE POLICY "chars_delete_owner"  ON character_profiles FOR DELETE USING (is_project_owner(project_id));

-- Timeline Events
CREATE POLICY "timeline_select_member" ON timeline_events FOR SELECT USING (is_project_owner(project_id) OR is_project_member(project_id));
CREATE POLICY "timeline_insert_member" ON timeline_events FOR INSERT WITH CHECK (is_project_owner(project_id) OR is_project_member(project_id));
CREATE POLICY "timeline_update_member" ON timeline_events FOR UPDATE USING (is_project_owner(project_id) OR is_project_member(project_id));
CREATE POLICY "timeline_delete_owner"  ON timeline_events FOR DELETE USING (is_project_owner(project_id));

-- Notifications
CREATE POLICY "notifications_select_own"     ON notifications FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "notifications_update_own"     ON notifications FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "notifications_insert_service" ON notifications FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- ============================================================
-- 5. INDEX'LER (yoksa oluştur)
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_projects_owner          ON projects(owner_id);
CREATE INDEX IF NOT EXISTS idx_projects_slug           ON projects(slug);
CREATE INDEX IF NOT EXISTS idx_projects_visibility     ON projects(visibility);
CREATE INDEX IF NOT EXISTS idx_projects_collab_status  ON projects(collaboration_status);
CREATE INDEX IF NOT EXISTS idx_project_members_project ON project_members(project_id);
CREATE INDEX IF NOT EXISTS idx_project_members_user    ON project_members(user_id);
CREATE INDEX IF NOT EXISTS idx_invites_invitee         ON project_invites(invitee_id, status);
CREATE INDEX IF NOT EXISTS idx_invites_project         ON project_invites(project_id);
CREATE INDEX IF NOT EXISTS idx_chapters_project        ON chapters(project_id);
CREATE INDEX IF NOT EXISTS idx_chapter_versions_chapter ON chapter_versions(chapter_id);
CREATE INDEX IF NOT EXISTS idx_suggestions_chapter     ON chapter_suggestions(chapter_id, status);
CREATE INDEX IF NOT EXISTS idx_suggestions_author      ON chapter_suggestions(author_id);
CREATE INDEX IF NOT EXISTS idx_applications_project    ON applications(project_id);
CREATE INDEX IF NOT EXISTS idx_applications_applicant  ON applications(applicant_id);
CREATE INDEX IF NOT EXISTS idx_applications_status     ON applications(status);
CREATE INDEX IF NOT EXISTS idx_notifications_user      ON notifications(user_id, read);
CREATE INDEX IF NOT EXISTS idx_brainstorm_project      ON brainstorm_notes(project_id);
CREATE INDEX IF NOT EXISTS idx_chars_project           ON character_profiles(project_id);
CREATE INDEX IF NOT EXISTS idx_timeline_project        ON timeline_events(project_id, order_index);
CREATE INDEX IF NOT EXISTS idx_profiles_writing_status ON profiles(writing_status);

-- ============================================================
-- FİKİR ODASI TABLOLARI
-- ============================================================

-- Tohum fikirler (thread başlıkları)
CREATE TABLE IF NOT EXISTS idea_threads (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid        NOT NULL REFERENCES profiles(id)  ON DELETE CASCADE,
  title       text        NOT NULL CHECK (char_length(title) BETWEEN 5 AND 100),
  seed        text        NOT NULL CHECK (char_length(seed)  BETWEEN 10 AND 500),
  status      text        NOT NULL DEFAULT 'active'
                          CHECK (status IN ('active', 'team_forming', 'closed')),
  project_id  uuid        REFERENCES projects(id) ON DELETE SET NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- Realtime mesajlar
CREATE TABLE IF NOT EXISTS idea_messages (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id   uuid        NOT NULL REFERENCES idea_threads(id) ON DELETE CASCADE,
  user_id     uuid        NOT NULL REFERENCES profiles(id)     ON DELETE CASCADE,
  content     text        NOT NULL CHECK (char_length(content) BETWEEN 1 AND 1000),
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- Katılım talepleri
CREATE TABLE IF NOT EXISTS idea_join_requests (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id   uuid        NOT NULL REFERENCES idea_threads(id) ON DELETE CASCADE,
  user_id     uuid        NOT NULL REFERENCES profiles(id)     ON DELETE CASCADE,
  status      text        NOT NULL DEFAULT 'pending'
                          CHECK (status IN ('pending', 'accepted', 'rejected')),
  created_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (thread_id, user_id)
);

-- RLS
ALTER TABLE idea_threads      ENABLE ROW LEVEL SECURITY;
ALTER TABLE idea_messages     ENABLE ROW LEVEL SECURITY;
ALTER TABLE idea_join_requests ENABLE ROW LEVEL SECURITY;

-- idea_threads policies
DROP POLICY IF EXISTS "idea_threads_select"  ON idea_threads;
DROP POLICY IF EXISTS "idea_threads_insert"  ON idea_threads;
DROP POLICY IF EXISTS "idea_threads_update"  ON idea_threads;
DROP POLICY IF EXISTS "idea_threads_delete"  ON idea_threads;

CREATE POLICY "idea_threads_select" ON idea_threads FOR SELECT USING (true);
CREATE POLICY "idea_threads_insert" ON idea_threads FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "idea_threads_update" ON idea_threads FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "idea_threads_delete" ON idea_threads FOR DELETE USING (auth.uid() = user_id);

-- idea_messages policies
DROP POLICY IF EXISTS "idea_messages_select" ON idea_messages;
DROP POLICY IF EXISTS "idea_messages_insert" ON idea_messages;
DROP POLICY IF EXISTS "idea_messages_delete" ON idea_messages;

CREATE POLICY "idea_messages_select" ON idea_messages FOR SELECT USING (true);
CREATE POLICY "idea_messages_insert" ON idea_messages FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "idea_messages_delete" ON idea_messages FOR DELETE USING (auth.uid() = user_id);

-- idea_join_requests policies
DROP POLICY IF EXISTS "idea_join_select"  ON idea_join_requests;
DROP POLICY IF EXISTS "idea_join_insert"  ON idea_join_requests;
DROP POLICY IF EXISTS "idea_join_update"  ON idea_join_requests;
DROP POLICY IF EXISTS "idea_join_delete"  ON idea_join_requests;

-- Thread sahibi tüm talepleri görebilir; kullanıcı kendi talebini görebilir
CREATE POLICY "idea_join_select" ON idea_join_requests FOR SELECT USING (
  auth.uid() = user_id
  OR auth.uid() = (SELECT user_id FROM idea_threads WHERE id = thread_id)
);
CREATE POLICY "idea_join_insert" ON idea_join_requests FOR INSERT WITH CHECK (auth.uid() = user_id);
-- Thread sahibi kabul/ret yapabilir
CREATE POLICY "idea_join_update" ON idea_join_requests FOR UPDATE USING (
  auth.uid() = (SELECT user_id FROM idea_threads WHERE id = thread_id)
);
CREATE POLICY "idea_join_delete" ON idea_join_requests FOR DELETE USING (auth.uid() = user_id);

-- İndeksler
CREATE INDEX IF NOT EXISTS idx_idea_threads_user      ON idea_threads(user_id);
CREATE INDEX IF NOT EXISTS idx_idea_threads_status    ON idea_threads(status);
CREATE INDEX IF NOT EXISTS idx_idea_messages_thread   ON idea_messages(thread_id, created_at);
CREATE INDEX IF NOT EXISTS idx_idea_join_thread       ON idea_join_requests(thread_id);

-- ============================================================
-- 6. STORAGE BUCKET'LARI (yoksa oluştur)
-- ============================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  ('avatars', 'avatars', true, 5242880,  ARRAY['image/jpeg','image/png','image/webp','image/gif']),
  ('covers',  'covers',  true, 10485760, ARRAY['image/jpeg','image/png','image/webp'])
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "avatars_public_read" ON storage.objects;
DROP POLICY IF EXISTS "avatars_auth_insert" ON storage.objects;
DROP POLICY IF EXISTS "avatars_auth_update" ON storage.objects;
DROP POLICY IF EXISTS "avatars_auth_delete" ON storage.objects;
DROP POLICY IF EXISTS "covers_public_read"  ON storage.objects;
DROP POLICY IF EXISTS "covers_auth_insert"  ON storage.objects;
DROP POLICY IF EXISTS "covers_auth_update"  ON storage.objects;
DROP POLICY IF EXISTS "covers_auth_delete"  ON storage.objects;

CREATE POLICY "avatars_public_read"  ON storage.objects FOR SELECT USING (bucket_id = 'avatars');
CREATE POLICY "avatars_auth_insert"  ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'avatars' AND auth.uid() IS NOT NULL);
CREATE POLICY "avatars_auth_update"  ON storage.objects FOR UPDATE USING (bucket_id = 'avatars' AND auth.uid() IS NOT NULL);
CREATE POLICY "avatars_auth_delete"  ON storage.objects FOR DELETE USING (bucket_id = 'avatars' AND auth.uid() IS NOT NULL);

CREATE POLICY "covers_public_read"   ON storage.objects FOR SELECT USING (bucket_id = 'covers');
CREATE POLICY "covers_auth_insert"   ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'covers' AND auth.uid() IS NOT NULL);
CREATE POLICY "covers_auth_update"   ON storage.objects FOR UPDATE USING (bucket_id = 'covers' AND auth.uid() IS NOT NULL);
CREATE POLICY "covers_auth_delete"   ON storage.objects FOR DELETE USING (bucket_id = 'covers' AND auth.uid() IS NOT NULL);

-- ============================================================
-- 7. FEEDBACK TABLOSU
-- ============================================================

CREATE TABLE IF NOT EXISTS feedback (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type       text NOT NULL CHECK (type IN ('bug', 'suggestion', 'feature', 'other')),
  message    text NOT NULL CHECK (char_length(message) BETWEEN 20 AND 2000),
  status     text NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'reviewed', 'done')),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE feedback ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "feedback_insert_self"   ON feedback;
DROP POLICY IF EXISTS "feedback_select_self"   ON feedback;
DROP POLICY IF EXISTS "feedback_select_admin"  ON feedback;
DROP POLICY IF EXISTS "feedback_update_admin"  ON feedback;

-- Kullanıcı kendi feedback'ini gönderebilir; admin tümünü görebilir ve güncelleyebilir
CREATE POLICY "feedback_insert_self" ON feedback FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "feedback_select_admin" ON feedback FOR SELECT
  USING (auth.uid() = user_id OR (auth.jwt() ->> 'email') = 'mmuratb77@gmail.com');
CREATE POLICY "feedback_update_admin" ON feedback FOR UPDATE
  USING ((auth.jwt() ->> 'email') = 'mmuratb77@gmail.com')
  WITH CHECK ((auth.jwt() ->> 'email') = 'mmuratb77@gmail.com');

CREATE INDEX IF NOT EXISTS idx_feedback_user_id   ON feedback(user_id);
CREATE INDEX IF NOT EXISTS idx_feedback_status    ON feedback(status);
CREATE INDEX IF NOT EXISTS idx_feedback_created   ON feedback(created_at DESC);

-- Chapter Reactions
CREATE POLICY "reactions_select_all"  ON chapter_reactions FOR SELECT USING (true);
CREATE POLICY "reactions_insert_auth" ON chapter_reactions FOR INSERT WITH CHECK (auth.uid() IS NOT NULL AND user_id = auth.uid());
CREATE POLICY "reactions_delete_own"  ON chapter_reactions FOR DELETE USING (user_id = auth.uid());

-- Reading Lists
CREATE POLICY "readinglist_select_own"  ON reading_lists FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "readinglist_insert_auth" ON reading_lists FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "readinglist_update_own"  ON reading_lists FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "readinglist_delete_own"  ON reading_lists FOR DELETE USING (user_id = auth.uid());

-- Follows
CREATE POLICY "follows_select_all"  ON follows FOR SELECT USING (true);
CREATE POLICY "follows_insert_auth" ON follows FOR INSERT WITH CHECK (auth.uid() IS NOT NULL AND follower_id = auth.uid());
CREATE POLICY "follows_delete_own"  ON follows FOR DELETE USING (follower_id = auth.uid());
