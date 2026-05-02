import { sql } from 'drizzle-orm';
import { text, integer, sqliteTable, index, uniqueIndex } from 'drizzle-orm/sqlite-core';

// Systems
export const systems = sqliteTable('systems', {
  id:           text('id').primaryKey(),
  name:         text('name').notNull(),
  description:  text('description'),
  avatarMode:   text('avatar_mode').notNull().default('emoji'),
  avatarEmoji:  text('avatar_emoji').notNull().default('☀️'),
  avatarUrl:    text('avatar_url'),
  email:        text('email').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  accountType:  text('account_type').notNull().default('system'),
  deletionRequestedAt: integer('deletion_requested_at', { mode: 'timestamp' }),
  deletionScheduledFor: integer('deletion_scheduled_for', { mode: 'timestamp' }),
  createdAt:    integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(strftime('%s', 'now'))`),
  updatedAt:    integer('updated_at', { mode: 'timestamp' }).notNull().default(sql`(strftime('%s', 'now'))`),
});

// System Friend Requests
export const systemFriendRequests = sqliteTable('system_friend_requests', {
  id:               text('id').primaryKey(),
  senderSystemId:   text('sender_system_id').notNull().references(() => systems.id, { onDelete: 'cascade' }),
  receiverSystemId: text('receiver_system_id').notNull().references(() => systems.id, { onDelete: 'cascade' }),
  status:           text('status').notNull().default('pending'),
  message:          text('message'),
  createdAt:        integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(strftime('%s', 'now'))`),
  respondedAt:      integer('responded_at', { mode: 'timestamp' }),
}, (t) => ({
  senderIdx: index('idx_friend_requests_sender_system_id').on(t.senderSystemId),
  receiverIdx: index('idx_friend_requests_receiver_system_id').on(t.receiverSystemId),
  statusIdx: index('idx_friend_requests_status').on(t.status),
}));

// Friendships
export const systemFriendships = sqliteTable('system_friendships', {
  id:        text('id').primaryKey(),
  systemAId: text('system_a_id').notNull().references(() => systems.id, { onDelete: 'cascade' }),
  systemBId: text('system_b_id').notNull().references(() => systems.id, { onDelete: 'cascade' }),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(strftime('%s', 'now'))`),
}, (t) => ({
  systemAIdx: index('idx_friendships_system_a_id').on(t.systemAId),
  systemBIdx: index('idx_friendships_system_b_id').on(t.systemBId),
  pairUnique: uniqueIndex('ux_friendships_pair').on(t.systemAId, t.systemBId),
}));

// System Blocks
export const systemBlocks = sqliteTable('system_blocks', {
  id:              text('id').primaryKey(),
  blockerSystemId: text('blocker_system_id').notNull().references(() => systems.id, { onDelete: 'cascade' }),
  blockedSystemId: text('blocked_system_id').notNull().references(() => systems.id, { onDelete: 'cascade' }),
  createdAt:       integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(strftime('%s', 'now'))`),
}, (t) => ({
  blockerIdx: index('idx_system_blocks_blocker_system_id').on(t.blockerSystemId),
  blockedIdx: index('idx_system_blocks_blocked_system_id').on(t.blockedSystemId),
  pairUnique: uniqueIndex('ux_system_blocks_pair').on(t.blockerSystemId, t.blockedSystemId),
}));

// Members
export const members = sqliteTable('members', {
  id:          text('id').primaryKey(),
  systemId:    text('system_id').notNull().references(() => systems.id, { onDelete: 'cascade' }),
  name:        text('name').notNull(),
  pronouns:    text('pronouns'),
  avatarUrl:   text('avatar_url'),
  description: text('description'),
  color:       text('color'),
  role:        text('role'),
  tags:        text('tags'), // JSON array string
  notes:       text('notes'),
  isArchived:  integer('is_archived').notNull().default(0),
  createdAt:   integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(strftime('%s', 'now'))`),
  updatedAt:   integer('updated_at', { mode: 'timestamp' }).notNull().default(sql`(strftime('%s', 'now'))`),
}, (t) => ({
  systemIdx: index('idx_members_system_id').on(t.systemId),
}));

// External member identity links
export const memberExternalLinks = sqliteTable('member_external_links', {
  id:                  text('id').primaryKey(),
  systemId:            text('system_id').notNull().references(() => systems.id, { onDelete: 'cascade' }),
  memberId:            text('member_id').notNull().references(() => members.id, { onDelete: 'cascade' }),
  provider:            text('provider').notNull(),
  externalId:          text('external_id').notNull(),
  externalSecondaryId: text('external_secondary_id'),
  externalName:        text('external_name'),
  metadata:            text('metadata'),
  lastSyncedAt:        integer('last_synced_at', { mode: 'timestamp' }).notNull(),
  createdAt:           integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(strftime('%s', 'now'))`),
  updatedAt:           integer('updated_at', { mode: 'timestamp' }).notNull().default(sql`(strftime('%s', 'now'))`),
}, (t) => ({
  memberIdx: index('idx_member_external_links_member_id').on(t.memberId),
  providerExternalUnique: uniqueIndex('ux_member_external_links_provider_external').on(t.systemId, t.provider, t.externalId),
  providerSecondaryIdx: index('idx_member_external_links_provider_secondary').on(t.systemId, t.provider, t.externalSecondaryId),
  memberProviderUnique: uniqueIndex('ux_member_external_links_member_provider').on(t.systemId, t.memberId, t.provider),
}));

// Friend Member Sharing
export const systemFriendMemberShares = sqliteTable('system_friend_member_shares', {
  id:             text('id').primaryKey(),
  ownerSystemId:  text('owner_system_id').notNull().references(() => systems.id, { onDelete: 'cascade' }),
  friendSystemId: text('friend_system_id').notNull().references(() => systems.id, { onDelete: 'cascade' }),
  memberId:       text('member_id').notNull().references(() => members.id, { onDelete: 'cascade' }),
  visibility:     text('visibility').notNull().default('profile'),
  fieldVisibility: text('field_visibility'),
  createdAt:      integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(strftime('%s', 'now'))`),
  updatedAt:      integer('updated_at', { mode: 'timestamp' }).notNull().default(sql`(strftime('%s', 'now'))`),
}, (t) => ({
  ownerFriendIdx: index('idx_friend_member_shares_owner_friend').on(t.ownerSystemId, t.friendSystemId),
  memberIdx: index('idx_friend_member_shares_member_id').on(t.memberId),
  ownerFriendMemberUnique: uniqueIndex('ux_friend_member_shares_owner_friend_member').on(t.ownerSystemId, t.friendSystemId, t.memberId),
}));

// Front Entries
export const frontEntries = sqliteTable('front_entries', {
  id:        text('id').primaryKey(),
  systemId:  text('system_id').notNull().references(() => systems.id, { onDelete: 'cascade' }),
  memberIds: text('member_ids').notNull(), // JSON array of member IDs
  startedAt: integer('started_at', { mode: 'timestamp' }).notNull(),
  endedAt:   integer('ended_at', { mode: 'timestamp' }),
  note:      text('note'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(strftime('%s', 'now'))`),
}, (t) => ({
  systemIdx: index('idx_front_entries_system_id').on(t.systemId),
  endedAtIdx: index('idx_front_entries_ended_at').on(t.endedAt),
}));

// System Notes
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

// Inferred Types
export type System = typeof systems.$inferSelect;
export type NewSystem = typeof systems.$inferInsert;
export type SystemFriendRequest = typeof systemFriendRequests.$inferSelect;
export type NewSystemFriendRequest = typeof systemFriendRequests.$inferInsert;
export type SystemFriendship = typeof systemFriendships.$inferSelect;
export type NewSystemFriendship = typeof systemFriendships.$inferInsert;
export type SystemBlock = typeof systemBlocks.$inferSelect;
export type NewSystemBlock = typeof systemBlocks.$inferInsert;
export type Member = typeof members.$inferSelect;
export type NewMember = typeof members.$inferInsert;
export type MemberExternalLink = typeof memberExternalLinks.$inferSelect;
export type NewMemberExternalLink = typeof memberExternalLinks.$inferInsert;
export type SystemFriendMemberShare = typeof systemFriendMemberShares.$inferSelect;
export type NewSystemFriendMemberShare = typeof systemFriendMemberShares.$inferInsert;
export type FrontEntry = typeof frontEntries.$inferSelect;
export type NewFrontEntry = typeof frontEntries.$inferInsert;
export type SystemNote = typeof systemNotes.$inferSelect;
export type NewSystemNote = typeof systemNotes.$inferInsert;
