import { db } from '@/lib/db';
import { systemChatChannels, systemChatMessages } from '@/lib/db/schema';
import { eq, asc, isNull, and } from 'drizzle-orm';
import { requireAuth, ok, err, parseJsonRecord } from '@/lib/api/helpers';
import { createId } from '@paralleldrive/cuid2';
import { revalidatePath } from 'next/cache';

// GET /api/chat/channels — list channels for the authenticated system.
// If no channels exist, create a default "general" channel and backfill any
// legacy messages (channel_id IS NULL) to it.
export async function GET() {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  let channels = await db
    .select({
      id: systemChatChannels.id,
      name: systemChatChannels.name,
      sortOrder: systemChatChannels.sortOrder,
      createdAt: systemChatChannels.createdAt,
    })
    .from(systemChatChannels)
    .where(eq(systemChatChannels.systemId, auth.systemId))
    .orderBy(asc(systemChatChannels.sortOrder), asc(systemChatChannels.createdAt));

  if (channels.length === 0) {
    const id = createId();
    const now = new Date();
    await db.insert(systemChatChannels).values({
      id,
      systemId: auth.systemId,
      name: 'geral',
      sortOrder: 0,
      createdAt: now,
    });
    // Backfill legacy messages
    await db
      .update(systemChatMessages)
      .set({ channelId: id })
      .where(and(eq(systemChatMessages.systemId, auth.systemId), isNull(systemChatMessages.channelId)));

    channels = [{ id, name: 'geral', sortOrder: 0, createdAt: now }];
  }

  return ok({ channels }, 200, {
    headers: { 'Cache-Control': 'private, no-cache' },
  });
}

// POST /api/chat/channels — create a new channel
export async function POST(request: Request) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  const parsed = await parseJsonRecord(request);
  if (parsed.error) return parsed.error;
  const body = parsed.data;

  const rawName = typeof body.name === 'string' ? body.name.trim() : '';
  if (!rawName) return err('name is required');
  if (rawName.length > 40) return err('name must be 40 characters or fewer');

  // Normalize: lowercase, replace spaces with dashes, allow letters/numbers/dashes/underscores
  const name = rawName
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9\-_]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40);

  if (!name) return err('name must contain valid characters');

  // Determine next sort_order
  const existing = await db
    .select({ sortOrder: systemChatChannels.sortOrder })
    .from(systemChatChannels)
    .where(eq(systemChatChannels.systemId, auth.systemId))
    .orderBy(asc(systemChatChannels.sortOrder));
  const nextOrder = existing.length > 0
    ? Math.max(...existing.map((c) => c.sortOrder)) + 1
    : 0;

  const id = createId();
  const now = new Date();

  const [inserted] = await db
    .insert(systemChatChannels)
    .values({ id, systemId: auth.systemId, name, sortOrder: nextOrder, createdAt: now })
    .returning();

  revalidatePath('/chat');

  return ok({ channel: inserted }, 201);
}
