CREATE TABLE IF NOT EXISTS `notification_deliveries` (
	`id` text PRIMARY KEY NOT NULL,
	`notification_id` text NOT NULL,
	`push_token_id` text NOT NULL,
	`status` text NOT NULL,
	`error_code` text,
	`attempts` integer DEFAULT 1 NOT NULL,
	`sent_at` integer,
	`created_at` integer DEFAULT (strftime('%s', 'now')) NOT NULL,
	`updated_at` integer DEFAULT (strftime('%s', 'now')) NOT NULL,
	FOREIGN KEY (`notification_id`) REFERENCES `notifications`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`push_token_id`) REFERENCES `notification_push_tokens`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `idx_notification_deliveries_notification_id` ON `notification_deliveries` (`notification_id`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `idx_notification_deliveries_push_token_id` ON `notification_deliveries` (`push_token_id`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `idx_notification_deliveries_status` ON `notification_deliveries` (`status`);--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `notification_push_tokens` (
	`id` text PRIMARY KEY NOT NULL,
	`system_id` text NOT NULL,
	`token_hash` text NOT NULL,
	`encrypted_token` text NOT NULL,
	`platform` text DEFAULT 'web' NOT NULL,
	`user_agent` text,
	`last_seen_at` integer NOT NULL,
	`revoked_at` integer,
	`created_at` integer DEFAULT (strftime('%s', 'now')) NOT NULL,
	`updated_at` integer DEFAULT (strftime('%s', 'now')) NOT NULL,
	FOREIGN KEY (`system_id`) REFERENCES `systems`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `idx_notification_push_tokens_system_id` ON `notification_push_tokens` (`system_id`);--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS `ux_notification_push_tokens_system_hash` ON `notification_push_tokens` (`system_id`,`token_hash`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `idx_notification_push_tokens_revoked_at` ON `notification_push_tokens` (`revoked_at`);--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `notifications` (
	`id` text PRIMARY KEY NOT NULL,
	`recipient_system_id` text NOT NULL,
	`actor_system_id` text,
	`type` text NOT NULL,
	`title` text NOT NULL,
	`body` text NOT NULL,
	`data` text,
	`read_at` integer,
	`created_at` integer DEFAULT (strftime('%s', 'now')) NOT NULL,
	FOREIGN KEY (`recipient_system_id`) REFERENCES `systems`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`actor_system_id`) REFERENCES `systems`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `idx_notifications_recipient_created` ON `notifications` (`recipient_system_id`,`created_at`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `idx_notifications_recipient_read` ON `notifications` (`recipient_system_id`,`read_at`);--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `system_integrations` (
	`id` text PRIMARY KEY NOT NULL,
	`system_id` text NOT NULL,
	`provider` text NOT NULL,
	`encrypted_token` text NOT NULL,
	`created_at` integer DEFAULT (strftime('%s', 'now')) NOT NULL,
	`updated_at` integer DEFAULT (strftime('%s', 'now')) NOT NULL,
	FOREIGN KEY (`system_id`) REFERENCES `systems`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS `ux_system_integrations_system_provider` ON `system_integrations` (`system_id`,`provider`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `idx_system_integrations_provider` ON `system_integrations` (`provider`);
