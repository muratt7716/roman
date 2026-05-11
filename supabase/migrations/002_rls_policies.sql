ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE chapters ENABLE ROW LEVEL SECURITY;
ALTER TABLE chapter_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE brainstorm_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE character_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE timeline_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION is_project_member(p_project_id uuid)
RETURNS boolean AS $$
  SELECT EXISTS (SELECT 1 FROM project_members WHERE project_id = p_project_id AND user_id = auth.uid());
$$ LANGUAGE sql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION is_project_owner(p_project_id uuid)
RETURNS boolean AS $$
  SELECT EXISTS (SELECT 1 FROM projects WHERE id = p_project_id AND owner_id = auth.uid());
$$ LANGUAGE sql SECURITY DEFINER;

CREATE POLICY "profiles_select_all" ON profiles FOR SELECT USING (true);
CREATE POLICY "profiles_update_own" ON profiles FOR UPDATE USING (id = auth.uid());

CREATE POLICY "projects_select_public" ON projects FOR SELECT USING (visibility IN ('open', 'closed', 'published') OR owner_id = auth.uid() OR is_project_member(id));
CREATE POLICY "projects_insert_auth" ON projects FOR INSERT WITH CHECK (auth.uid() IS NOT NULL AND owner_id = auth.uid());
CREATE POLICY "projects_update_owner" ON projects FOR UPDATE USING (owner_id = auth.uid());
CREATE POLICY "projects_delete_owner" ON projects FOR DELETE USING (owner_id = auth.uid());

CREATE POLICY "roles_select_member" ON project_roles FOR SELECT USING (is_project_owner(project_id) OR is_project_member(project_id) OR EXISTS (SELECT 1 FROM projects WHERE id = project_id AND visibility IN ('open', 'closed', 'published')));
CREATE POLICY "roles_insert_owner" ON project_roles FOR INSERT WITH CHECK (is_project_owner(project_id));
CREATE POLICY "roles_update_owner" ON project_roles FOR UPDATE USING (is_project_owner(project_id));
CREATE POLICY "roles_delete_owner" ON project_roles FOR DELETE USING (is_project_owner(project_id));

CREATE POLICY "members_select_member" ON project_members FOR SELECT USING (is_project_owner(project_id) OR is_project_member(project_id));
CREATE POLICY "members_insert_owner" ON project_members FOR INSERT WITH CHECK (is_project_owner(project_id));
CREATE POLICY "members_delete_owner" ON project_members FOR DELETE USING (is_project_owner(project_id));

CREATE POLICY "applications_select" ON applications FOR SELECT USING (applicant_id = auth.uid() OR is_project_owner(project_id));
CREATE POLICY "applications_insert_auth" ON applications FOR INSERT WITH CHECK (auth.uid() IS NOT NULL AND applicant_id = auth.uid());
CREATE POLICY "applications_update_owner" ON applications FOR UPDATE USING (is_project_owner(project_id));

CREATE POLICY "chapters_select_member" ON chapters FOR SELECT USING (is_project_owner(project_id) OR is_project_member(project_id));
CREATE POLICY "chapters_insert_member" ON chapters FOR INSERT WITH CHECK (is_project_owner(project_id) OR is_project_member(project_id));
CREATE POLICY "chapters_update_member" ON chapters FOR UPDATE USING (is_project_owner(project_id) OR is_project_member(project_id));
CREATE POLICY "chapters_delete_owner" ON chapters FOR DELETE USING (is_project_owner(project_id));

CREATE POLICY "versions_select_member" ON chapter_versions FOR SELECT USING (EXISTS (SELECT 1 FROM chapters c WHERE c.id = chapter_id AND (is_project_owner(c.project_id) OR is_project_member(c.project_id))));
CREATE POLICY "versions_insert_member" ON chapter_versions FOR INSERT WITH CHECK (author_id = auth.uid() AND EXISTS (SELECT 1 FROM chapters c WHERE c.id = chapter_id AND (is_project_owner(c.project_id) OR is_project_member(c.project_id))));

CREATE POLICY "notifications_select_own" ON notifications FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "notifications_update_own" ON notifications FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "notifications_insert_service" ON notifications FOR INSERT WITH CHECK (true);

CREATE POLICY "brainstorm_select_member" ON brainstorm_notes FOR SELECT USING (is_project_owner(project_id) OR is_project_member(project_id));
CREATE POLICY "brainstorm_insert_member" ON brainstorm_notes FOR INSERT WITH CHECK (auth.uid() = author_id AND (is_project_owner(project_id) OR is_project_member(project_id)));
CREATE POLICY "brainstorm_update_member" ON brainstorm_notes FOR UPDATE USING (is_project_owner(project_id) OR is_project_member(project_id));
CREATE POLICY "brainstorm_delete_author" ON brainstorm_notes FOR DELETE USING (author_id = auth.uid() OR is_project_owner(project_id));

CREATE POLICY "chars_select_member" ON character_profiles FOR SELECT USING (is_project_owner(project_id) OR is_project_member(project_id));
CREATE POLICY "chars_insert_member" ON character_profiles FOR INSERT WITH CHECK (is_project_owner(project_id) OR is_project_member(project_id));
CREATE POLICY "chars_update_member" ON character_profiles FOR UPDATE USING (is_project_owner(project_id) OR is_project_member(project_id));
CREATE POLICY "chars_delete_owner" ON character_profiles FOR DELETE USING (is_project_owner(project_id));

CREATE POLICY "timeline_select_member" ON timeline_events FOR SELECT USING (is_project_owner(project_id) OR is_project_member(project_id));
CREATE POLICY "timeline_insert_member" ON timeline_events FOR INSERT WITH CHECK (is_project_owner(project_id) OR is_project_member(project_id));
CREATE POLICY "timeline_update_member" ON timeline_events FOR UPDATE USING (is_project_owner(project_id) OR is_project_member(project_id));
CREATE POLICY "timeline_delete_owner" ON timeline_events FOR DELETE USING (is_project_owner(project_id));
