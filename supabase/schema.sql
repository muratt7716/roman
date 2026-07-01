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
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'reaction';

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
  parent_id       uuid REFERENCES comments(id) ON DELETE CASCADE,
  created_at      timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE comments ADD COLUMN IF NOT EXISTS parent_id uuid REFERENCES comments(id) ON DELETE CASCADE;

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

-- ============================================================
-- USER WRITING GOALS (Faz 2)
-- ============================================================

CREATE TABLE IF NOT EXISTS user_writing_goals (
  user_id          uuid PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  daily_target     int NOT NULL DEFAULT 500 CHECK (daily_target BETWEEN 50 AND 10000),
  streak_current   int NOT NULL DEFAULT 0,
  streak_best      int NOT NULL DEFAULT 0,
  streak_last_date date,
  updated_at       timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE user_writing_goals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "goals_self" ON user_writing_goals;
CREATE POLICY "goals_self" ON user_writing_goals
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- USER BADGES (Faz 2)
-- ============================================================

CREATE TABLE IF NOT EXISTS user_badges (
  user_id    uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  badge_code text NOT NULL,
  earned_at  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, badge_code)
);

ALTER TABLE user_badges ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "badges_select_all"  ON user_badges;
DROP POLICY IF EXISTS "badges_insert_self" ON user_badges;
CREATE POLICY "badges_select_all"  ON user_badges FOR SELECT USING (true);
CREATE POLICY "badges_insert_self" ON user_badges FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_user_badges_user ON user_badges(user_id);

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
  role         text NOT NULL CHECK (role IN ('teacher','student','parent')),
  student_id   uuid REFERENCES profiles(id) ON DELETE SET NULL,
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

-- SECURITY DEFINER: classroom owner kontrolü (RLS döngüsünü kırar)
-- classrooms_select_member → classroom_members sorgular,
-- cls_members_select → classrooms sorgularsa sonsuz döngü olur.
-- Bu fonksiyon classrooms tablosunu RLS bypass ile okur, döngü kırılır.
CREATE OR REPLACE FUNCTION auth_is_classroom_owner(p_classroom_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT owner_id = auth.uid() FROM classrooms WHERE id = p_classroom_id
$$;

-- Idempotent sütun eklemeleri (tablo daha önce join_code olmadan oluşturulduysa ekle)
ALTER TABLE classrooms ADD COLUMN IF NOT EXISTS join_code   text UNIQUE;
ALTER TABLE classrooms ADD COLUMN IF NOT EXISTS school_name text NOT NULL DEFAULT '';
ALTER TABLE classrooms ADD COLUMN IF NOT EXISTS password    text NOT NULL DEFAULT '';

CREATE INDEX IF NOT EXISTS idx_classrooms_school ON classrooms(school_name);

-- Okul adına göre sınıf arama (şifre döndürmez, herkes çağırabilir)
CREATE OR REPLACE FUNCTION search_classrooms(p_school text, p_name text DEFAULT NULL)
RETURNS TABLE(id uuid, name text, school_name text, member_count bigint)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT c.id, c.name, c.school_name,
    COUNT(cm.user_id)::bigint
  FROM classrooms c
  LEFT JOIN classroom_members cm ON cm.classroom_id = c.id
  WHERE c.school_name ILIKE '%' || p_school || '%'
    AND (p_name IS NULL OR c.name ILIKE '%' || p_name || '%')
  GROUP BY c.id, c.name, c.school_name
  ORDER BY c.school_name, c.name;
END;
$$;

-- Şifreyle sınıfa katıl
CREATE OR REPLACE FUNCTION join_classroom_by_password(p_classroom_id uuid, p_password text)
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

  SELECT * INTO v_classroom FROM classrooms WHERE id = p_classroom_id;

  IF NOT FOUND THEN
    RETURN json_build_object('error', 'Sınıf bulunamadı.');
  END IF;

  IF v_classroom.password != p_password THEN
    RETURN json_build_object('error', 'Şifre yanlış.');
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

-- Eski join_code fonksiyonunu koru (geriye uyumluluk)
CREATE OR REPLACE FUNCTION join_classroom_by_code(p_code text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN json_build_object('error', 'Bu yöntem artık kullanılmıyor. Lütfen sınıf arama ile katıl.');
END;
$$;

-- Sınıf oluşturma: PostgREST schema cache bypass, join_code dahil her şeyi burada halleder
CREATE OR REPLACE FUNCTION create_classroom(
  p_name        text,
  p_school_name text,
  p_password    text,
  p_description text DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id      uuid := auth.uid();
  v_join_code    text;
  v_classroom_id uuid;
  v_row          json;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN json_build_object('error', 'Giriş yapman gerekiyor.');
  END IF;

  IF char_length(trim(p_name)) < 2 OR char_length(trim(p_name)) > 100 THEN
    RETURN json_build_object('error', 'Sınıf adı 2-100 karakter olmalı.');
  END IF;

  -- Eşsiz join_code üret (çakışma olana kadar tekrarla)
  LOOP
    SELECT array_to_string(
      array(
        SELECT substr('ABCDEFGHJKLMNPQRSTUVWXYZ23456789', (floor(random() * 32) + 1)::int, 1)
        FROM generate_series(1, 6)
      ), ''
    ) INTO v_join_code;
    EXIT WHEN NOT EXISTS (SELECT 1 FROM classrooms WHERE join_code = v_join_code);
  END LOOP;

  INSERT INTO classrooms (owner_id, name, school_name, password, join_code, description)
  VALUES (
    v_user_id,
    trim(p_name),
    trim(p_school_name),
    trim(p_password),
    v_join_code,
    nullif(trim(coalesce(p_description, '')), '')
  )
  RETURNING id INTO v_classroom_id;

  -- Öğretmen üyeliğini de burada ekle (RLS bypass ile güvenli)
  INSERT INTO classroom_members (classroom_id, user_id, role)
  VALUES (v_classroom_id, v_user_id, 'teacher')
  ON CONFLICT DO NOTHING;

  SELECT row_to_json(c) INTO v_row FROM classrooms c WHERE id = v_classroom_id;
  RETURN v_row;
END;
$$;

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

-- Faz 4: student_id kolonu (veli-öğrenci bağlantısı) — idempotent
ALTER TABLE classroom_members ADD COLUMN IF NOT EXISTS student_id uuid REFERENCES profiles(id) ON DELETE SET NULL;
-- Faz 4: role CHECK'e parent ekle (varsa constraint'i yeniden oluştur)
ALTER TABLE classroom_members DROP CONSTRAINT IF EXISTS classroom_members_role_check;
ALTER TABLE classroom_members ADD CONSTRAINT classroom_members_role_check CHECK (role IN ('teacher','student','parent'));

-- RLS: classroom_members
ALTER TABLE classroom_members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "cls_members_select" ON classroom_members;
DROP POLICY IF EXISTS "cls_members_insert" ON classroom_members;
DROP POLICY IF EXISTS "cls_members_delete" ON classroom_members;

CREATE POLICY "cls_members_select" ON classroom_members FOR SELECT USING (
  user_id = auth.uid()
  OR auth_is_classroom_owner(classroom_id)
);
CREATE POLICY "cls_members_insert" ON classroom_members FOR INSERT WITH CHECK (
  auth.uid() = user_id
  AND (
    role = 'student'
    OR (role = 'teacher' AND auth_is_classroom_owner(classroom_id))
    OR (role = 'parent' AND auth_is_classroom_owner(classroom_id))
  )
);
CREATE POLICY "cls_members_delete" ON classroom_members FOR DELETE USING (
  user_id = auth.uid()
  OR EXISTS (SELECT 1 FROM classrooms WHERE id = classroom_id AND owner_id = auth.uid())
);

-- Backfill: sınıf sahibinin classroom_members satırı eksikse ekle (SQL Editor admin olarak çalışır)
INSERT INTO classroom_members (classroom_id, user_id, role)
SELECT c.id, c.owner_id, 'teacher'
FROM classrooms c
WHERE NOT EXISTS (
  SELECT 1 FROM classroom_members cm
  WHERE cm.classroom_id = c.id AND cm.user_id = c.owner_id
)
ON CONFLICT DO NOTHING;

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
  OR EXISTS (
    SELECT 1 FROM classroom_members cm
    JOIN classroom_assignments ca ON ca.classroom_id = cm.classroom_id
    WHERE ca.id = assignment_id
      AND cm.user_id = auth.uid()
      AND cm.role = 'parent'
      AND cm.student_id = student_id
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
) WITH CHECK (
  status IN ('submitted', 'graded')
);

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

-- ============================================================
-- FAZ 5: YAZI SPRİNTLERİ
-- ============================================================

CREATE TABLE IF NOT EXISTS writing_sprints (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title            text NOT NULL DEFAULT 'Yazı Sprinti',
  duration_minutes int  NOT NULL CHECK (duration_minutes IN (15, 25, 45)),
  starts_at        timestamptz NOT NULL,
  ends_at          timestamptz NOT NULL,
  status           text NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled','active','finished')),
  created_by       uuid REFERENCES profiles(id) ON DELETE SET NULL,
  is_community     boolean NOT NULL DEFAULT true,
  created_at       timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sprints_starts_at ON writing_sprints(starts_at);
CREATE INDEX IF NOT EXISTS idx_sprints_status    ON writing_sprints(status);

CREATE TABLE IF NOT EXISTS sprint_participants (
  sprint_id      uuid NOT NULL REFERENCES writing_sprints(id) ON DELETE CASCADE,
  user_id        uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  word_count     int  NOT NULL DEFAULT 0,
  start_word_ref int  NOT NULL DEFAULT 0,
  joined_at      timestamptz NOT NULL DEFAULT now(),
  finished_at    timestamptz,
  PRIMARY KEY (sprint_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_sprint_participants_user ON sprint_participants(user_id);

-- RLS: writing_sprints
ALTER TABLE writing_sprints ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "sprints_select_all"    ON writing_sprints;
DROP POLICY IF EXISTS "sprints_insert_auth"   ON writing_sprints;
DROP POLICY IF EXISTS "sprints_update_auth"   ON writing_sprints;
CREATE POLICY "sprints_select_all"  ON writing_sprints FOR SELECT USING (true);
CREATE POLICY "sprints_insert_auth" ON writing_sprints FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "sprints_update_auth" ON writing_sprints FOR UPDATE USING (auth.uid() IS NOT NULL);

-- RLS: sprint_participants
ALTER TABLE sprint_participants ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "sp_select_all"   ON sprint_participants;
DROP POLICY IF EXISTS "sp_insert_self"  ON sprint_participants;
DROP POLICY IF EXISTS "sp_update_self"  ON sprint_participants;
CREATE POLICY "sp_select_all"  ON sprint_participants FOR SELECT USING (true);
CREATE POLICY "sp_insert_self" ON sprint_participants FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "sp_update_self" ON sprint_participants FOR UPDATE USING (auth.uid() = user_id);

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
  status = 'draft'
  AND EXISTS (SELECT 1 FROM classrooms WHERE id = classroom_id AND owner_id = auth.uid())
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

-- PostgREST schema cache'ini yenile (şema güncellemesinden sonra otomatik tetiklenir)
NOTIFY pgrst, 'reload schema';
