-- Solara Plural: close FK/index gaps reported by Supabase advisor.
-- Additive except for promoting the existing unique chat read index to the table PK.

ALTER TABLE public.chat_channel_reads
  ADD CONSTRAINT pk_chat_channel_reads PRIMARY KEY USING INDEX ux_chat_channel_reads;

CREATE INDEX IF NOT EXISTS idx_chat_channel_reads_channel_id
  ON public.chat_channel_reads (channel_id);

CREATE INDEX IF NOT EXISTS idx_admin_announcements_author_system_id
  ON public.admin_announcements (author_system_id);

CREATE INDEX IF NOT EXISTS idx_app_settings_updated_by_system_id
  ON public.app_settings (updated_by_system_id);

CREATE INDEX IF NOT EXISTS idx_notifications_actor_system_id
  ON public.notifications (actor_system_id);

CREATE INDEX IF NOT EXISTS idx_bucket_items_created_by_system_id
  ON public.partnership_bucket_items (created_by_system_id);

CREATE INDEX IF NOT EXISTS idx_partnership_notes_author_system_id
  ON public.partnership_notes (author_system_id);

CREATE INDEX IF NOT EXISTS idx_friend_member_shares_friend_system_id
  ON public.system_friend_member_shares (friend_system_id);
