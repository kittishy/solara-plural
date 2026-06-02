CREATE TABLE IF NOT EXISTS `system_partner_requests` (
	`id` text PRIMARY KEY NOT NULL,
	`sender_system_id` text NOT NULL,
	`receiver_system_id` text NOT NULL,
	`status` text NOT NULL DEFAULT 'pending',
	`message` text,
	`created_at` integer DEFAULT (strftime('%s', 'now')) NOT NULL,
	`responded_at` integer,
	FOREIGN KEY (`sender_system_id`) REFERENCES `systems`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`receiver_system_id`) REFERENCES `systems`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `idx_partner_requests_sender` ON `system_partner_requests` (`sender_system_id`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `idx_partner_requests_receiver` ON `system_partner_requests` (`receiver_system_id`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `idx_partner_requests_status` ON `system_partner_requests` (`status`);--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `system_partnerships` (
	`id` text PRIMARY KEY NOT NULL,
	`system_a_id` text NOT NULL,
	`system_b_id` text NOT NULL,
	`relationship_label` text,
	`partnered_since` integer,
	`created_at` integer DEFAULT (strftime('%s', 'now')) NOT NULL,
	FOREIGN KEY (`system_a_id`) REFERENCES `systems`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`system_b_id`) REFERENCES `systems`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `idx_partnerships_system_a` ON `system_partnerships` (`system_a_id`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `idx_partnerships_system_b` ON `system_partnerships` (`system_b_id`);--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS `ux_partnerships_pair` ON `system_partnerships` (`system_a_id`,`system_b_id`);
