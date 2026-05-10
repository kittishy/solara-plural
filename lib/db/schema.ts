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

// System Partner Requests
export const systemPartnerRequests = sqliteTable('system_partner_requests', {
  id:               text('id').primaryKey(),
  senderSystemId:   text('sender_system_id').notNull().references(() => systems.id, { onDelete: 'cascade' }),
  receiverSystemId: text('receiver_system_id').notNull().references(() => systems.id, { onDelete: 'cascade' }),
  status:           text('status').notNull().default('pending'),
  message:          text('message'),
  createdAt:        integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(strftime('%s', 'now'))`),
  respondedAt:      integer('responded_at', { mode: 'timestamp' }),
}, (t) => ({
  senderIdx:   index('idx_partner_requests_sender').on(t.senderSystemId),
  receiverIdx: index('idx_partner_requests_receiver').on(t.receiverSystemId),
  statusIdx:   index('idx_partner_requests_status').on(t.status),
}));

// Partnerships
export const systemPartnerships = sqliteTable('system_partnerships', {
  id:                text('id').primaryKey(),
  systemAId:         text('system_a_id').notNull().references(() => systems.id, { onDelete: 'cascade' }),
  systemBId:         text('system_b_id').notNull().references(() => systems.id, { onDelete: 'cascade' }),
  relationshipLabel: text('relationship_label'),
  partneredSince:    integer('partnered_since', { mode: 'timestamp' }),
  createdAt:         integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(strftime('%s', 'now'))`),
}, (t) => ({
  systemAIdx: index('idx_partnerships_system_a').on(t.systemAId),
  systemBIdx: index('idx_partnerships_system_b').on(t.systemBId),
  pairUnique: uniqueIndex('ux_partnerships_pair').on(t.systemAId, t.systemBId),
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

// Stored integration credentials (encrypted server-side)
export const systemIntegrations = sqliteTable('system_integrations', {
  id:             text('id').primaryKey(),
  systemId:       text('system_id').notNull().references(() => systems.id, { onDelete: 'cascade' }),
  provider:       text('provider').notNull(),
  encryptedToken: text('encrypted_token').notNull(),
  createdAt:      integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(strftime('%s', 'now'))`),
  updatedAt:      integer('updated_at', { mode: 'timestamp' }).notNull().default(sql`(strftime('%s', 'now'))`),
}, (t) => ({
  systemProviderUnique: uniqueIndex('ux_system_integrations_system_provider').on(t.systemId, t.provider),
  providerIdx: index('idx_system_integrations_provider').on(t.provider),
}));

// Browser Push API subscriptions for best-effort web notifications.
export const notificationPushTokens = sqliteTable('notification_push_tokens', {
  id:           text('id').primaryKey(),
  systemId:     text('system_id').notNull().references(() => systems.id, { onDelete: 'cascade' }),
  tokenHash:    text('token_hash').notNull(),
  encryptedToken: text('encrypted_token').notNull(),
  platform:     text('platform').notNull().default('web'),
  userAgent:    text('user_agent'),
  lastSeenAt:   integer('last_seen_at', { mode: 'timestamp' }).notNull(),
  revokedAt:    integer('revoked_at', { mode: 'timestamp' }),
  createdAt:    integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(strftime('%s', 'now'))`),
  updatedAt:    integer('updated_at', { mode: 'timestamp' }).notNull().default(sql`(strftime('%s', 'now'))`),
}, (t) => ({
  systemIdx: index('idx_notification_push_tokens_system_id').on(t.systemId),
  tokenHashUnique: uniqueIndex('ux_notification_push_tokens_system_hash').on(t.systemId, t.tokenHash),
  activeIdx: index('idx_notification_push_tokens_revoked_at').on(t.revokedAt),
}));

// In-app notification center entries. Push is optional; this is the source of truth.
export const notifications = sqliteTable('notifications', {
  id:                text('id').primaryKey(),
  recipientSystemId: text('recipient_system_id').notNull().references(() => systems.id, { onDelete: 'cascade' }),
  actorSystemId:     text('actor_system_id').references(() => systems.id, { onDelete: 'set null' }),
  type:              text('type').notNull(),
  title:             text('title').notNull(),
  body:              text('body').notNull(),
  data:              text('data'),
  readAt:            integer('read_at', { mode: 'timestamp' }),
  createdAt:         integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(strftime('%s', 'now'))`),
}, (t) => ({
  recipientCreatedIdx: index('idx_notifications_recipient_created').on(t.recipientSystemId, t.createdAt),
  recipientReadIdx: index('idx_notifications_recipient_read').on(t.recipientSystemId, t.readAt),
}));

// Per-token delivery attempts for optional FCM push fanout.
export const notificationDeliveries = sqliteTable('notification_deliveries', {
  id:             text('id').primaryKey(),
  notificationId: text('notification_id').notNull().references(() => notifications.id, { onDelete: 'cascade' }),
  pushTokenId:    text('push_token_id').notNull().references(() => notificationPushTokens.id, { onDelete: 'cascade' }),
  status:         text('status').notNull(),
  errorCode:      text('error_code'),
  attempts:       integer('attempts').notNull().default(1),
  sentAt:         integer('sent_at', { mode: 'timestamp' }),
  createdAt:      integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(strftime('%s', 'now'))`),
  updatedAt:      integer('updated_at', { mode: 'timestamp' }).notNull().default(sql`(strftime('%s', 'now'))`),
}, (t) => ({
  notificationIdx: index('idx_notification_deliveries_notification_id').on(t.notificationId),
  pushTokenIdx: index('idx_notification_deliveries_push_token_id').on(t.pushTokenId),
  statusIdx: index('idx_notification_deliveries_status').on(t.status),
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
export type SystemIntegration = typeof systemIntegrations.$inferSelect;
export type NewSystemIntegration = typeof systemIntegrations.$inferInsert;
export type NotificationPushToken = typeof notificationPushTokens.$inferSelect;
export type NewNotificationPushToken = typeof notificationPushTokens.$inferInsert;
export type Notification = typeof notifications.$inferSelect;
export type NewNotification = typeof notifications.$inferInsert;
export type NotificationDelivery = typeof notificationDeliveries.$inferSelect;
export type NewNotificationDelivery = typeof notificationDeliveries.$inferInsert;
export type SystemFriendMemberShare = typeof systemFriendMemberShares.$inferSelect;
export type NewSystemFriendMemberShare = typeof systemFriendMemberShares.$inferInsert;
export type FrontEntry = typeof frontEntries.$inferSelect;
export type NewFrontEntry = typeof frontEntries.$inferInsert;
export type SystemNote = typeof systemNotes.$inferSelect;
export type NewSystemNote = typeof systemNotes.$inferInsert;
export type SystemPartnerRequest = typeof systemPartnerRequests.$inferSelect;
export type NewSystemPartnerRequest = typeof systemPartnerRequests.$inferInsert;
export type SystemPartnership = typeof systemPartnerships.$inferSelect;
export type NewSystemPartnership = typeof systemPartnerships.$inferInsert;
