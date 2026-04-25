CREATE TABLE `front_entries` (
	`id` text PRIMARY KEY NOT NULL,
	`system_id` text NOT NULL,
	`member_ids` text NOT NULL,
	`started_at` integer NOT NULL,
	`ended_at` integer,
	`note` text,
	`created_at` integer DEFAULT (strftime('%s', 'now')) NOT NULL,
	FOREIGN KEY (`system_id`) REFERENCES `systems`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_front_entries_system_id` ON `front_entries` (`system_id`);--> statement-breakpoint
CREATE INDEX `idx_front_entries_ended_at` ON `front_entries` (`ended_at`);--> statement-breakpoint
CREATE TABLE `members` (
	`id` text PRIMARY KEY NOT NULL,
	`system_id` text NOT NULL,
	`name` text NOT NULL,
	`pronouns` text,
	`avatar_url` text,
	`description` text,
	`color` text,
	`role` text,
	`tags` text,
	`notes` text,
	`is_archived` integer DEFAULT 0 NOT NULL,
	`created_at` integer DEFAULT (strftime('%s', 'now')) NOT NULL,
	`updated_at` integer DEFAULT (strftime('%s', 'now')) NOT NULL,
	FOREIGN KEY (`system_id`) REFERENCES `systems`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_members_system_id` ON `members` (`system_id`);--> statement-breakpoint
CREATE TABLE `system_notes` (
	`id` text PRIMARY KEY NOT NULL,
	`system_id` text NOT NULL,
	`member_id` text,
	`title` text,
	`content` text NOT NULL,
	`created_at` integer DEFAULT (strftime('%s', 'now')) NOT NULL,
	`updated_at` integer DEFAULT (strftime('%s', 'now')) NOT NULL,
	FOREIGN KEY (`system_id`) REFERENCES `systems`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`member_id`) REFERENCES `members`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `idx_system_notes_system_id` ON `system_notes` (`system_id`);--> statement-breakpoint
CREATE INDEX `idx_system_notes_member_id` ON `system_notes` (`member_id`);--> statement-breakpoint
CREATE TABLE `systems` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`email` text NOT NULL,
	`password_hash` text NOT NULL,
	`created_at` integer DEFAULT (strftime('%s', 'now')) NOT NULL,
	`updated_at` integer DEFAULT (strftime('%s', 'now')) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `systems_email_unique` ON `systems` (`email`);