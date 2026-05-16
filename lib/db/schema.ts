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

// Password reset tokens are stored as hashes only. The raw token is shown once
// through the delivery channel and can never be recovered from the database.
export const passwordResetTokens = sqliteTable('password_reset_tokens', {
  id:        text('id').primaryKey(),
  systemId:  text('system_id').notNull().references(() => systems.id, { onDelete: 'cascade' }),
  tokenHash: text('token_hash').notNull(),
  expiresAt: integer('expires_at', { mode: 'timestamp' }).notNull(),
  usedAt:    integer('used_at', { mode: 'timestamp' }),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(strftime('%s', 'now'))`),
}, (t) => ({
  tokenHashUnique: uniqueIndex('ux_password_reset_tokens_hash').on(t.tokenHash),
  systemIdx: index('idx_password_reset_tokens_system_id').on(t.systemId),
  expiresAtIdx: index('idx_password_reset_tokens_expires_at').on(t.expiresAt),
}));

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
  id:                  text('id').primaryKey(),
  systemAId:           text('system_a_id').notNull().references(() => systems.id, { onDelete: 'cascade' }),
  systemBId:           text('system_b_id').notNull().references(() => systems.id, { onDelete: 'cascade' }),
  relationshipLabel:   text('relationship_label'),
  partneredSince:      integer('partnered_since', { mode: 'timestamp' }),
  anniversaryDate:     integer('anniversary_date', { mode: 'timestamp' }),
  nicknameForA:        text('nickname_for_a'),
  nicknameForB:        text('nickname_for_b'),
  howWeMet:            text('how_we_met'),
  checkinIntervalDays: integer('checkin_interval_days'),
  lastCheckinAt:       integer('last_checkin_at', { mode: 'timestamp' }),
  createdAt:           integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(strftime('%s', 'now'))`),
}, (t) => ({
  systemAIdx: index('idx_partnerships_system_a').on(t.systemAId),
  systemBIdx: index('idx_partnerships_system_b').on(t.systemBId),
  pairUnique: uniqueIndex('ux_partnerships_pair').on(t.systemAId, t.systemBId),
}));

// Shared diary entries between partners
export const partnershipNotes = sqliteTable('partnership_notes', {
  id:             text('id').primaryKey(),
  partnershipId:  text('partnership_id').notNull().references(() => systemPartnerships.id, { onDelete: 'cascade' }),
  authorSystemId: text('author_system_id').notNull().references(() => systems.id, { onDelete: 'cascade' }),
  content:        text('content').notNull(),
  mood:           text('mood'),
  createdAt:      integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(strftime('%s', 'now'))`),
  updatedAt:      integer('updated_at', { mode: 'timestamp' }).notNull().default(sql`(strftime('%s', 'now'))`),
}, (t) => ({
  partnershipIdx: index('idx_partnership_notes_partnership_id').on(t.partnershipId),
  createdIdx: index('idx_partnership_notes_created_at').on(t.createdAt),
}));

// Alter ↔ alter pairings within a partnership
export const alterPartnerPairings = sqliteTable('alter_partner_pairings', {
  id:            text('id').primaryKey(),
  partnershipId: text('partnership_id').notNull().references(() => systemPartnerships.id, { onDelete: 'cascade' }),
  memberAId:     text('member_a_id').notNull().references(() => members.id, { onDelete: 'cascade' }),
  memberBId:     text('member_b_id').notNull().references(() => members.id, { onDelete: 'cascade' }),
  label:         text('label'),
  createdAt:     integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(strftime('%s', 'now'))`),
}, (t) => ({
  partnershipIdx: index('idx_alter_pairings_partnership_id').on(t.partnershipId),
  pairUnique: uniqueIndex('ux_alter_pairings_pair').on(t.partnershipId, t.memberAId, t.memberBId),
}));

// Relationship milestones / memories with dates
export const partnershipMilestones = sqliteTable('partnership_milestones', {
  id:            text('id').primaryKey(),
  partnershipId: text('partnership_id').notNull().references(() => systemPartnerships.id, { onDelete: 'cascade' }),
  title:         text('title').notNull(),
  description:   text('description'),
  occurredOn:    integer('occurred_on', { mode: 'timestamp' }).notNull(),
  createdAt:     integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(strftime('%s', 'now'))`),
}, (t) => ({
  partnershipIdx: index('idx_partnership_milestones_partnership_id').on(t.partnershipId),
  occurredIdx: index('idx_partnership_milestones_occurred_on').on(t.occurredOn),
}));

// Shared bucket list of things to do together
export const partnershipBucketItems = sqliteTable('partnership_bucket_items', {
  id:                text('id').primaryKey(),
  partnershipId:     text('partnership_id').notNull().references(() => systemPartnerships.id, { onDelete: 'cascade' }),
  title:             text('title').notNull(),
  note:              text('note'),
  category:          text('category'),
  completedAt:       integer('completed_at', { mode: 'timestamp' }),
  createdBySystemId: text('created_by_system_id').notNull().references(() => systems.id, { onDelete: 'cascade' }),
  createdAt:         integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(strftime('%s', 'now'))`),
  updatedAt:         integer('updated_at', { mode: 'timestamp' }).notNull().default(sql`(strftime('%s', 'now'))`),
}, (t) => ({
  partnershipIdx: index('idx_bucket_items_partnership_id').on(t.partnershipId),
  completedIdx: index('idx_bucket_items_completed_at').on(t.completedAt),
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

export const customFields = sqliteTable('custom_fields', {
  id:          text('id').primaryKey(),
  systemId:    text('system_id').notNull().references(() => systems.id, { onDelete: 'cascade' }),
  name:        text('name').notNull(),
  description: text('description'),
  type:        text('type').notNull().default('text'),
  options:     text('options'),
  sortOrder:   integer('sort_order').notNull().default(0),
  createdAt:   integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(strftime('%s', 'now'))`),
  updatedAt:   integer('updated_at', { mode: 'timestamp' }).notNull().default(sql`(strftime('%s', 'now'))`),
}, (t) => ({
  systemIdx: index('idx_custom_fields_system_id').on(t.systemId),
  systemSortIdx: index('idx_custom_fields_system_sort').on(t.systemId, t.sortOrder),
}));

export const memberFieldValues = sqliteTable('member_field_values', {
  id:        text('id').primaryKey(),
  systemId:  text('system_id').notNull().references(() => systems.id, { onDelete: 'cascade' }),
  memberId:  text('member_id').notNull().references(() => members.id, { onDelete: 'cascade' }),
  fieldId:   text('field_id').notNull().references(() => customFields.id, { onDelete: 'cascade' }),
  value:     text('value'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(strftime('%s', 'now'))`),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().default(sql`(strftime('%s', 'now'))`),
}, (t) => ({
  systemIdx: index('idx_member_field_values_system_id').on(t.systemId),
  memberIdx: index('idx_member_field_values_member_id').on(t.memberId),
  fieldIdx: index('idx_member_field_values_field_id').on(t.fieldId),
  memberFieldUnique: uniqueIndex('ux_member_field_values_member_field').on(t.memberId, t.fieldId),
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
  category:  text('category'),
  isPrivate: integer('is_private').notNull().default(0),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(strftime('%s', 'now'))`),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().default(sql`(strftime('%s', 'now'))`),
}, (t) => ({
  systemIdx: index('idx_system_notes_system_id').on(t.systemId),
  memberIdx: index('idx_system_notes_member_id').on(t.memberId),
  privateIdx: index('idx_system_notes_is_private').on(t.isPrivate),
}));

export const systemJournal = sqliteTable('system_journal', {
  id:                text('id').primaryKey(),
  systemId:          text('system_id').notNull().references(() => systems.id, { onDelete: 'cascade' }),
  title:             text('title'),
  content:           text('content').notNull(),
  mood:              text('mood'),
  frontingMemberIds: text('fronting_member_ids'),
  isPrivate:         integer('is_private').notNull().default(0),
  createdAt:         integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(strftime('%s', 'now'))`),
  updatedAt:         integer('updated_at', { mode: 'timestamp' }).notNull().default(sql`(strftime('%s', 'now'))`),
}, (t) => ({
  systemIdx:  index('idx_system_journal_system_id').on(t.systemId),
  createdIdx: index('idx_system_journal_created_at').on(t.createdAt),
}));

// System Chat Channels — Discord-style channels within a system's chat
export const systemChatChannels = sqliteTable('system_chat_channels', {
  id:        text('id').primaryKey(),
  systemId:  text('system_id').notNull().references(() => systems.id, { onDelete: 'cascade' }),
  name:      text('name').notNull(),
  sortOrder: integer('sort_order').notNull().default(0),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(strftime('%s', 'now'))`),
}, (t) => ({
  systemIdx: index('idx_system_chat_channels_system_id').on(t.systemId),
  sortIdx:   index('idx_system_chat_channels_sort_order').on(t.sortOrder),
}));

// System Chat Messages — internal alter chat; member details joined at query time
export const systemChatMessages = sqliteTable('system_chat_messages', {
  id:        text('id').primaryKey(),
  systemId:  text('system_id').notNull().references(() => systems.id, { onDelete: 'cascade' }),
  channelId: text('channel_id'),  // nullable for legacy rows; new messages always set this
  memberId:  text('member_id'),   // nullable — which alter sent it; null = anonymous
  content:   text('content').notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(strftime('%s', 'now'))`),
}, (t) => ({
  systemIdx:  index('idx_system_chat_messages_system_id').on(t.systemId),
  channelIdx: index('idx_system_chat_messages_channel_id').on(t.channelId),
  createdIdx: index('idx_system_chat_messages_created_at').on(t.createdAt),
}));

// Inferred Types
export type SystemChatChannel = typeof systemChatChannels.$inferSelect;
export type NewSystemChatChannel = typeof systemChatChannels.$inferInsert;
export type SystemChatMessage = typeof systemChatMessages.$inferSelect;
export type NewSystemChatMessage = typeof systemChatMessages.$inferInsert;
export type SystemJournalEntry = typeof systemJournal.$inferSelect;
export type NewSystemJournalEntry = typeof systemJournal.$inferInsert;
export type System = typeof systems.$inferSelect;
export type NewSystem = typeof systems.$inferInsert;
export type PasswordResetToken = typeof passwordResetTokens.$inferSelect;
export type NewPasswordResetToken = typeof passwordResetTokens.$inferInsert;
export type SystemFriendRequest = typeof systemFriendRequests.$inferSelect;
export type NewSystemFriendRequest = typeof systemFriendRequests.$inferInsert;
export type SystemFriendship = typeof systemFriendships.$inferSelect;
export type NewSystemFriendship = typeof systemFriendships.$inferInsert;
export type SystemBlock = typeof systemBlocks.$inferSelect;
export type NewSystemBlock = typeof systemBlocks.$inferInsert;
export type Member = typeof members.$inferSelect;
export type NewMember = typeof members.$inferInsert;
export type CustomField = typeof customFields.$inferSelect;
export type NewCustomField = typeof customFields.$inferInsert;
export type MemberFieldValue = typeof memberFieldValues.$inferSelect;
export type NewMemberFieldValue = typeof memberFieldValues.$inferInsert;
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
export type PartnershipNote = typeof partnershipNotes.$inferSelect;
export type NewPartnershipNote = typeof partnershipNotes.$inferInsert;
export type AlterPartnerPairing = typeof alterPartnerPairings.$inferSelect;
export type NewAlterPartnerPairing = typeof alterPartnerPairings.$inferInsert;
export type PartnershipMilestone = typeof partnershipMilestones.$inferSelect;
export type NewPartnershipMilestone = typeof partnershipMilestones.$inferInsert;
export type PartnershipBucketItem = typeof partnershipBucketItems.$inferSelect;
export type NewPartnershipBucketItem = typeof partnershipBucketItems.$inferInsert;
