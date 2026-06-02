CREATE TABLE `system_blocks` (
	`id` text PRIMARY KEY NOT NULL,
	`blocker_system_id` text NOT NULL,
	`blocked_system_id` text NOT NULL,
	`created_at` integer DEFAULT (strftime('%s', 'now')) NOT NULL,
	FOREIGN KEY (`blocker_system_id`) REFERENCES `systems`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`blocked_system_id`) REFERENCES `systems`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_system_blocks_blocker_system_id` ON `system_blocks` (`blocker_system_id`);--> statement-breakpoint
CREATE INDEX `idx_system_blocks_blocked_system_id` ON `system_blocks` (`blocked_system_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `ux_system_blocks_pair` ON `system_blocks` (`blocker_system_id`,`blocked_system_id`);--> statement-breakpoint
CREATE TABLE `system_friend_member_shares` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_system_id` text NOT NULL,
	`friend_system_id` text NOT NULL,
	`member_id` text NOT NULL,
	`visibility` text DEFAULT 'profile' NOT NULL,
	`created_at` integer DEFAULT (strftime('%s', 'now')) NOT NULL,
	`updated_at` integer DEFAULT (strftime('%s', 'now')) NOT NULL,
	FOREIGN KEY (`owner_system_id`) REFERENCES `systems`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`friend_system_id`) REFERENCES `systems`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`member_id`) REFERENCES `members`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_friend_member_shares_owner_friend` ON `system_friend_member_shares` (`owner_system_id`,`friend_system_id`);--> statement-breakpoint
CREATE INDEX `idx_friend_member_shares_member_id` ON `system_friend_member_shares` (`member_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `ux_friend_member_shares_owner_friend_member` ON `system_friend_member_shares` (`owner_system_id`,`friend_system_id`,`member_id`);