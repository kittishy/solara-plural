-- Public profile (opt-in, granular). All flags default to private.
ALTER TABLE "systems" ADD COLUMN "public_slug" text;
ALTER TABLE "systems" ADD COLUMN "is_public" integer DEFAULT 0 NOT NULL;
ALTER TABLE "systems" ADD COLUMN "public_show_bio" integer DEFAULT 1 NOT NULL;
ALTER TABLE "systems" ADD COLUMN "public_show_members" integer DEFAULT 0 NOT NULL;
ALTER TABLE "systems" ADD COLUMN "public_show_front" integer DEFAULT 0 NOT NULL;
--> statement-breakpoint
-- Postgres allows multiple NULLs under a UNIQUE index, so unset slugs never collide.
CREATE UNIQUE INDEX "ux_systems_public_slug" ON "systems" ("public_slug");
--> statement-breakpoint
-- Per-member public opt-in (only honoured when systems.public_show_members = 1).
ALTER TABLE "members" ADD COLUMN "is_public" integer DEFAULT 0 NOT NULL;
