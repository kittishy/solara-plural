CREATE TABLE `system_chat_messages` (
	`id` text PRIMARY KEY NOT NULL,
	`system_id` text NOT NULL,
	`member_id` text,
	`content` text NOT NULL,
	`created_at` integer DEFAULT (strftime('%s', 'now')) NOT NULL,
	FOREIGN KEY (`system_id`) REFERENCES `systems`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_system_chat_messages_system_id` ON `system_chat_messages` (`system_id`);--> statement-breakpoint
CREATE INDEX `idx_system_chat_messages_created_at` ON `system_chat_messages` (`created_at`);
