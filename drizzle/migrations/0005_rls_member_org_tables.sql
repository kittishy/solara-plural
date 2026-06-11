-- Lock down member organization tables in Supabase public schema.
-- The app connects as solara_app and enforces per-system authorization in server routes.

ALTER TABLE member_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE member_group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE member_relationships ENABLE ROW LEVEL SECURITY;

CREATE POLICY solara_app_all ON member_groups
  FOR ALL TO solara_app
  USING (true)
  WITH CHECK (true);

CREATE POLICY solara_app_all ON member_group_members
  FOR ALL TO solara_app
  USING (true)
  WITH CHECK (true);

CREATE POLICY solara_app_all ON member_relationships
  FOR ALL TO solara_app
  USING (true)
  WITH CHECK (true);
