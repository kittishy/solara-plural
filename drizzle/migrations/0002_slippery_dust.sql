CREATE TABLE "chat_channel_reads" (
	"system_id" text NOT NULL,
	"channel_id" text NOT NULL,
	"last_read_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "rate_limits" (
	"key" text PRIMARY KEY NOT NULL,
	"count" integer DEFAULT 1 NOT NULL,
	"reset_at" timestamp NOT NULL
);
--> statement-breakpoint
ALTER TABLE "chat_channel_reads" ADD CONSTRAINT "chat_channel_reads_system_id_systems_id_fk" FOREIGN KEY ("system_id") REFERENCES "public"."systems"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chat_channel_reads" ADD CONSTRAINT "chat_channel_reads_channel_id_system_chat_channels_id_fk" FOREIGN KEY ("channel_id") REFERENCES "public"."system_chat_channels"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "ux_chat_channel_reads" ON "chat_channel_reads" USING btree ("system_id","channel_id");--> statement-breakpoint
CREATE INDEX "idx_rate_limits_reset_at" ON "rate_limits" USING btree ("reset_at");