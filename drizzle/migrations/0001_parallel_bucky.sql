CREATE TABLE `system_friend_requests` (
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
CREATE INDEX `idx_friend_requests_sender_system_id` ON `system_friend_requests` (`sender_system_id`);--> statement-breakpoint
CREATE INDEX `idx_friend_requests_receiver_system_id` ON `system_friend_requests` (`receiver_system_id`);--> statement-breakpoint
CREATE INDEX `idx_friend_requests_status` ON `system_friend_requests` (`status`);--> statement-breakpoint
CREATE TABLE `system_friendships` (
	`id` text PRIMARY KEY NOT NULL,
	`system_a_id` text NOT NULL,
	`system_b_id` text NOT NULL,
	`created_at` integer DEFAULT (strftime('%s', 'now')) NOT NULL,
	FOREIGN KEY (`system_a_id`) REFERENCES `systems`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`system_b_id`) REFERENCES `systems`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_friendships_system_a_id` ON `system_friendships` (`system_a_id`);--> statement-breakpoint
CREATE INDEX `idx_friendships_system_b_id` ON `system_friendships` (`system_b_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `ux_friendships_pair` ON `system_friendships` (`system_a_id`,`system_b_id`);--> statement-breakpoint
ALTER TABLE `systems` ADD `account_type` text DEFAULT 'system' NOT NULL;