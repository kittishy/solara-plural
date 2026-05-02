CREATE TABLE `member_external_links` (
	`id` text PRIMARY KEY NOT NULL,
	`system_id` text NOT NULL,
	`member_id` text NOT NULL,
	`provider` text NOT NULL,
	`external_id` text NOT NULL,
	`external_secondary_id` text,
	`external_name` text,
	`metadata` text,
	`last_synced_at` integer NOT NULL,
	`created_at` integer DEFAULT (strftime('%s', 'now')) NOT NULL,
	`updated_at` integer DEFAULT (strftime('%s', 'now')) NOT NULL,
	FOREIGN KEY (`system_id`) REFERENCES `systems`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`member_id`) REFERENCES `members`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_member_external_links_member_id` ON `member_external_links` (`member_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `ux_member_external_links_provider_external` ON `member_external_links` (`system_id`,`provider`,`external_id`);--> statement-breakpoint
CREATE INDEX `idx_member_external_links_provider_secondary` ON `member_external_links` (`system_id`,`provider`,`external_secondary_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `ux_member_external_links_member_provider` ON `member_external_links` (`system_id`,`member_id`,`provider`);