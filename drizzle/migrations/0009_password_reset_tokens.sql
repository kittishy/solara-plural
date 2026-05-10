CREATE TABLE IF NOT EXISTS `password_reset_tokens` (
	`id` text PRIMARY KEY NOT NULL,
	`system_id` text NOT NULL,
	`token_hash` text NOT NULL,
	`expires_at` integer NOT NULL,
	`used_at` integer,
	`created_at` integer DEFAULT (strftime('%s', 'now')) NOT NULL,
	FOREIGN KEY (`system_id`) REFERENCES `systems`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS `ux_password_reset_tokens_hash` ON `password_reset_tokens` (`token_hash`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `idx_password_reset_tokens_system_id` ON `password_reset_tokens` (`system_id`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `idx_password_reset_tokens_expires_at` ON `password_reset_tokens` (`expires_at`);
