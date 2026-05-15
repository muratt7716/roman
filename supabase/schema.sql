-- ============================================================
-- Writer Squad — Tam Veritabanı Şeması
-- Supabase SQL Editor'a yapıştır ve çalıştır.
-- Hem boş hem de mevcut veritabanında güvenle çalışır.
-- ============================================================

-- ============================================================
-- 0. TEMİZLİK (varsa sil, yoksa atla)
-- ============================================================

-- Storage politikaları
DROP POLICY IF EXISTS "avatars_public_read"  ON storage.objects;
DROP POLICY IF EXISTS "avatars_auth_insert"  ON storage.objects;
DROP POLICY IF EXISTS "avatars_auth_update"  ON storage.objects;
DROP POLICY IF EXISTS "avatars_auth_delete"  ON storage.objects;
DROP POLICY IF EXISTS "covers_public_read"   ON storage.objects;
DROP POLICY IF EXISTS "covers_auth_insert"   ON storage.objects;
DROP POLICY IF EXISTS "covers_auth_update"   ON storage.objects;
DROP POLICY IF EXISTS "covers_auth_delete"   ON storage.objects;

-- Trigger'lar
DROP TRIGGER IF EXISTS on_auth_user_created    ON auth.users;
DROP TRIGGER IF EXISTS set_updated_at          ON projects;
DROP TRIGGER IF EXISTS set_updated_at          ON chapters;
DROP TRIGGER IF EXISTS set_updated_at          ON brainstorm_notes;
DROP TRIGGER IF EXISTS set_updated_at          ON character_profiles;

-- Fonksiyonlar
DROP FUNCTION IF EXISTS public.handle_new_user()      CASCADE;
DROP FUNCTION IF EXISTS public.update_updated_at()    CASCADE;
DROP FUNCTION IF EXISTS public.is_project_member(uuid) CASCADE;
DROP FUNCTION IF EXISTS public.is_project_owner(uuid)  CASCADE;

-- Tablolar (CASCADE FK bağımlılıklarını halleder)
DROP TABLE IF EXISTS notifications        CASCADE;
DROP TABLE IF EXISTS timeline_events      CASCADE;
DROP TABLE IF EXISTS character_profiles   CASCADE;
DROP TABLE IF EXISTS brainstorm_notes     CASCADE;
DROP TABLE IF EXISTS comments             CASCADE;
DROP TABLE IF EXISTS chapter_suggestions  CASCADE;
DROP TABLE IF EXISTS chapter_versions     CASCADE;
DROP TABLE IF EXISTS chapters             CASCADE;
DROP TABLE IF EXISTS applications         CASCADE;
DROP TABLE IF EXISTS project_invites      CASCADE;
DROP TABLE IF EXISTS project_members      CASCADE;
DROP TABLE IF EXISTS project_roles        CASCADE;
DROP TABLE IF EXISTS projects             CASCADE;
DROP TABLE IF EXISTS profiles             CASCADE;

-- ENUM'lar
DROP TYPE IF EXISTS project_visibility    CASCADE;
DROP TYPE IF EXISTS collaboration_status  CASCADE;
DROP TYPE IF EXISTS application_status    CASCADE;
DROP TYPE IF EXISTS chapter_status        CASCADE;
DROP TYPE IF EXISTS notification_type     CASCADE;
DROP TYPE IF EXISTS brainstorm_note_type  CASCADE;

-- ============================================================
-- 1. ENUMs
-- ============================================================

CREATE TYPE project_visibility    AS ENUM ('draft', 'open', 'closed', 'published');
CREATE TYPE collaboration_status  AS ENUM ('recruiting', 'active', 'completed');
CREATE TYPE application_status    AS ENUM ('pending', 'accepted', 'rejected');
CREATE TYPE chapter_status        AS ENUM ('draft', 'review', 'final');
CREATE TYPE notification_type     AS ENUM ('application', 'acceptance', 'rejection', 'comment', 'mention', 'invite', 'suggestion');
CREATE TYPE brainstorm_note_type  AS ENUM ('plot', 'character', 'lore', 'relationship', 'sticky');

-- ============================================================
-- 2. TABLOLAR
-- ============================================================

CREATE TABLE profiles (
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

CREATE TABLE projects (
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

CREATE TABLE project_roles (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id  uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name        text NOT NULL,
  description text,
  max_members int NOT NULL DEFAULT 1,
  permissions jsonb NOT NULL DEFAULT '{}'
);

CREATE TABLE project_members (
  id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id              uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id                 uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role_id                 uuid NOT NULL REFERENCES project_roles(id) ON DELETE CASCADE,
  joined_at               timestamptz NOT NULL DEFAULT now(),
  contribution_percentage numeric NOT NULL DEFAULT 0,
  UNIQUE(project_id, user_id)
);

CREATE TABLE project_invites (
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

CREATE TABLE applications (
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

CREATE TABLE chapters (
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

CREATE TABLE chapter_versions (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chapter_id  uuid NOT NULL REFERENCES chapters(id) ON DELETE CASCADE,
  author_id   uuid NOT NULL REFERENCES profiles(id),
  content     text NOT NULL,
  word_count  int NOT NULL DEFAULT 0,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE chapter_suggestions (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chapter_id  uuid NOT NULL REFERENCES chapters(id) ON DELETE CASCADE,
  author_id   uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content     text NOT NULL,
  note        text,
  status      text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE comments (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chapter_id      uuid NOT NULL REFERENCES chapters(id) ON DELETE CASCADE,
  author_id       uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content         text NOT NULL,
  selection_range jsonb,
  resolved        boolean NOT NULL DEFAULT false,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE brainstorm_notes (
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

CREATE TABLE character_profiles (
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

CREATE TABLE timeline_events (
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

CREATE TABLE notifications (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type       notification_type NOT NULL,
  payload    jsonb NOT NULL DEFAULT '{}',
  read       boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- 3. TRIGGER'LAR
-- ============================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, username, display_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1) || '_' || substr(NEW.id::text, 1, 4)),
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1))
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS trigger AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_updated_at BEFORE UPDATE ON projects          FOR EACH ROW EXECUTE PROCEDURE public.update_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON chapters          FOR EACH ROW EXECUTE PROCEDURE public.update_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON brainstorm_notes  FOR EACH ROW EXECUTE PROCEDURE public.update_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON character_profiles FOR EACH ROW EXECUTE PROCEDURE public.update_updated_at();

-- ============================================================
-- 4. ROW LEVEL SECURITY (RLS)
-- ============================================================

ALTER TABLE profiles           ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects           ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_roles      ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_members    ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_invites    ENABLE ROW LEVEL SECURITY;
ALTER TABLE applications       ENABLE ROW LEVEL SECURITY;
ALTER TABLE chapters           ENABLE ROW LEVEL SECURITY;
ALTER TABLE chapter_versions   ENABLE ROW LEVEL SECURITY;
ALTER TABLE chapter_suggestions ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments           ENABLE ROW LEVEL SECURITY;
ALTER TABLE brainstorm_notes   ENABLE ROW LEVEL SECURITY;
ALTER TABLE character_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE timeline_events    ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications      ENABLE ROW LEVEL SECURITY;

-- Yardımcı fonksiyonlar
CREATE OR REPLACE FUNCTION public.is_project_member(p_project_id uuid)
RETURNS boolean AS $$
  SELECT EXISTS (SELECT 1 FROM project_members WHERE project_id = p_project_id AND user_id = auth.uid());
$$ LANGUAGE sql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.is_project_owner(p_project_id uuid)
RETURNS boolean AS $$
  SELECT EXISTS (SELECT 1 FROM projects WHERE id = p_project_id AND owner_id = auth.uid());
$$ LANGUAGE sql SECURITY DEFINER;

-- Profiles
CREATE POLICY "profiles_select_all"  ON profiles FOR SELECT USING (true);
CREATE POLICY "profiles_update_own"  ON profiles FOR UPDATE USING (id = auth.uid());

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
CREATE POLICY "members_select_member" ON project_members FOR SELECT USING (is_project_owner(project_id) OR is_project_member(project_id));
CREATE POLICY "members_insert_owner"  ON project_members FOR INSERT WITH CHECK (is_project_owner(project_id));
CREATE POLICY "members_delete_owner"  ON project_members FOR DELETE USING (is_project_owner(project_id));

-- Project Invites
CREATE POLICY "invites_select" ON project_invites FOR SELECT USING (inviter_id = auth.uid() OR invitee_id = auth.uid());
CREATE POLICY "invites_insert" ON project_invites FOR INSERT WITH CHECK (inviter_id = auth.uid() AND is_project_owner(project_id));
CREATE POLICY "invites_update" ON project_invites FOR UPDATE USING (invitee_id = auth.uid() OR inviter_id = auth.uid());

-- Applications
CREATE POLICY "applications_select"       ON applications FOR SELECT USING (applicant_id = auth.uid() OR is_project_owner(project_id));
CREATE POLICY "applications_insert_auth"  ON applications FOR INSERT WITH CHECK (auth.uid() IS NOT NULL AND applicant_id = auth.uid());
CREATE POLICY "applications_update_owner" ON applications FOR UPDATE USING (is_project_owner(project_id));

-- Chapters
CREATE POLICY "chapters_select_member" ON chapters FOR SELECT USING (is_project_owner(project_id) OR is_project_member(project_id));
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
CREATE POLICY "notifications_insert_service" ON notifications FOR INSERT WITH CHECK (true);

-- ============================================================
-- 5. INDEX'LER
-- ============================================================

CREATE INDEX idx_projects_owner         ON projects(owner_id);
CREATE INDEX idx_projects_slug          ON projects(slug);
CREATE INDEX idx_projects_visibility    ON projects(visibility);
CREATE INDEX idx_projects_collab_status ON projects(collaboration_status);
CREATE INDEX idx_project_members_project ON project_members(project_id);
CREATE INDEX idx_project_members_user   ON project_members(user_id);
CREATE INDEX idx_invites_invitee        ON project_invites(invitee_id, status);
CREATE INDEX idx_invites_project        ON project_invites(project_id);
CREATE INDEX idx_chapters_project       ON chapters(project_id);
CREATE INDEX idx_chapter_versions_chapter ON chapter_versions(chapter_id);
CREATE INDEX idx_suggestions_chapter    ON chapter_suggestions(chapter_id, status);
CREATE INDEX idx_suggestions_author     ON chapter_suggestions(author_id);
CREATE INDEX idx_applications_project   ON applications(project_id);
CREATE INDEX idx_applications_applicant ON applications(applicant_id);
CREATE INDEX idx_applications_status    ON applications(status);
CREATE INDEX idx_notifications_user     ON notifications(user_id, read);
CREATE INDEX idx_brainstorm_project     ON brainstorm_notes(project_id);
CREATE INDEX idx_chars_project          ON character_profiles(project_id);
CREATE INDEX idx_timeline_project       ON timeline_events(project_id, order_index);
CREATE INDEX idx_profiles_writing_status ON profiles(writing_status);

-- ============================================================
-- 6. STORAGE BUCKET'LARI (avatars + covers)
-- ============================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  ('avatars', 'avatars', true, 5242880,  ARRAY['image/jpeg','image/png','image/webp','image/gif']),
  ('covers',  'covers',  true, 10485760, ARRAY['image/jpeg','image/png','image/webp'])
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "avatars_public_read"  ON storage.objects FOR SELECT USING (bucket_id = 'avatars');
CREATE POLICY "avatars_auth_insert"  ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'avatars' AND auth.uid() IS NOT NULL);
CREATE POLICY "avatars_auth_update"  ON storage.objects FOR UPDATE USING (bucket_id = 'avatars' AND auth.uid() IS NOT NULL);
CREATE POLICY "avatars_auth_delete"  ON storage.objects FOR DELETE USING (bucket_id = 'avatars' AND auth.uid() IS NOT NULL);

CREATE POLICY "covers_public_read"   ON storage.objects FOR SELECT USING (bucket_id = 'covers');
CREATE POLICY "covers_auth_insert"   ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'covers' AND auth.uid() IS NOT NULL);
CREATE POLICY "covers_auth_update"   ON storage.objects FOR UPDATE USING (bucket_id = 'covers' AND auth.uid() IS NOT NULL);
CREATE POLICY "covers_auth_delete"   ON storage.objects FOR DELETE USING (bucket_id = 'covers' AND auth.uid() IS NOT NULL);
