CREATE INDEX `idx_members_system_archived` ON `members` (`system_id`,`is_archived`);--> statement-breakpoint
CREATE INDEX `idx_front_entries_system_ended` ON `front_entries` (`system_id`,`ended_at`);
