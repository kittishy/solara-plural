-- Migration 0003: Internal organization — member status, groups, relationships
-- Apply to production Supabase before deploying code that references these columns/tables.

-- 1. Member presence status
ALTER TABLE members ADD COLUMN status TEXT NOT NULL DEFAULT 'active';

-- 2. Member groups (subsystems, functional categories)
CREATE TABLE member_groups (
  id          TEXT PRIMARY KEY NOT NULL,
  system_id   TEXT NOT NULL REFERENCES systems(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  color       TEXT,
  description TEXT,
  created_at  TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_member_groups_system_id ON member_groups(system_id);

CREATE TABLE member_group_members (
  group_id  TEXT NOT NULL REFERENCES member_groups(id) ON DELETE CASCADE,
  member_id TEXT NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  PRIMARY KEY (group_id, member_id)
);

CREATE INDEX idx_member_group_members_member_id ON member_group_members(member_id);

-- 3. Directed relationships between headmates
CREATE TABLE member_relationships (
  id                TEXT PRIMARY KEY NOT NULL,
  system_id         TEXT NOT NULL REFERENCES systems(id) ON DELETE CASCADE,
  from_member_id    TEXT NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  to_member_id      TEXT NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  relationship_type TEXT NOT NULL,
  notes             TEXT,
  created_at        TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_member_relationships_system_id      ON member_relationships(system_id);
CREATE INDEX idx_member_relationships_from_member_id ON member_relationships(from_member_id);
CREATE INDEX idx_member_relationships_to_member_id   ON member_relationships(to_member_id);
