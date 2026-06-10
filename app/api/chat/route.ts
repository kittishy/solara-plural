import { db } from '@/lib/db';
import { systemChatMessages, systemChatChannels, members } from '@/lib/db/schema';
import { eq, asc, and } from 'drizzle-orm';
import { requireSystemAuth, ok, err, parseJsonRecord } from '@/lib/api/helpers';
import { createId } from '@paralleldrive/cuid2';
import { revalidatePath } from 'next/cache';
import { publishChatEvent } from '@/lib/chat/realtime-broker';

// GET /api/chat?channelId=... — list last 100 messages for the given channel
export async function GET(request: Request) {
  const auth = await requireSystemAuth();
  if (auth.error) return auth.error;

  const url = new URL(request.url);
  const channelId = url.searchParams.get('channelId');
  if (!channelId) return err('channelId is required');

  // Verify channel belongs to this system
  const channel = await db
    .select({ id: systemChatChannels.id })
    .from(systemChatChannels)
    .where(and(eq(systemChatChannels.id, channelId), eq(systemChatChannels.systemId, auth.systemId)))
    .limit(1);
  if (channel.length === 0) return err('channel not found', 404);

  const rows = await db
    .select({
      id:              systemChatMessages.id,
      content:         systemChatMessages.content,
      createdAt:       systemChatMessages.createdAt,
      memberId:        systemChatMessages.memberId,
      channelId:       systemChatMessages.channelId,
      memberName:      members.name,
      memberColor:     members.color,
      memberAvatarUrl: members.avatarUrl,
    })
    .from(systemChatMessages)
    .leftJoin(members, eq(systemChatMessages.memberId, members.id))
    .where(and(
      eq(systemChatMessages.systemId, auth.systemId),
      eq(systemChatMessages.channelId, channelId),
    ))
    .orderBy(asc(systemChatMessages.createdAt))
    .limit(100);

  return ok({ messages: rows }, 200, {
    headers: { 'Cache-Control': 'private, no-cache' },
  });
}

// POST /api/chat — create a new message in a channel
export async function POST(request: Request) {
  const auth = await requireSystemAuth();
  if (auth.error) return auth.error;

  const parsed = await parseJsonRecord(request);
  if (parsed.error) return parsed.error;
  const body = parsed.data;

  const content = typeof body.content === 'string' ? body.content.trim() : '';
  if (!content) return err('content is required');
  if (content.length > 2000) return err('content must be 2000 characters or fewer');

  const channelId = typeof body.channelId === 'string' ? body.channelId.trim() : '';
  if (!channelId) return err('channelId is required');

  // Verify channel belongs to this system
  const channel = await db
    .select({ id: systemChatChannels.id })
    .from(systemChatChannels)
    .where(and(eq(systemChatChannels.id, channelId), eq(systemChatChannels.systemId, auth.systemId)))
    .limit(1);
  if (channel.length === 0) return err('channel not found', 404);

  let memberId: string | null = null;
  if (typeof body.memberId === 'string' && body.memberId.trim() !== '') {
    const candidateId = body.memberId.trim();
    const member = await db.query.members.findFirst({
      columns: { id: true },
      where: (m, { and: a }) =>
        a(eq(m.id, candidateId), eq(m.systemId, auth.systemId)),
    });
    if (!member) return err('memberId does not belong to this system', 400);
    memberId = candidateId;
  }

  const id = createId();
  const now = new Date();

  const [inserted] = await db
    .insert(systemChatMessages)
    .values({ id, systemId: auth.systemId, channelId, memberId, content, createdAt: now })
    .returning();

  // Wake any open chat streams on this instance so other devices/tabs of the
  // same system paint the message instantly (cross-instance is covered by the
  // stream's DB poll).
  publishChatEvent(auth.systemId, {
    messageId: id,
    channelId,
    createdAt: now.toISOString(),
  });

  revalidatePath('/chat');

  return ok({ message: inserted }, 201);
}
