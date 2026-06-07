CREATE TABLE "admin_announcements" (
	"id" text PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"body" text NOT NULL,
	"level" text DEFAULT 'info' NOT NULL,
	"active" integer DEFAULT 1 NOT NULL,
	"pushed_at" timestamp,
	"author_system_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "admin_audit_log" (
	"id" text PRIMARY KEY NOT NULL,
	"actor_system_id" text,
	"actor_email" text,
	"action" text NOT NULL,
	"target_type" text,
	"target_id" text,
	"metadata" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "app_settings" (
	"key" text PRIMARY KEY NOT NULL,
	"value" text,
	"updated_by_system_id" text,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "systems" ADD COLUMN "is_admin" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "systems" ADD COLUMN "suspended_at" timestamp;--> statement-breakpoint
ALTER TABLE "systems" ADD COLUMN "suspended_reason" text;--> statement-breakpoint
ALTER TABLE "admin_announcements" ADD CONSTRAINT "admin_announcements_author_system_id_systems_id_fk" FOREIGN KEY ("author_system_id") REFERENCES "public"."systems"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "admin_audit_log" ADD CONSTRAINT "admin_audit_log_actor_system_id_systems_id_fk" FOREIGN KEY ("actor_system_id") REFERENCES "public"."systems"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app_settings" ADD CONSTRAINT "app_settings_updated_by_system_id_systems_id_fk" FOREIGN KEY ("updated_by_system_id") REFERENCES "public"."systems"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_admin_announcements_active" ON "admin_announcements" USING btree ("active");--> statement-breakpoint
CREATE INDEX "idx_admin_announcements_created_at" ON "admin_announcements" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_admin_audit_log_actor" ON "admin_audit_log" USING btree ("actor_system_id");--> statement-breakpoint
CREATE INDEX "idx_admin_audit_log_action" ON "admin_audit_log" USING btree ("action");--> statement-breakpoint
CREATE INDEX "idx_admin_audit_log_created_at" ON "admin_audit_log" USING btree ("created_at");