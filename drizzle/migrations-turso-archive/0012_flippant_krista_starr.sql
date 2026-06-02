CREATE TABLE `alter_partner_pairings` (
	`id` text PRIMARY KEY NOT NULL,
	`partnership_id` text NOT NULL,
	`member_a_id` text NOT NULL,
	`member_b_id` text NOT NULL,
	`label` text,
	`created_at` integer DEFAULT (strftime('%s', 'now')) NOT NULL,
	FOREIGN KEY (`partnership_id`) REFERENCES `system_partnerships`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`member_a_id`) REFERENCES `members`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`member_b_id`) REFERENCES `members`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_alter_pairings_partnership_id` ON `alter_partner_pairings` (`partnership_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `ux_alter_pairings_pair` ON `alter_partner_pairings` (`partnership_id`,`member_a_id`,`member_b_id`);--> statement-breakpoint
CREATE TABLE `custom_fields` (
	`id` text PRIMARY KEY NOT NULL,
	`system_id` text NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`type` text DEFAULT 'text' NOT NULL,
	`options` text,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`created_at` integer DEFAULT (strftime('%s', 'now')) NOT NULL,
	`updated_at` integer DEFAULT (strftime('%s', 'now')) NOT NULL,
	FOREIGN KEY (`system_id`) REFERENCES `systems`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_custom_fields_system_id` ON `custom_fields` (`system_id`);--> statement-breakpoint
CREATE INDEX `idx_custom_fields_system_sort` ON `custom_fields` (`system_id`,`sort_order`);--> statement-breakpoint
CREATE TABLE `member_field_values` (
	`id` text PRIMARY KEY NOT NULL,
	`system_id` text NOT NULL,
	`member_id` text NOT NULL,
	`field_id` text NOT NULL,
	`value` text,
	`created_at` integer DEFAULT (strftime('%s', 'now')) NOT NULL,
	`updated_at` integer DEFAULT (strftime('%s', 'now')) NOT NULL,
	FOREIGN KEY (`system_id`) REFERENCES `systems`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`member_id`) REFERENCES `members`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`field_id`) REFERENCES `custom_fields`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_member_field_values_system_id` ON `member_field_values` (`system_id`);--> statement-breakpoint
CREATE INDEX `idx_member_field_values_member_id` ON `member_field_values` (`member_id`);--> statement-breakpoint
CREATE INDEX `idx_member_field_values_field_id` ON `member_field_values` (`field_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `ux_member_field_values_member_field` ON `member_field_values` (`member_id`,`field_id`);--> statement-breakpoint
CREATE TABLE `partnership_bucket_items` (
	`id` text PRIMARY KEY NOT NULL,
	`partnership_id` text NOT NULL,
	`title` text NOT NULL,
	`note` text,
	`category` text,
	`completed_at` integer,
	`created_by_system_id` text NOT NULL,
	`created_at` integer DEFAULT (strftime('%s', 'now')) NOT NULL,
	`updated_at` integer DEFAULT (strftime('%s', 'now')) NOT NULL,
	FOREIGN KEY (`partnership_id`) REFERENCES `system_partnerships`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`created_by_system_id`) REFERENCES `systems`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_bucket_items_partnership_id` ON `partnership_bucket_items` (`partnership_id`);--> statement-breakpoint
CREATE INDEX `idx_bucket_items_completed_at` ON `partnership_bucket_items` (`completed_at`);--> statement-breakpoint
CREATE TABLE `partnership_milestones` (
	`id` text PRIMARY KEY NOT NULL,
	`partnership_id` text NOT NULL,
	`title` text NOT NULL,
	`description` text,
	`occurred_on` integer NOT NULL,
	`created_at` integer DEFAULT (strftime('%s', 'now')) NOT NULL,
	FOREIGN KEY (`partnership_id`) REFERENCES `system_partnerships`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_partnership_milestones_partnership_id` ON `partnership_milestones` (`partnership_id`);--> statement-breakpoint
CREATE INDEX `idx_partnership_milestones_occurred_on` ON `partnership_milestones` (`occurred_on`);--> statement-breakpoint
CREATE TABLE `partnership_notes` (
	`id` text PRIMARY KEY NOT NULL,
	`partnership_id` text NOT NULL,
	`author_system_id` text NOT NULL,
	`content` text NOT NULL,
	`mood` text,
	`created_at` integer DEFAULT (strftime('%s', 'now')) NOT NULL,
	`updated_at` integer DEFAULT (strftime('%s', 'now')) NOT NULL,
	FOREIGN KEY (`partnership_id`) REFERENCES `system_partnerships`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`author_system_id`) REFERENCES `systems`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_partnership_notes_partnership_id` ON `partnership_notes` (`partnership_id`);--> statement-breakpoint
CREATE INDEX `idx_partnership_notes_created_at` ON `partnership_notes` (`created_at`);--> statement-breakpoint
CREATE TABLE `password_reset_tokens` (
	`id` text PRIMARY KEY NOT NULL,
	`system_id` text NOT NULL,
	`token_hash` text NOT NULL,
	`expires_at` integer NOT NULL,
	`used_at` integer,
	`created_at` integer DEFAULT (strftime('%s', 'now')) NOT NULL,
	FOREIGN KEY (`system_id`) REFERENCES `systems`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `ux_password_reset_tokens_hash` ON `password_reset_tokens` (`token_hash`);--> statement-breakpoint
CREATE INDEX `idx_password_reset_tokens_system_id` ON `password_reset_tokens` (`system_id`);--> statement-breakpoint
CREATE INDEX `idx_password_reset_tokens_expires_at` ON `password_reset_tokens` (`expires_at`);--> statement-breakpoint
CREATE TABLE `system_journal` (
	`id` text PRIMARY KEY NOT NULL,
	`system_id` text NOT NULL,
	`title` text,
	`content` text NOT NULL,
	`mood` text,
	`fronting_member_ids` text,
	`is_private` integer DEFAULT 0 NOT NULL,
	`created_at` integer DEFAULT (strftime('%s', 'now')) NOT NULL,
	`updated_at` integer DEFAULT (strftime('%s', 'now')) NOT NULL,
	FOREIGN KEY (`system_id`) REFERENCES `systems`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_system_journal_system_id` ON `system_journal` (`system_id`);--> statement-breakpoint
CREATE INDEX `idx_system_journal_created_at` ON `system_journal` (`created_at`);--> statement-breakpoint
CREATE TABLE `system_partner_requests` (
	`id` text PRIMARY KEY NOT NULL,
	`sender_system_id` text NOT NULL,
	`receiver_system_id` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`message` text,
	`created_at` integer DEFAULT (strftime('%s', 'now')) NOT NULL,
	`responded_at` integer,
	FOREIGN KEY (`sender_system_id`) REFERENCES `systems`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`receiver_system_id`) REFERENCES `systems`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_partner_requests_sender` ON `system_partner_requests` (`sender_system_id`);--> statement-breakpoint
CREATE INDEX `idx_partner_requests_receiver` ON `system_partner_requests` (`receiver_system_id`);--> statement-breakpoint
CREATE INDEX `idx_partner_requests_status` ON `system_partner_requests` (`status`);--> statement-breakpoint
CREATE TABLE `system_partnerships` (
	`id` text PRIMARY KEY NOT NULL,
	`system_a_id` text NOT NULL,
	`system_b_id` text NOT NULL,
	`relationship_label` text,
	`partnered_since` integer,
	`anniversary_date` integer,
	`nickname_for_a` text,
	`nickname_for_b` text,
	`how_we_met` text,
	`checkin_interval_days` integer,
	`last_checkin_at` integer,
	`created_at` integer DEFAULT (strftime('%s', 'now')) NOT NULL,
	FOREIGN KEY (`system_a_id`) REFERENCES `systems`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`system_b_id`) REFERENCES `systems`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_partnerships_system_a` ON `system_partnerships` (`system_a_id`);--> statement-breakpoint
CREATE INDEX `idx_partnerships_system_b` ON `system_partnerships` (`system_b_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `ux_partnerships_pair` ON `system_partnerships` (`system_a_id`,`system_b_id`);--> statement-breakpoint
ALTER TABLE `system_notes` ADD `category` text;--> statement-breakpoint
ALTER TABLE `system_notes` ADD `is_private` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
CREATE INDEX `idx_system_notes_is_private` ON `system_notes` (`is_private`);