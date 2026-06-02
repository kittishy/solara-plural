CREATE TABLE "alter_partner_pairings" (
	"id" text PRIMARY KEY NOT NULL,
	"partnership_id" text NOT NULL,
	"member_a_id" text NOT NULL,
	"member_b_id" text NOT NULL,
	"label" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "custom_fields" (
	"id" text PRIMARY KEY NOT NULL,
	"system_id" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"type" text DEFAULT 'text' NOT NULL,
	"options" text,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "front_entries" (
	"id" text PRIMARY KEY NOT NULL,
	"system_id" text NOT NULL,
	"member_ids" text NOT NULL,
	"started_at" timestamp NOT NULL,
	"ended_at" timestamp,
	"note" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "member_external_links" (
	"id" text PRIMARY KEY NOT NULL,
	"system_id" text NOT NULL,
	"member_id" text NOT NULL,
	"provider" text NOT NULL,
	"external_id" text NOT NULL,
	"external_secondary_id" text,
	"external_name" text,
	"metadata" text,
	"last_synced_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "member_field_values" (
	"id" text PRIMARY KEY NOT NULL,
	"system_id" text NOT NULL,
	"member_id" text NOT NULL,
	"field_id" text NOT NULL,
	"value" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "members" (
	"id" text PRIMARY KEY NOT NULL,
	"system_id" text NOT NULL,
	"name" text NOT NULL,
	"pronouns" text,
	"avatar_url" text,
	"description" text,
	"color" text,
	"role" text,
	"tags" text,
	"notes" text,
	"is_archived" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notification_deliveries" (
	"id" text PRIMARY KEY NOT NULL,
	"notification_id" text NOT NULL,
	"push_token_id" text NOT NULL,
	"status" text NOT NULL,
	"error_code" text,
	"attempts" integer DEFAULT 1 NOT NULL,
	"sent_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notification_push_tokens" (
	"id" text PRIMARY KEY NOT NULL,
	"system_id" text NOT NULL,
	"token_hash" text NOT NULL,
	"encrypted_token" text NOT NULL,
	"platform" text DEFAULT 'web' NOT NULL,
	"user_agent" text,
	"last_seen_at" timestamp NOT NULL,
	"revoked_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" text PRIMARY KEY NOT NULL,
	"recipient_system_id" text NOT NULL,
	"actor_system_id" text,
	"type" text NOT NULL,
	"title" text NOT NULL,
	"body" text NOT NULL,
	"data" text,
	"read_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "partnership_bucket_items" (
	"id" text PRIMARY KEY NOT NULL,
	"partnership_id" text NOT NULL,
	"title" text NOT NULL,
	"note" text,
	"category" text,
	"completed_at" timestamp,
	"created_by_system_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "partnership_milestones" (
	"id" text PRIMARY KEY NOT NULL,
	"partnership_id" text NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"occurred_on" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "partnership_notes" (
	"id" text PRIMARY KEY NOT NULL,
	"partnership_id" text NOT NULL,
	"author_system_id" text NOT NULL,
	"content" text NOT NULL,
	"mood" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "password_reset_tokens" (
	"id" text PRIMARY KEY NOT NULL,
	"system_id" text NOT NULL,
	"token_hash" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"used_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "system_blocks" (
	"id" text PRIMARY KEY NOT NULL,
	"blocker_system_id" text NOT NULL,
	"blocked_system_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "system_chat_channels" (
	"id" text PRIMARY KEY NOT NULL,
	"system_id" text NOT NULL,
	"name" text NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "system_chat_messages" (
	"id" text PRIMARY KEY NOT NULL,
	"system_id" text NOT NULL,
	"channel_id" text,
	"member_id" text,
	"content" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "system_friend_member_shares" (
	"id" text PRIMARY KEY NOT NULL,
	"owner_system_id" text NOT NULL,
	"friend_system_id" text NOT NULL,
	"member_id" text NOT NULL,
	"visibility" text DEFAULT 'profile' NOT NULL,
	"field_visibility" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "system_friend_requests" (
	"id" text PRIMARY KEY NOT NULL,
	"sender_system_id" text NOT NULL,
	"receiver_system_id" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"message" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"responded_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "system_friendships" (
	"id" text PRIMARY KEY NOT NULL,
	"system_a_id" text NOT NULL,
	"system_b_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "system_integrations" (
	"id" text PRIMARY KEY NOT NULL,
	"system_id" text NOT NULL,
	"provider" text NOT NULL,
	"encrypted_token" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "system_journal" (
	"id" text PRIMARY KEY NOT NULL,
	"system_id" text NOT NULL,
	"title" text,
	"content" text NOT NULL,
	"mood" text,
	"fronting_member_ids" text,
	"is_private" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "system_notes" (
	"id" text PRIMARY KEY NOT NULL,
	"system_id" text NOT NULL,
	"member_id" text,
	"title" text,
	"content" text NOT NULL,
	"category" text,
	"is_private" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "system_partner_requests" (
	"id" text PRIMARY KEY NOT NULL,
	"sender_system_id" text NOT NULL,
	"receiver_system_id" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"message" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"responded_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "system_partnerships" (
	"id" text PRIMARY KEY NOT NULL,
	"system_a_id" text NOT NULL,
	"system_b_id" text NOT NULL,
	"relationship_label" text,
	"partnered_since" timestamp,
	"anniversary_date" timestamp,
	"nickname_for_a" text,
	"nickname_for_b" text,
	"how_we_met" text,
	"checkin_interval_days" integer,
	"last_checkin_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "systems" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"avatar_mode" text DEFAULT 'emoji' NOT NULL,
	"avatar_emoji" text DEFAULT '☀️' NOT NULL,
	"avatar_url" text,
	"email" text NOT NULL,
	"password_hash" text NOT NULL,
	"account_type" text DEFAULT 'system' NOT NULL,
	"deletion_requested_at" timestamp,
	"deletion_scheduled_for" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "systems_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "alter_partner_pairings" ADD CONSTRAINT "alter_partner_pairings_partnership_id_system_partnerships_id_fk" FOREIGN KEY ("partnership_id") REFERENCES "public"."system_partnerships"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "alter_partner_pairings" ADD CONSTRAINT "alter_partner_pairings_member_a_id_members_id_fk" FOREIGN KEY ("member_a_id") REFERENCES "public"."members"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "alter_partner_pairings" ADD CONSTRAINT "alter_partner_pairings_member_b_id_members_id_fk" FOREIGN KEY ("member_b_id") REFERENCES "public"."members"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "custom_fields" ADD CONSTRAINT "custom_fields_system_id_systems_id_fk" FOREIGN KEY ("system_id") REFERENCES "public"."systems"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "front_entries" ADD CONSTRAINT "front_entries_system_id_systems_id_fk" FOREIGN KEY ("system_id") REFERENCES "public"."systems"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "member_external_links" ADD CONSTRAINT "member_external_links_system_id_systems_id_fk" FOREIGN KEY ("system_id") REFERENCES "public"."systems"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "member_external_links" ADD CONSTRAINT "member_external_links_member_id_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."members"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "member_field_values" ADD CONSTRAINT "member_field_values_system_id_systems_id_fk" FOREIGN KEY ("system_id") REFERENCES "public"."systems"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "member_field_values" ADD CONSTRAINT "member_field_values_member_id_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."members"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "member_field_values" ADD CONSTRAINT "member_field_values_field_id_custom_fields_id_fk" FOREIGN KEY ("field_id") REFERENCES "public"."custom_fields"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "members" ADD CONSTRAINT "members_system_id_systems_id_fk" FOREIGN KEY ("system_id") REFERENCES "public"."systems"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification_deliveries" ADD CONSTRAINT "notification_deliveries_notification_id_notifications_id_fk" FOREIGN KEY ("notification_id") REFERENCES "public"."notifications"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification_deliveries" ADD CONSTRAINT "notification_deliveries_push_token_id_notification_push_tokens_id_fk" FOREIGN KEY ("push_token_id") REFERENCES "public"."notification_push_tokens"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification_push_tokens" ADD CONSTRAINT "notification_push_tokens_system_id_systems_id_fk" FOREIGN KEY ("system_id") REFERENCES "public"."systems"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_recipient_system_id_systems_id_fk" FOREIGN KEY ("recipient_system_id") REFERENCES "public"."systems"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_actor_system_id_systems_id_fk" FOREIGN KEY ("actor_system_id") REFERENCES "public"."systems"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "partnership_bucket_items" ADD CONSTRAINT "partnership_bucket_items_partnership_id_system_partnerships_id_fk" FOREIGN KEY ("partnership_id") REFERENCES "public"."system_partnerships"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "partnership_bucket_items" ADD CONSTRAINT "partnership_bucket_items_created_by_system_id_systems_id_fk" FOREIGN KEY ("created_by_system_id") REFERENCES "public"."systems"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "partnership_milestones" ADD CONSTRAINT "partnership_milestones_partnership_id_system_partnerships_id_fk" FOREIGN KEY ("partnership_id") REFERENCES "public"."system_partnerships"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "partnership_notes" ADD CONSTRAINT "partnership_notes_partnership_id_system_partnerships_id_fk" FOREIGN KEY ("partnership_id") REFERENCES "public"."system_partnerships"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "partnership_notes" ADD CONSTRAINT "partnership_notes_author_system_id_systems_id_fk" FOREIGN KEY ("author_system_id") REFERENCES "public"."systems"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "password_reset_tokens" ADD CONSTRAINT "password_reset_tokens_system_id_systems_id_fk" FOREIGN KEY ("system_id") REFERENCES "public"."systems"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "system_blocks" ADD CONSTRAINT "system_blocks_blocker_system_id_systems_id_fk" FOREIGN KEY ("blocker_system_id") REFERENCES "public"."systems"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "system_blocks" ADD CONSTRAINT "system_blocks_blocked_system_id_systems_id_fk" FOREIGN KEY ("blocked_system_id") REFERENCES "public"."systems"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "system_chat_channels" ADD CONSTRAINT "system_chat_channels_system_id_systems_id_fk" FOREIGN KEY ("system_id") REFERENCES "public"."systems"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "system_chat_messages" ADD CONSTRAINT "system_chat_messages_system_id_systems_id_fk" FOREIGN KEY ("system_id") REFERENCES "public"."systems"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "system_friend_member_shares" ADD CONSTRAINT "system_friend_member_shares_owner_system_id_systems_id_fk" FOREIGN KEY ("owner_system_id") REFERENCES "public"."systems"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "system_friend_member_shares" ADD CONSTRAINT "system_friend_member_shares_friend_system_id_systems_id_fk" FOREIGN KEY ("friend_system_id") REFERENCES "public"."systems"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "system_friend_member_shares" ADD CONSTRAINT "system_friend_member_shares_member_id_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."members"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "system_friend_requests" ADD CONSTRAINT "system_friend_requests_sender_system_id_systems_id_fk" FOREIGN KEY ("sender_system_id") REFERENCES "public"."systems"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "system_friend_requests" ADD CONSTRAINT "system_friend_requests_receiver_system_id_systems_id_fk" FOREIGN KEY ("receiver_system_id") REFERENCES "public"."systems"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "system_friendships" ADD CONSTRAINT "system_friendships_system_a_id_systems_id_fk" FOREIGN KEY ("system_a_id") REFERENCES "public"."systems"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "system_friendships" ADD CONSTRAINT "system_friendships_system_b_id_systems_id_fk" FOREIGN KEY ("system_b_id") REFERENCES "public"."systems"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "system_integrations" ADD CONSTRAINT "system_integrations_system_id_systems_id_fk" FOREIGN KEY ("system_id") REFERENCES "public"."systems"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "system_journal" ADD CONSTRAINT "system_journal_system_id_systems_id_fk" FOREIGN KEY ("system_id") REFERENCES "public"."systems"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "system_notes" ADD CONSTRAINT "system_notes_system_id_systems_id_fk" FOREIGN KEY ("system_id") REFERENCES "public"."systems"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "system_notes" ADD CONSTRAINT "system_notes_member_id_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."members"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "system_partner_requests" ADD CONSTRAINT "system_partner_requests_sender_system_id_systems_id_fk" FOREIGN KEY ("sender_system_id") REFERENCES "public"."systems"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "system_partner_requests" ADD CONSTRAINT "system_partner_requests_receiver_system_id_systems_id_fk" FOREIGN KEY ("receiver_system_id") REFERENCES "public"."systems"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "system_partnerships" ADD CONSTRAINT "system_partnerships_system_a_id_systems_id_fk" FOREIGN KEY ("system_a_id") REFERENCES "public"."systems"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "system_partnerships" ADD CONSTRAINT "system_partnerships_system_b_id_systems_id_fk" FOREIGN KEY ("system_b_id") REFERENCES "public"."systems"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_alter_pairings_partnership_id" ON "alter_partner_pairings" USING btree ("partnership_id");--> statement-breakpoint
CREATE UNIQUE INDEX "ux_alter_pairings_pair" ON "alter_partner_pairings" USING btree ("partnership_id","member_a_id","member_b_id");--> statement-breakpoint
CREATE INDEX "idx_custom_fields_system_id" ON "custom_fields" USING btree ("system_id");--> statement-breakpoint
CREATE INDEX "idx_custom_fields_system_sort" ON "custom_fields" USING btree ("system_id","sort_order");--> statement-breakpoint
CREATE INDEX "idx_front_entries_system_id" ON "front_entries" USING btree ("system_id");--> statement-breakpoint
CREATE INDEX "idx_front_entries_ended_at" ON "front_entries" USING btree ("ended_at");--> statement-breakpoint
CREATE INDEX "idx_front_entries_system_ended" ON "front_entries" USING btree ("system_id","ended_at");--> statement-breakpoint
CREATE INDEX "idx_member_external_links_member_id" ON "member_external_links" USING btree ("member_id");--> statement-breakpoint
CREATE UNIQUE INDEX "ux_member_external_links_provider_external" ON "member_external_links" USING btree ("system_id","provider","external_id");--> statement-breakpoint
CREATE INDEX "idx_member_external_links_provider_secondary" ON "member_external_links" USING btree ("system_id","provider","external_secondary_id");--> statement-breakpoint
CREATE UNIQUE INDEX "ux_member_external_links_member_provider" ON "member_external_links" USING btree ("system_id","member_id","provider");--> statement-breakpoint
CREATE INDEX "idx_member_field_values_system_id" ON "member_field_values" USING btree ("system_id");--> statement-breakpoint
CREATE INDEX "idx_member_field_values_member_id" ON "member_field_values" USING btree ("member_id");--> statement-breakpoint
CREATE INDEX "idx_member_field_values_field_id" ON "member_field_values" USING btree ("field_id");--> statement-breakpoint
CREATE UNIQUE INDEX "ux_member_field_values_member_field" ON "member_field_values" USING btree ("member_id","field_id");--> statement-breakpoint
CREATE INDEX "idx_members_system_id" ON "members" USING btree ("system_id");--> statement-breakpoint
CREATE INDEX "idx_members_system_archived" ON "members" USING btree ("system_id","is_archived");--> statement-breakpoint
CREATE INDEX "idx_notification_deliveries_notification_id" ON "notification_deliveries" USING btree ("notification_id");--> statement-breakpoint
CREATE INDEX "idx_notification_deliveries_push_token_id" ON "notification_deliveries" USING btree ("push_token_id");--> statement-breakpoint
CREATE INDEX "idx_notification_deliveries_status" ON "notification_deliveries" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_notification_push_tokens_system_id" ON "notification_push_tokens" USING btree ("system_id");--> statement-breakpoint
CREATE UNIQUE INDEX "ux_notification_push_tokens_system_hash" ON "notification_push_tokens" USING btree ("system_id","token_hash");--> statement-breakpoint
CREATE INDEX "idx_notification_push_tokens_revoked_at" ON "notification_push_tokens" USING btree ("revoked_at");--> statement-breakpoint
CREATE INDEX "idx_notifications_recipient_created" ON "notifications" USING btree ("recipient_system_id","created_at");--> statement-breakpoint
CREATE INDEX "idx_notifications_recipient_read" ON "notifications" USING btree ("recipient_system_id","read_at");--> statement-breakpoint
CREATE INDEX "idx_bucket_items_partnership_id" ON "partnership_bucket_items" USING btree ("partnership_id");--> statement-breakpoint
CREATE INDEX "idx_bucket_items_completed_at" ON "partnership_bucket_items" USING btree ("completed_at");--> statement-breakpoint
CREATE INDEX "idx_partnership_milestones_partnership_id" ON "partnership_milestones" USING btree ("partnership_id");--> statement-breakpoint
CREATE INDEX "idx_partnership_milestones_occurred_on" ON "partnership_milestones" USING btree ("occurred_on");--> statement-breakpoint
CREATE INDEX "idx_partnership_notes_partnership_id" ON "partnership_notes" USING btree ("partnership_id");--> statement-breakpoint
CREATE INDEX "idx_partnership_notes_created_at" ON "partnership_notes" USING btree ("created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "ux_password_reset_tokens_hash" ON "password_reset_tokens" USING btree ("token_hash");--> statement-breakpoint
CREATE INDEX "idx_password_reset_tokens_system_id" ON "password_reset_tokens" USING btree ("system_id");--> statement-breakpoint
CREATE INDEX "idx_password_reset_tokens_expires_at" ON "password_reset_tokens" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "idx_system_blocks_blocker_system_id" ON "system_blocks" USING btree ("blocker_system_id");--> statement-breakpoint
CREATE INDEX "idx_system_blocks_blocked_system_id" ON "system_blocks" USING btree ("blocked_system_id");--> statement-breakpoint
CREATE UNIQUE INDEX "ux_system_blocks_pair" ON "system_blocks" USING btree ("blocker_system_id","blocked_system_id");--> statement-breakpoint
CREATE INDEX "idx_system_chat_channels_system_id" ON "system_chat_channels" USING btree ("system_id");--> statement-breakpoint
CREATE INDEX "idx_system_chat_channels_sort_order" ON "system_chat_channels" USING btree ("sort_order");--> statement-breakpoint
CREATE INDEX "idx_system_chat_messages_system_id" ON "system_chat_messages" USING btree ("system_id");--> statement-breakpoint
CREATE INDEX "idx_system_chat_messages_channel_id" ON "system_chat_messages" USING btree ("channel_id");--> statement-breakpoint
CREATE INDEX "idx_system_chat_messages_created_at" ON "system_chat_messages" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_friend_member_shares_owner_friend" ON "system_friend_member_shares" USING btree ("owner_system_id","friend_system_id");--> statement-breakpoint
CREATE INDEX "idx_friend_member_shares_member_id" ON "system_friend_member_shares" USING btree ("member_id");--> statement-breakpoint
CREATE UNIQUE INDEX "ux_friend_member_shares_owner_friend_member" ON "system_friend_member_shares" USING btree ("owner_system_id","friend_system_id","member_id");--> statement-breakpoint
CREATE INDEX "idx_friend_requests_sender_system_id" ON "system_friend_requests" USING btree ("sender_system_id");--> statement-breakpoint
CREATE INDEX "idx_friend_requests_receiver_system_id" ON "system_friend_requests" USING btree ("receiver_system_id");--> statement-breakpoint
CREATE INDEX "idx_friend_requests_status" ON "system_friend_requests" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_friendships_system_a_id" ON "system_friendships" USING btree ("system_a_id");--> statement-breakpoint
CREATE INDEX "idx_friendships_system_b_id" ON "system_friendships" USING btree ("system_b_id");--> statement-breakpoint
CREATE UNIQUE INDEX "ux_friendships_pair" ON "system_friendships" USING btree ("system_a_id","system_b_id");--> statement-breakpoint
CREATE UNIQUE INDEX "ux_system_integrations_system_provider" ON "system_integrations" USING btree ("system_id","provider");--> statement-breakpoint
CREATE INDEX "idx_system_integrations_provider" ON "system_integrations" USING btree ("provider");--> statement-breakpoint
CREATE INDEX "idx_system_journal_system_id" ON "system_journal" USING btree ("system_id");--> statement-breakpoint
CREATE INDEX "idx_system_journal_created_at" ON "system_journal" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_system_notes_system_id" ON "system_notes" USING btree ("system_id");--> statement-breakpoint
CREATE INDEX "idx_system_notes_member_id" ON "system_notes" USING btree ("member_id");--> statement-breakpoint
CREATE INDEX "idx_system_notes_is_private" ON "system_notes" USING btree ("is_private");--> statement-breakpoint
CREATE INDEX "idx_partner_requests_sender" ON "system_partner_requests" USING btree ("sender_system_id");--> statement-breakpoint
CREATE INDEX "idx_partner_requests_receiver" ON "system_partner_requests" USING btree ("receiver_system_id");--> statement-breakpoint
CREATE INDEX "idx_partner_requests_status" ON "system_partner_requests" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_partnerships_system_a" ON "system_partnerships" USING btree ("system_a_id");--> statement-breakpoint
CREATE INDEX "idx_partnerships_system_b" ON "system_partnerships" USING btree ("system_b_id");--> statement-breakpoint
CREATE UNIQUE INDEX "ux_partnerships_pair" ON "system_partnerships" USING btree ("system_a_id","system_b_id");