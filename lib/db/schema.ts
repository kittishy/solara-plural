import { sql } from 'drizzle-orm';
import { text, integer, sqliteTable, index } from 'drizzle-orm/sqlite-core';

// ─── Systems ────────────────────────────────────────────────────────────────

export const systems = sqliteTable('systems', {
  id:           text('id').primaryKey(),
  name:         text('name').notNull(),
  description:  text('description'),
  email:        text('email').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  createdAt:    integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(strftime('%s', 'now'))`),
  updatedAt:    integer('updated_at', { mode: 'timestamp' }).notNull().default(sql`(strftime('%s', 'now'))`),
});

// ─── Members ─────────────────────────────────────────────────────────────────

export const members = sqliteTable('members', {
  id:          text('id').primaryKey(),
  systemId:    text('system_id').notNull().references(() => systems.id, { onDelete: 'cascade' }),
  name:        text('name').notNull(),
  pronouns:    text('pronouns'),
  avatarUrl:   text('avatar_url'),
  description: text('description'),
  color:       text('color'),
  role:        text('role'),
  tags:        text('tags'),        // JSON array string
  notes:       text('notes'),
  isArchived:  integer('is_archived').notNull().default(0),
  createdAt:   integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(strftime('%s', 'now'))`),
  updatedAt:   integer('updated_at', { mode: 'timestamp' }).notNull().default(sql`(strftime('%s', 'now'))`),
}, (t) => ({
  systemIdx: index('idx_members_system_id').on(t.systemId),
}));

// ─── Front Entries ────────────────────────────────────────────────────────────

export const frontEntries = sqliteTable('front_entries', {
  id:        text('id').primaryKey(),
  systemId:  text('system_id').notNull().references(() => systems.id, { onDelete: 'cascade' }),
  memberIds: text('member_ids').notNull(), // JSON array of member IDs
  startedAt: integer('started_at', { mode: 'timestamp' }).notNull(),
  endedAt:   integer('ended_at', { mode: 'timestamp' }),
  note:      text('note'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(strftime('%s', 'now'))`),
}, (t) => ({
  systemIdx:  index('idx_front_entries_system_id').on(t.systemId),
  endedAtIdx: index('idx_front_entries_ended_at').on(t.endedAt),
}));

// ─── System Notes ─────────────────────────────────────────────────────────────

export const systemNotes = sqliteTable('system_notes', {
  id:        text('id').primaryKey(),
  systemId:  text('system_id').notNull().references(() => systems.id, { onDelete: 'cascade' }),
  memberId:  text('member_id').references(() => members.id, { onDelete: 'set null' }),
  title:     text('title'),
  content:   text('content').notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(strftime('%s', 'now'))`),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().default(sql`(strftime('%s', 'now'))`),
}, (t) => ({
  systemIdx: index('idx_system_notes_system_id').on(t.systemId),
  memberIdx: index('idx_system_notes_member_id').on(t.memberId),
}));

// ─── Inferred Types ──────────────────────────────────────────────────────────

export type System      = typeof systems.$inferSelect;
export type NewSystem   = typeof systems.$inferInsert;
export type Member      = typeof members.$inferSelect;
export type NewMember   = typeof members.$inferInsert;
export type FrontEntry  = typeof frontEntries.$inferSelect;
export type NewFrontEntry = typeof frontEntries.$inferInsert;
export type SystemNote  = typeof systemNotes.$inferSelect;
export type NewSystemNote = typeof systemNotes.$inferInsert;
