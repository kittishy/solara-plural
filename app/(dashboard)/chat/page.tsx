import { db } from '@/lib/db';
import {
  systemChatMessages,
  systemChatChannels,
  members,
  frontEntries,
  systems,
} from '@/lib/db/schema';
import { eq, asc, and, isNull } from 'drizzle-orm';
import { requireSystemId } from '@/lib/auth/session';
import { createId } from '@paralleldrive/cuid2';
import { ChatClient } from './ChatClient';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Chat',
  description: 'Chat with your system',
};

export default async function ChatPage() {
  const systemId = await requireSystemId();

  // Fetch channels for this system. If none, create "geral" and backfill legacy
  // messages so the user lands in a working state on first visit.
  let channelsRaw = await db
    .select({
      id: systemChatChannels.id,
      name: systemChatChannels.name,
      sortOrder: systemChatChannels.sortOrder,
      createdAt: systemChatChannels.createdAt,
    })
    .from(systemChatChannels)
    .where(eq(systemChatChannels.systemId, systemId))
    .orderBy(asc(systemChatChannels.sortOrder), asc(systemChatChannels.createdAt));

  if (channelsRaw.length === 0) {
    const id = createId();
    const now = new Date();
    await db.insert(systemChatChannels).values({
      id,
      systemId,
      name: 'geral',
      sortOrder: 0,
      createdAt: now,
    });
    await db
      .update(systemChatMessages)
      .set({ channelId: id })
      .where(and(eq(systemChatMessages.systemId, systemId), isNull(systemChatMessages.channelId)));
    channelsRaw = [{ id, name: 'geral', sortOrder: 0, createdAt: now }];
  }

  const initialChannelId = channelsRaw[0].id;

  const [rawMessages, rawMembers, activeFront, system] = await Promise.all([
    db
      .select({
        id: systemChatMessages.id,
        content: systemChatMessages.content,
        createdAt: systemChatMessages.createdAt,
        memberId: systemChatMessages.memberId,
        channelId: systemChatMessages.channelId,
        memberName: members.name,
        memberColor: members.color,
        memberAvatarUrl: members.avatarUrl,
      })
      .from(systemChatMessages)
      .leftJoin(members, eq(systemChatMessages.memberId, members.id))
      .where(and(
        eq(systemChatMessages.systemId, systemId),
        eq(systemChatMessages.channelId, initialChannelId),
      ))
      .orderBy(asc(systemChatMessages.createdAt))
      .limit(100),
    db.query.members.findMany({
      columns: { id: true, name: true, color: true, avatarUrl: true },
      where: and(eq(members.systemId, systemId), eq(members.isArchived, 0)),
      orderBy: (m, { asc: a }) => [a(m.name)],
    }),
    db.query.frontEntries.findFirst({
      where: and(eq(frontEntries.systemId, systemId), isNull(frontEntries.endedAt)),
      columns: { memberIds: true },
    }),
    db.query.systems.findFirst({
      where: eq(systems.id, systemId),
      columns: { name: true },
    }),
  ]);

  const initialChannels = channelsRaw.map((c) => ({
    id: c.id,
    name: c.name,
    sortOrder: c.sortOrder,
    createdAt: c.createdAt instanceof Date ? c.createdAt.toISOString() : String(c.createdAt),
  }));

  const initialMessages = rawMessages.map((m) => ({
    id: m.id,
    content: m.content,
    createdAt: m.createdAt instanceof Date ? m.createdAt.toISOString() : String(m.createdAt),
    memberId: m.memberId ?? null,
    channelId: m.channelId ?? null,
    memberName: m.memberName ?? null,
    memberColor: m.memberColor ?? null,
    memberAvatarUrl: m.memberAvatarUrl ?? null,
  }));

  const initialMembers = rawMembers.map((m) => ({
    id: m.id,
    name: m.name,
    color: m.color ?? null,
    avatarUrl: m.avatarUrl ?? null,
  }));

  let frontingIds: string[] = [];
  if (activeFront?.memberIds) {
    try {
      const parsed = JSON.parse(activeFront.memberIds);
      if (Array.isArray(parsed)) {
        frontingIds = parsed.filter((id): id is string => typeof id === 'string');
      }
    } catch {
      // ignore malformed json
    }
  }

  return (
    <ChatClient
      initialChannels={initialChannels}
      initialChannelId={initialChannelId}
      initialMessages={initialMessages}
      initialMembers={initialMembers}
      frontingIds={frontingIds}
      systemName={system?.name ?? ''}
    />
  );
}
