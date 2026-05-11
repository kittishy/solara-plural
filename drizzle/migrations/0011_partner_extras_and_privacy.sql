-- Privacy flag on system notes
ALTER TABLE `system_notes` ADD COLUMN `is_private` integer NOT NULL DEFAULT 0;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `idx_system_notes_is_private` ON `system_notes` (`is_private`);
--> statement-breakpoint

-- Partnership extras: anniversary + nicknames
ALTER TABLE `system_partnerships` ADD COLUMN `anniversary_date` integer;
--> statement-breakpoint
ALTER TABLE `system_partnerships` ADD COLUMN `nickname_for_a` text;
--> statement-breakpoint
ALTER TABLE `system_partnerships` ADD COLUMN `nickname_for_b` text;
--> statement-breakpoint
ALTER TABLE `system_partnerships` ADD COLUMN `how_we_met` text;
--> statement-breakpoint
ALTER TABLE `system_partnerships` ADD COLUMN `checkin_interval_days` integer;
--> statement-breakpoint
ALTER TABLE `system_partnerships` ADD COLUMN `last_checkin_at` integer;
--> statement-breakpoint

-- Shared diary/notes between partners
CREATE TABLE IF NOT EXISTS `partnership_notes` (
  `id` text PRIMARY KEY NOT NULL,
  `partnership_id` text NOT NULL,
  `author_system_id` text NOT NULL,
  `content` text NOT NULL,
  `mood` text,
  `created_at` integer DEFAULT (strftime('%s', 'now')) NOT NULL,
  `updated_at` integer DEFAULT (strftime('%s', 'now')) NOT NULL,
  FOREIGN KEY (`partnership_id`) REFERENCES `system_partnerships`(`id`) ON UPDATE no action ON DELETE cascade,
  FOREIGN KEY (`author_system_id`) REFERENCES `systems`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `idx_partnership_notes_partnership_id` ON `partnership_notes` (`partnership_id`);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `idx_partnership_notes_created_at` ON `partnership_notes` (`created_at`);
--> statement-breakpoint

-- Alter↔alter pairings within a partnership
CREATE TABLE IF NOT EXISTS `alter_partner_pairings` (
  `id` text PRIMARY KEY NOT NULL,
  `partnership_id` text NOT NULL,
  `member_a_id` text NOT NULL,
  `member_b_id` text NOT NULL,
  `label` text,
  `created_at` integer DEFAULT (strftime('%s', 'now')) NOT NULL,
  FOREIGN KEY (`partnership_id`) REFERENCES `system_partnerships`(`id`) ON UPDATE no action ON DELETE cascade,
  FOREIGN KEY (`member_a_id`) REFERENCES `members`(`id`) ON UPDATE no action ON DELETE cascade,
  FOREIGN KEY (`member_b_id`) REFERENCES `members`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `idx_alter_pairings_partnership_id` ON `alter_partner_pairings` (`partnership_id`);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS `ux_alter_pairings_pair` ON `alter_partner_pairings` (`partnership_id`, `member_a_id`, `member_b_id`);
--> statement-breakpoint

-- Relationship milestones
CREATE TABLE IF NOT EXISTS `partnership_milestones` (
  `id` text PRIMARY KEY NOT NULL,
  `partnership_id` text NOT NULL,
  `title` text NOT NULL,
  `description` text,
  `occurred_on` integer NOT NULL,
  `created_at` integer DEFAULT (strftime('%s', 'now')) NOT NULL,
  FOREIGN KEY (`partnership_id`) REFERENCES `system_partnerships`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `idx_partnership_milestones_partnership_id` ON `partnership_milestones` (`partnership_id`);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `idx_partnership_milestones_occurred_on` ON `partnership_milestones` (`occurred_on`);
--> statement-breakpoint

-- Shared bucket list
CREATE TABLE IF NOT EXISTS `partnership_bucket_items` (
  `id` text PRIMARY KEY NOT NULL,
  `partnership_id` text NOT NULL,
  `title` text NOT NULL,
  `note` text,
  `category` text,
  `completed_at` integer,
  `created_by_system_id` text NOT NULL,
  `created_at` integer DEFAULT (strftime('%s', 'now')) NOT NULL,
  `updated_at` integer DEFAULT (strftime('%s', 'now')) NOT NULL,
  FOREIGN KEY (`partnership_id`) REFERENCES `system_partnerships`(`id`) ON UPDATE no action ON DELETE cascade,
  FOREIGN KEY (`created_by_system_id`) REFERENCES `systems`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `idx_bucket_items_partnership_id` ON `partnership_bucket_items` (`partnership_id`);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `idx_bucket_items_completed_at` ON `partnership_bucket_items` (`completed_at`);
