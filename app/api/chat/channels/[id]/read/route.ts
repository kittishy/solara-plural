import { and, eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { systemChatChannels, chatChannelReads } from '@/lib/db/schema';
import { requireSystemAuth, ok, err } from '@/lib/api/helpers';

// POST /api/chat/channels/[id]/read — mark a channel as read "now".
// Called when the user opens a channel and while they keep it active.
export async function POST(
  _request: Request,
  { params }: { params: { id: string } },
) {
  const auth = await requireSystemAuth();
  if (auth.error) return auth.error;

  const channel = await db
    .select({ id: systemChatChannels.id })
    .from(systemChatChannels)
    .where(and(
      eq(systemChatChannels.id, params.id),
      eq(systemChatChannels.systemId, auth.systemId),
    ))
    .limit(1);
  if (channel.length === 0) return err('channel not found', 404);

  const now = new Date();
  await db
    .insert(chatChannelReads)
    .values({ systemId: auth.systemId, channelId: params.id, lastReadAt: now })
    .onConflictDoUpdate({
      target: [chatChannelReads.systemId, chatChannelReads.channelId],
      set: { lastReadAt: now },
    });

  return ok({ readAt: now.toISOString() });
}
