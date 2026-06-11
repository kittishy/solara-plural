import { text, integer, timestamp, pgTable, index, uniqueIndex } from 'drizzle-orm/pg-core';

// Systems
export const systems = pgTable('systems', {
  id:           text('id').primaryKey(),
  name:         text('name').notNull(),
  description:  text('description'),
  avatarMode:   text('avatar_mode').notNull().default('emoji'),
  avatarEmoji:  text('avatar_emoji').notNull().default('☀️'),
  avatarUrl:    text('avatar_url'),
  email:        text('email').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  accountType:  text('account_type').notNull().default('system'),
  // Public profile: opt-in and granular. `isPublic` is the master switch; the
  // `publicShow*` flags gate each section independently. `publicSlug` is the
  // shareable handle (/u/<slug>). Everything defaults to private — nothing is
  // ever exposed until the system explicitly turns it on.
  publicSlug:         text('public_slug'),
  isPublic:           integer('is_public').notNull().default(0),
  publicShowBio:      integer('public_show_bio').notNull().default(1),
  publicShowMembers:  integer('public_show_members').notNull().default(0),
  publicShowFront:    integer('public_show_front').notNull().default(0),
  // Admin panel: elevated accounts can reach the /admin area. The env allowlist
  // (ADMIN_EMAILS) is the source of truth for bootstrapping; this flag mirrors
  // grants made from within the panel so access survives env changes.
  isAdmin:      integer('is_admin').notNull().default(0),
  // Moderation: a non-null value means the account is suspended and cannot sign
  // in. The reason is surfaced to the user on the blocked login attempt.
  suspendedAt:     timestamp('suspended_at', { mode: 'date' }),
  suspendedReason: text('suspended_reason'),
  deletionRequestedAt: timestamp('deletion_requested_at', { mode: 'date' }),
  deletionScheduledFor: timestamp('deletion_scheduled_for', { mode: 'date' }),
  createdAt:    timestamp('created_at', { mode: 'date' }).notNull().defaultNow(),
  updatedAt:    timestamp('updated_at', { mode: 'date' }).notNull().defaultNow(),
}, (t) => ({
  publicSlugUnique: uniqueIndex('ux_systems_public_slug').on(t.publicSlug),
}));

// Password reset tokens are stored as hashes only. The raw token is shown once
// through the delivery channel and can never be recovered from the database.
export const passwordResetTokens = pgTable('password_reset_tokens', {
  id:        text('id').primaryKey(),
  systemId:  text('system_id').notNull().references(() => systems.id, { onDelete: 'cascade' }),
  tokenHash: text('token_hash').notNull(),
  expiresAt: timestamp('expires_at', { mode: 'date' }).notNull(),
  usedAt:    timestamp('used_at', { mode: 'date' }),
  createdAt: timestamp('created_at', { mode: 'date' }).notNull().defaultNow(),
}, (t) => ({
  tokenHashUnique: uniqueIndex('ux_password_reset_tokens_hash').on(t.tokenHash),
  systemIdx: index('idx_password_reset_tokens_system_id').on(t.systemId),
  expiresAtIdx: index('idx_password_reset_tokens_expires_at').on(t.expiresAt),
}));

// Durable rate limiting for public auth surfaces (register, password reset).
// Serverless instances don't share memory, so counters live in Postgres; rows
// are upserted atomically and expire by reset_at.
export const rateLimits = pgTable('rate_limits', {
  key:     text('key').primaryKey(),
  count:   integer('count').notNull().default(1),
  resetAt: timestamp('reset_at', { mode: 'date' }).notNull(),
}, (t) => ({
  resetAtIdx: index('idx_rate_limits_reset_at').on(t.resetAt),
}));

// System Friend Requests
export const systemFriendRequests = pgTable('system_friend_requests', {
  id:               text('id').primaryKey(),
  senderSystemId:   text('sender_system_id').notNull().references(() => systems.id, { onDelete: 'cascade' }),
  receiverSystemId: text('receiver_system_id').notNull().references(() => systems.id, { onDelete: 'cascade' }),
  status:           text('status').notNull().default('pending'),
  message:          text('message'),
  createdAt:        timestamp('created_at', { mode: 'date' }).notNull().defaultNow(),
  respondedAt:      timestamp('responded_at', { mode: 'date' }),
}, (t) => ({
  senderIdx: index('idx_friend_requests_sender_system_id').on(t.senderSystemId),
  receiverIdx: index('idx_friend_requests_receiver_system_id').on(t.receiverSystemId),
  statusIdx: index('idx_friend_requests_status').on(t.status),
}));

// Friendships
export const systemFriendships = pgTable('system_friendships', {
  id:        text('id').primaryKey(),
  systemAId: text('system_a_id').notNull().references(() => systems.id, { onDelete: 'cascade' }),
  systemBId: text('system_b_id').notNull().references(() => systems.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at', { mode: 'date' }).notNull().defaultNow(),
}, (t) => ({
  systemAIdx: index('idx_friendships_system_a_id').on(t.systemAId),
  systemBIdx: index('idx_friendships_system_b_id').on(t.systemBId),
  pairUnique: uniqueIndex('ux_friendships_pair').on(t.systemAId, t.systemBId),
}));

// System Partner Requests
export const systemPartnerRequests = pgTable('system_partner_requests', {
  id:               text('id').primaryKey(),
  senderSystemId:   text('sender_system_id').notNull().references(() => systems.id, { onDelete: 'cascade' }),
  receiverSystemId: text('receiver_system_id').notNull().references(() => systems.id, { onDelete: 'cascade' }),
  status:           text('status').notNull().default('pending'),
  message:          text('message'),
  createdAt:        timestamp('created_at', { mode: 'date' }).notNull().defaultNow(),
  respondedAt:      timestamp('responded_at', { mode: 'date' }),
}, (t) => ({
  senderIdx:   index('idx_partner_requests_sender').on(t.senderSystemId),
  receiverIdx: index('idx_partner_requests_receiver').on(t.receiverSystemId),
  statusIdx:   index('idx_partner_requests_status').on(t.status),
}));

// Partnerships
export const systemPartnerships = pgTable('system_partnerships', {
  id:                  text('id').primaryKey(),
  systemAId:           text('system_a_id').notNull().references(() => systems.id, { onDelete: 'cascade' }),
  systemBId:           text('system_b_id').notNull().references(() => systems.id, { onDelete: 'cascade' }),
  relationshipLabel:   text('relationship_label'),
  partneredSince:      timestamp('partnered_since', { mode: 'date' }),
  anniversaryDate:     timestamp('anniversary_date', { mode: 'date' }),
  nicknameForA:        text('nickname_for_a'),
  nicknameForB:        text('nickname_for_b'),
  howWeMet:            text('how_we_met'),
  checkinIntervalDays: integer('checkin_interval_days'),
  lastCheckinAt:       timestamp('last_checkin_at', { mode: 'date' }),
  createdAt:           timestamp('created_at', { mode: 'date' }).notNull().defaultNow(),
}, (t) => ({
  systemAIdx: index('idx_partnerships_system_a').on(t.systemAId),
  systemBIdx: index('idx_partnerships_system_b').on(t.systemBId),
  pairUnique: uniqueIndex('ux_partnerships_pair').on(t.systemAId, t.systemBId),
}));

// Shared diary entries between partners
export const partnershipNotes = pgTable('partnership_notes', {
  id:             text('id').primaryKey(),
  partnershipId:  text('partnership_id').notNull().references(() => systemPartnerships.id, { onDelete: 'cascade' }),
  authorSystemId: text('author_system_id').notNull().references(() => systems.id, { onDelete: 'cascade' }),
  content:        text('content').notNull(),
  mood:           text('mood'),
  createdAt:      timestamp('created_at', { mode: 'date' }).notNull().defaultNow(),
  updatedAt:      timestamp('updated_at', { mode: 'date' }).notNull().defaultNow(),
}, (t) => ({
  partnershipIdx: index('idx_partnership_notes_partnership_id').on(t.partnershipId),
  createdIdx: index('idx_partnership_notes_created_at').on(t.createdAt),
}));

// Alter ↔ alter pairings within a partnership
export const alterPartnerPairings = pgTable('alter_partner_pairings', {
  id:            text('id').primaryKey(),
  partnershipId: text('partnership_id').notNull().references(() => systemPartnerships.id, { onDelete: 'cascade' }),
  memberAId:     text('member_a_id').notNull().references(() => members.id, { onDelete: 'cascade' }),
  memberBId:     text('member_b_id').notNull().references(() => members.id, { onDelete: 'cascade' }),
  label:         text('label'),
  createdAt:     timestamp('created_at', { mode: 'date' }).notNull().defaultNow(),
}, (t) => ({
  partnershipIdx: index('idx_alter_pairings_partnership_id').on(t.partnershipId),
  pairUnique: uniqueIndex('ux_alter_pairings_pair').on(t.partnershipId, t.memberAId, t.memberBId),
}));

// Relationship milestones / memories with dates
export const partnershipMilestones = pgTable('partnership_milestones', {
  id:            text('id').primaryKey(),
  partnershipId: text('partnership_id').notNull().references(() => systemPartnerships.id, { onDelete: 'cascade' }),
  title:         text('title').notNull(),
  description:   text('description'),
  occurredOn:    timestamp('occurred_on', { mode: 'date' }).notNull(),
  createdAt:     timestamp('created_at', { mode: 'date' }).notNull().defaultNow(),
}, (t) => ({
  partnershipIdx: index('idx_partnership_milestones_partnership_id').on(t.partnershipId),
  occurredIdx: index('idx_partnership_milestones_occurred_on').on(t.occurredOn),
}));

// Shared bucket list of things to do together
export const partnershipBucketItems = pgTable('partnership_bucket_items', {
  id:                text('id').primaryKey(),
  partnershipId:     text('partnership_id').notNull().references(() => systemPartnerships.id, { onDelete: 'cascade' }),
  title:             text('title').notNull(),
  note:              text('note'),
  category:          text('category'),
  completedAt:       timestamp('completed_at', { mode: 'date' }),
  createdBySystemId: text('created_by_system_id').notNull().references(() => systems.id, { onDelete: 'cascade' }),
  createdAt:         timestamp('created_at', { mode: 'date' }).notNull().defaultNow(),
  updatedAt:         timestamp('updated_at', { mode: 'date' }).notNull().defaultNow(),
}, (t) => ({
  partnershipIdx: index('idx_bucket_items_partnership_id').on(t.partnershipId),
  completedIdx: index('idx_bucket_items_completed_at').on(t.completedAt),
}));

// System Blocks
export const systemBlocks = pgTable('system_blocks', {
  id:              text('id').primaryKey(),
  blockerSystemId: text('blocker_system_id').notNull().references(() => systems.id, { onDelete: 'cascade' }),
  blockedSystemId: text('blocked_system_id').notNull().references(() => systems.id, { onDelete: 'cascade' }),
  createdAt:       timestamp('created_at', { mode: 'date' }).notNull().defaultNow(),
}, (t) => ({
  blockerIdx: index('idx_system_blocks_blocker_system_id').on(t.blockerSystemId),
  blockedIdx: index('idx_system_blocks_blocked_system_id').on(t.blockedSystemId),
  pairUnique: uniqueIndex('ux_system_blocks_pair').on(t.blockerSystemId, t.blockedSystemId),
}));

// Members
export const members = pgTable('members', {
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
  // Presence status: 'active' (default) | 'dormant' | 'unknown'
  status:      text('status').notNull().default('active'),
  isArchived:  integer('is_archived').notNull().default(0),
  // Per-member opt-in for the public profile. Only honoured when the system's
  // publicShowMembers flag is on — a member is shown publicly only if both the
  // system section toggle and this flag are set.
  isPublic:    integer('is_public').notNull().default(0),
  createdAt:   timestamp('created_at', { mode: 'date' }).notNull().defaultNow(),
  updatedAt:   timestamp('updated_at', { mode: 'date' }).notNull().defaultNow(),
}, (t) => ({
  systemIdx: index('idx_members_system_id').on(t.systemId),
  systemArchivedIdx: index('idx_members_system_archived').on(t.systemId, t.isArchived),
}));

// Member groups (subsystems, functional categories like "Littles", "Protectors").
// Groups are system-scoped and flat — no nesting in this version.
export const memberGroups = pgTable('member_groups', {
  id:          text('id').primaryKey(),
  systemId:    text('system_id').notNull().references(() => systems.id, { onDelete: 'cascade' }),
  name:        text('name').notNull(),
  color:       text('color'),
  description: text('description'),
  createdAt:   timestamp('created_at', { mode: 'date' }).notNull().defaultNow(),
}, (t) => ({
  systemIdx: index('idx_member_groups_system_id').on(t.systemId),
}));

export const memberGroupMembers = pgTable('member_group_members', {
  groupId:  text('group_id').notNull().references(() => memberGroups.id, { onDelete: 'cascade' }),
  memberId: text('member_id').notNull().references(() => members.id, { onDelete: 'cascade' }),
}, (t) => ({
  pk:        uniqueIndex('ux_member_group_members').on(t.groupId, t.memberId),
  memberIdx: index('idx_member_group_members_member_id').on(t.memberId),
}));

// Directed relationships between headmates within the same system.
// fromMemberId "relationshipType" toMemberId — e.g. "protects", "introject of".
export const memberRelationships = pgTable('member_relationships', {
  id:               text('id').primaryKey(),
  systemId:         text('system_id').notNull().references(() => systems.id, { onDelete: 'cascade' }),
  fromMemberId:     text('from_member_id').notNull().references(() => members.id, { onDelete: 'cascade' }),
  toMemberId:       text('to_member_id').notNull().references(() => members.id, { onDelete: 'cascade' }),
  relationshipType: text('relationship_type').notNull(),
  notes:            text('notes'),
  createdAt:        timestamp('created_at', { mode: 'date' }).notNull().defaultNow(),
}, (t) => ({
  systemIdx:  index('idx_member_relationships_system_id').on(t.systemId),
  fromIdx:    index('idx_member_relationships_from_member_id').on(t.fromMemberId),
  toIdx:      index('idx_member_relationships_to_member_id').on(t.toMemberId),
}));

export const customFields = pgTable('custom_fields', {
  id:          text('id').primaryKey(),
  systemId:    text('system_id').notNull().references(() => systems.id, { onDelete: 'cascade' }),
  name:        text('name').notNull(),
  description: text('description'),
  type:        text('type').notNull().default('text'),
  options:     text('options'),
  sortOrder:   integer('sort_order').notNull().default(0),
  createdAt:   timestamp('created_at', { mode: 'date' }).notNull().defaultNow(),
  updatedAt:   timestamp('updated_at', { mode: 'date' }).notNull().defaultNow(),
}, (t) => ({
  systemIdx: index('idx_custom_fields_system_id').on(t.systemId),
  systemSortIdx: index('idx_custom_fields_system_sort').on(t.systemId, t.sortOrder),
}));

export const memberFieldValues = pgTable('member_field_values', {
  id:        text('id').primaryKey(),
  systemId:  text('system_id').notNull().references(() => systems.id, { onDelete: 'cascade' }),
  memberId:  text('member_id').notNull().references(() => members.id, { onDelete: 'cascade' }),
  fieldId:   text('field_id').notNull().references(() => customFields.id, { onDelete: 'cascade' }),
  value:     text('value'),
  createdAt: timestamp('created_at', { mode: 'date' }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { mode: 'date' }).notNull().defaultNow(),
}, (t) => ({
  systemIdx: index('idx_member_field_values_system_id').on(t.systemId),
  memberIdx: index('idx_member_field_values_member_id').on(t.memberId),
  fieldIdx: index('idx_member_field_values_field_id').on(t.fieldId),
  memberFieldUnique: uniqueIndex('ux_member_field_values_member_field').on(t.memberId, t.fieldId),
}));

// External member identity links
export const memberExternalLinks = pgTable('member_external_links', {
  id:                  text('id').primaryKey(),
  systemId:            text('system_id').notNull().references(() => systems.id, { onDelete: 'cascade' }),
  memberId:            text('member_id').notNull().references(() => members.id, { onDelete: 'cascade' }),
  provider:            text('provider').notNull(),
  externalId:          text('external_id').notNull(),
  externalSecondaryId: text('external_secondary_id'),
  externalName:        text('external_name'),
  metadata:            text('metadata'),
  lastSyncedAt:        timestamp('last_synced_at', { mode: 'date' }).notNull(),
  createdAt:           timestamp('created_at', { mode: 'date' }).notNull().defaultNow(),
  updatedAt:           timestamp('updated_at', { mode: 'date' }).notNull().defaultNow(),
}, (t) => ({
  memberIdx: index('idx_member_external_links_member_id').on(t.memberId),
  providerExternalUnique: uniqueIndex('ux_member_external_links_provider_external').on(t.systemId, t.provider, t.externalId),
  providerSecondaryIdx: index('idx_member_external_links_provider_secondary').on(t.systemId, t.provider, t.externalSecondaryId),
  memberProviderUnique: uniqueIndex('ux_member_external_links_member_provider').on(t.systemId, t.memberId, t.provider),
}));

// Stored integration credentials (encrypted server-side)
export const systemIntegrations = pgTable('system_integrations', {
  id:             text('id').primaryKey(),
  systemId:       text('system_id').notNull().references(() => systems.id, { onDelete: 'cascade' }),
  provider:       text('provider').notNull(),
  encryptedToken: text('encrypted_token').notNull(),
  createdAt:      timestamp('created_at', { mode: 'date' }).notNull().defaultNow(),
  updatedAt:      timestamp('updated_at', { mode: 'date' }).notNull().defaultNow(),
}, (t) => ({
  systemProviderUnique: uniqueIndex('ux_system_integrations_system_provider').on(t.systemId, t.provider),
  providerIdx: index('idx_system_integrations_provider').on(t.provider),
}));

// Browser Push API subscriptions for best-effort web notifications.
export const notificationPushTokens = pgTable('notification_push_tokens', {
  id:           text('id').primaryKey(),
  systemId:     text('system_id').notNull().references(() => systems.id, { onDelete: 'cascade' }),
  tokenHash:    text('token_hash').notNull(),
  encryptedToken: text('encrypted_token').notNull(),
  platform:     text('platform').notNull().default('web'),
  userAgent:    text('user_agent'),
  lastSeenAt:   timestamp('last_seen_at', { mode: 'date' }).notNull(),
  revokedAt:    timestamp('revoked_at', { mode: 'date' }),
  createdAt:    timestamp('created_at', { mode: 'date' }).notNull().defaultNow(),
  updatedAt:    timestamp('updated_at', { mode: 'date' }).notNull().defaultNow(),
}, (t) => ({
  systemIdx: index('idx_notification_push_tokens_system_id').on(t.systemId),
  tokenHashUnique: uniqueIndex('ux_notification_push_tokens_system_hash').on(t.systemId, t.tokenHash),
  activeIdx: index('idx_notification_push_tokens_revoked_at').on(t.revokedAt),
}));

// In-app notification center entries. Push is optional; this is the source of truth.
export const notifications = pgTable('notifications', {
  id:                text('id').primaryKey(),
  recipientSystemId: text('recipient_system_id').notNull().references(() => systems.id, { onDelete: 'cascade' }),
  actorSystemId:     text('actor_system_id').references(() => systems.id, { onDelete: 'set null' }),
  type:              text('type').notNull(),
  title:             text('title').notNull(),
  body:              text('body').notNull(),
  data:              text('data'),
  readAt:            timestamp('read_at', { mode: 'date' }),
  createdAt:         timestamp('created_at', { mode: 'date' }).notNull().defaultNow(),
}, (t) => ({
  recipientCreatedIdx: index('idx_notifications_recipient_created').on(t.recipientSystemId, t.createdAt),
  recipientReadIdx: index('idx_notifications_recipient_read').on(t.recipientSystemId, t.readAt),
}));

// Per-token delivery attempts for optional FCM push fanout.
export const notificationDeliveries = pgTable('notification_deliveries', {
  id:             text('id').primaryKey(),
  notificationId: text('notification_id').notNull().references(() => notifications.id, { onDelete: 'cascade' }),
  pushTokenId:    text('push_token_id').notNull().references(() => notificationPushTokens.id, { onDelete: 'cascade' }),
  status:         text('status').notNull(),
  errorCode:      text('error_code'),
  attempts:       integer('attempts').notNull().default(1),
  sentAt:         timestamp('sent_at', { mode: 'date' }),
  createdAt:      timestamp('created_at', { mode: 'date' }).notNull().defaultNow(),
  updatedAt:      timestamp('updated_at', { mode: 'date' }).notNull().defaultNow(),
}, (t) => ({
  notificationIdx: index('idx_notification_deliveries_notification_id').on(t.notificationId),
  pushTokenIdx: index('idx_notification_deliveries_push_token_id').on(t.pushTokenId),
  statusIdx: index('idx_notification_deliveries_status').on(t.status),
}));

// Friend Member Sharing
export const systemFriendMemberShares = pgTable('system_friend_member_shares', {
  id:             text('id').primaryKey(),
  ownerSystemId:  text('owner_system_id').notNull().references(() => systems.id, { onDelete: 'cascade' }),
  friendSystemId: text('friend_system_id').notNull().references(() => systems.id, { onDelete: 'cascade' }),
  memberId:       text('member_id').notNull().references(() => members.id, { onDelete: 'cascade' }),
  visibility:     text('visibility').notNull().default('profile'),
  fieldVisibility: text('field_visibility'),
  createdAt:      timestamp('created_at', { mode: 'date' }).notNull().defaultNow(),
  updatedAt:      timestamp('updated_at', { mode: 'date' }).notNull().defaultNow(),
}, (t) => ({
  ownerFriendIdx: index('idx_friend_member_shares_owner_friend').on(t.ownerSystemId, t.friendSystemId),
  memberIdx: index('idx_friend_member_shares_member_id').on(t.memberId),
  ownerFriendMemberUnique: uniqueIndex('ux_friend_member_shares_owner_friend_member').on(t.ownerSystemId, t.friendSystemId, t.memberId),
}));

// Front Entries
export const frontEntries = pgTable('front_entries', {
  id:        text('id').primaryKey(),
  systemId:  text('system_id').notNull().references(() => systems.id, { onDelete: 'cascade' }),
  memberIds: text('member_ids').notNull(), // JSON array of member IDs
  startedAt: timestamp('started_at', { mode: 'date' }).notNull(),
  endedAt:   timestamp('ended_at', { mode: 'date' }),
  note:      text('note'),
  createdAt: timestamp('created_at', { mode: 'date' }).notNull().defaultNow(),
}, (t) => ({
  systemIdx: index('idx_front_entries_system_id').on(t.systemId),
  endedAtIdx: index('idx_front_entries_ended_at').on(t.endedAt),
  systemEndedIdx: index('idx_front_entries_system_ended').on(t.systemId, t.endedAt),
}));

// System Notes
export const systemNotes = pgTable('system_notes', {
  id:        text('id').primaryKey(),
  systemId:  text('system_id').notNull().references(() => systems.id, { onDelete: 'cascade' }),
  memberId:  text('member_id').references(() => members.id, { onDelete: 'set null' }),
  title:     text('title'),
  content:   text('content').notNull(),
  category:  text('category'),
  isPrivate: integer('is_private').notNull().default(0),
  createdAt: timestamp('created_at', { mode: 'date' }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { mode: 'date' }).notNull().defaultNow(),
}, (t) => ({
  systemIdx: index('idx_system_notes_system_id').on(t.systemId),
  memberIdx: index('idx_system_notes_member_id').on(t.memberId),
  privateIdx: index('idx_system_notes_is_private').on(t.isPrivate),
}));

export const systemJournal = pgTable('system_journal', {
  id:                text('id').primaryKey(),
  systemId:          text('system_id').notNull().references(() => systems.id, { onDelete: 'cascade' }),
  title:             text('title'),
  content:           text('content').notNull(),
  mood:              text('mood'),
  frontingMemberIds: text('fronting_member_ids'),
  isPrivate:         integer('is_private').notNull().default(0),
  createdAt:         timestamp('created_at', { mode: 'date' }).notNull().defaultNow(),
  updatedAt:         timestamp('updated_at', { mode: 'date' }).notNull().defaultNow(),
}, (t) => ({
  systemIdx:  index('idx_system_journal_system_id').on(t.systemId),
  createdIdx: index('idx_system_journal_created_at').on(t.createdAt),
}));

// System Chat Channels — Discord-style channels within a system's chat
export const systemChatChannels = pgTable('system_chat_channels', {
  id:        text('id').primaryKey(),
  systemId:  text('system_id').notNull().references(() => systems.id, { onDelete: 'cascade' }),
  name:      text('name').notNull(),
  sortOrder: integer('sort_order').notNull().default(0),
  createdAt: timestamp('created_at', { mode: 'date' }).notNull().defaultNow(),
}, (t) => ({
  systemIdx: index('idx_system_chat_channels_system_id').on(t.systemId),
  sortIdx:   index('idx_system_chat_channels_sort_order').on(t.sortOrder),
}));

// System Chat Messages — internal alter chat; member details joined at query time
export const systemChatMessages = pgTable('system_chat_messages', {
  id:        text('id').primaryKey(),
  systemId:  text('system_id').notNull().references(() => systems.id, { onDelete: 'cascade' }),
  channelId: text('channel_id'),  // nullable for legacy rows; new messages always set this
  memberId:  text('member_id'),   // nullable — which alter sent it; null = anonymous
  content:   text('content').notNull(),
  createdAt: timestamp('created_at', { mode: 'date' }).notNull().defaultNow(),
}, (t) => ({
  systemIdx:  index('idx_system_chat_messages_system_id').on(t.systemId),
  channelIdx: index('idx_system_chat_messages_channel_id').on(t.channelId),
  createdIdx: index('idx_system_chat_messages_created_at').on(t.createdAt),
}));

// Chat read state — when this account last opened each channel. Unread badges
// are computed as messages newer than last_read_at.
export const chatChannelReads = pgTable('chat_channel_reads', {
  systemId:   text('system_id').notNull().references(() => systems.id, { onDelete: 'cascade' }),
  channelId:  text('channel_id').notNull().references(() => systemChatChannels.id, { onDelete: 'cascade' }),
  lastReadAt: timestamp('last_read_at', { mode: 'date' }).notNull().defaultNow(),
}, (t) => ({
  pk: uniqueIndex('ux_chat_channel_reads').on(t.systemId, t.channelId),
}));

// ---------------------------------------------------------------------------
// Admin panel
// ---------------------------------------------------------------------------

// Global key/value app settings managed from the admin panel. Used for the
// maintenance-mode switch and other operational toggles. Values are JSON
// strings so a single table can hold heterogeneous config.
export const appSettings = pgTable('app_settings', {
  key:          text('key').primaryKey(),
  value:        text('value'),
  updatedBySystemId: text('updated_by_system_id').references(() => systems.id, { onDelete: 'set null' }),
  updatedAt:    timestamp('updated_at', { mode: 'date' }).notNull().defaultNow(),
});

// Broadcast announcements authored by an admin. When `active` is set these can
// be surfaced in-app and (optionally) fanned out as push notifications.
export const adminAnnouncements = pgTable('admin_announcements', {
  id:              text('id').primaryKey(),
  title:           text('title').notNull(),
  body:            text('body').notNull(),
  level:           text('level').notNull().default('info'), // info | warning | critical
  active:          integer('active').notNull().default(1),
  pushedAt:        timestamp('pushed_at', { mode: 'date' }),
  authorSystemId:  text('author_system_id').references(() => systems.id, { onDelete: 'set null' }),
  createdAt:       timestamp('created_at', { mode: 'date' }).notNull().defaultNow(),
  updatedAt:       timestamp('updated_at', { mode: 'date' }).notNull().defaultNow(),
}, (t) => ({
  activeIdx:  index('idx_admin_announcements_active').on(t.active),
  createdIdx: index('idx_admin_announcements_created_at').on(t.createdAt),
}));

// Append-only audit trail of privileged actions taken in the admin panel.
export const adminAuditLog = pgTable('admin_audit_log', {
  id:              text('id').primaryKey(),
  actorSystemId:   text('actor_system_id').references(() => systems.id, { onDelete: 'set null' }),
  actorEmail:      text('actor_email'),
  action:          text('action').notNull(),
  targetType:      text('target_type'),
  targetId:        text('target_id'),
  metadata:        text('metadata'), // JSON string
  createdAt:       timestamp('created_at', { mode: 'date' }).notNull().defaultNow(),
}, (t) => ({
  actorIdx:   index('idx_admin_audit_log_actor').on(t.actorSystemId),
  actionIdx:  index('idx_admin_audit_log_action').on(t.action),
  createdIdx: index('idx_admin_audit_log_created_at').on(t.createdAt),
}));

// Inferred Types
export type AppSetting = typeof appSettings.$inferSelect;
export type NewAppSetting = typeof appSettings.$inferInsert;
export type AdminAnnouncement = typeof adminAnnouncements.$inferSelect;
export type NewAdminAnnouncement = typeof adminAnnouncements.$inferInsert;
export type AdminAuditLogEntry = typeof adminAuditLog.$inferSelect;
export type NewAdminAuditLogEntry = typeof adminAuditLog.$inferInsert;
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
export type MemberGroup = typeof memberGroups.$inferSelect;
export type NewMemberGroup = typeof memberGroups.$inferInsert;
export type MemberGroupMember = typeof memberGroupMembers.$inferSelect;
export type NewMemberGroupMember = typeof memberGroupMembers.$inferInsert;
export type MemberRelationship = typeof memberRelationships.$inferSelect;
export type NewMemberRelationship = typeof memberRelationships.$inferInsert;
