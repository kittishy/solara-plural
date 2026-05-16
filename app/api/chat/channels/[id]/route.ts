import { db } from '@/lib/db';
import { systemChatChannels, systemChatMessages } from '@/lib/db/schema';
import { and, eq, asc } from 'drizzle-orm';
import { requireSystemAuth, ok, err, parseJsonRecord } from '@/lib/api/helpers';
import { revalidatePath } from 'next/cache';

type RouteParams = { params: Promise<{ id: string }> };

// PATCH /api/chat/channels/[id] — rename channel
export async function PATCH(request: Request, { params }: RouteParams) {
  const auth = await requireSystemAuth();
  if (auth.error) return auth.error;

  const { id } = await params;

  const parsed = await parseJsonRecord(request);
  if (parsed.error) return parsed.error;
  const body = parsed.data;

  const rawName = typeof body.name === 'string' ? body.name.trim() : '';
  if (!rawName) return err('name is required');
  if (rawName.length > 40) return err('name must be 40 characters or fewer');

  const name = rawName
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9\-_]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40);
  if (!name) return err('name must contain valid characters');

  const result = await db
    .update(systemChatChannels)
    .set({ name })
    .where(and(eq(systemChatChannels.id, id), eq(systemChatChannels.systemId, auth.systemId)))
    .returning();

  if (result.length === 0) return err('channel not found', 404);

  revalidatePath('/chat');
  return ok({ channel: result[0] });
}

// DELETE /api/chat/channels/[id] — delete channel and all its messages.
// Refuses if it's the only channel (must keep at least one).
export async function DELETE(_request: Request, { params }: RouteParams) {
  const auth = await requireSystemAuth();
  if (auth.error) return auth.error;

  const { id } = await params;

  const channels = await db
    .select({ id: systemChatChannels.id })
    .from(systemChatChannels)
    .where(eq(systemChatChannels.systemId, auth.systemId))
    .orderBy(asc(systemChatChannels.sortOrder));

  if (channels.length <= 1) {
    return err('cannot delete the last channel', 400);
  }
  if (!channels.some((c) => c.id === id)) {
    return err('channel not found', 404);
  }

  // Delete messages first (no FK cascade since channel_id was added later)
  await db
    .delete(systemChatMessages)
    .where(and(eq(systemChatMessages.channelId, id), eq(systemChatMessages.systemId, auth.systemId)));

  await db
    .delete(systemChatChannels)
    .where(and(eq(systemChatChannels.id, id), eq(systemChatChannels.systemId, auth.systemId)));

  revalidatePath('/chat');
  return ok({ deleted: true });
}
