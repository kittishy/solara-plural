CREATE TABLE IF NOT EXISTS `custom_fields` (
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
CREATE INDEX IF NOT EXISTS `idx_custom_fields_system_id` ON `custom_fields` (`system_id`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `idx_custom_fields_system_sort` ON `custom_fields` (`system_id`,`sort_order`);--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `member_field_values` (
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
CREATE INDEX IF NOT EXISTS `idx_member_field_values_system_id` ON `member_field_values` (`system_id`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `idx_member_field_values_member_id` ON `member_field_values` (`member_id`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `idx_member_field_values_field_id` ON `member_field_values` (`field_id`);--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS `ux_member_field_values_member_field` ON `member_field_values` (`member_id`,`field_id`);
