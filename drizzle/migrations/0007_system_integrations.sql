CREATE TABLE `system_integrations` (
	`id` text PRIMARY KEY NOT NULL,
	`system_id` text NOT NULL,
	`provider` text NOT NULL,
	`encrypted_token` text NOT NULL,
	`created_at` integer DEFAULT (strftime('%s', 'now')) NOT NULL,
	`updated_at` integer DEFAULT (strftime('%s', 'now')) NOT NULL,
	FOREIGN KEY (`system_id`) REFERENCES `systems`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `ux_system_integrations_system_provider` ON `system_integrations` (`system_id`,`provider`);
--> statement-breakpoint
CREATE INDEX `idx_system_integrations_provider` ON `system_integrations` (`provider`);
