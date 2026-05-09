import { and, eq, inArray, or } from 'drizzle-orm';
import { db } from '@/lib/db';
import {
  members,
  systemFriendMemberShares,
  systemFriendships,
  systems,
} from '@/lib/db/schema';
import { createNotification } from '@/lib/notifications/create-notification';

export async function notifyFriendsAboutFrontChange(input: {
  systemId: string;
  memberIds: string[];
  event: 'started' | 'ended';
}) {
  const friendships = await db.query.systemFriendships.findMany({
    where: or(
      eq(systemFriendships.systemAId, input.systemId),
      eq(systemFriendships.systemBId, input.systemId),
    ),
  });

  if (friendships.length === 0) return;

  const owner = await db.query.systems.findFirst({
    columns: { name: true },
    where: eq(systems.id, input.systemId),
  });
  const ownerName = owner?.name ?? 'A friend';

  const friendIds = friendships.map((friendship) => (
    friendship.systemAId === input.systemId ? friendship.systemBId : friendship.systemAId
  ));

  const visibleShares = await db.query.systemFriendMemberShares.findMany({
    where: and(
      eq(systemFriendMemberShares.ownerSystemId, input.systemId),
      inArray(systemFriendMemberShares.friendSystemId, friendIds),
    ),
  });

  if (visibleShares.length === 0) return;

  const visibleByFriend = new Map<string, Set<string>>();
  for (const share of visibleShares) {
    if (share.visibility === 'hidden') continue;
    const set = visibleByFriend.get(share.friendSystemId) ?? new Set<string>();
    set.add(share.memberId);
    visibleByFriend.set(share.friendSystemId, set);
  }

  if (visibleByFriend.size === 0) return;

  const frontMemberRows = input.memberIds.length > 0
    ? await db.query.members.findMany({
        columns: { id: true, name: true },
        where: and(
          eq(members.systemId, input.systemId),
          inArray(members.id, input.memberIds),
        ),
      })
    : [];
  const memberNameById = new Map(frontMemberRows.map((member) => [member.id, member.name]));

  await Promise.all(friendIds.map(async (friendSystemId) => {
    const visibleMemberIds = visibleByFriend.get(friendSystemId);
    if (!visibleMemberIds) return;

    const visibleFrontNames = input.memberIds
      .filter((memberId) => visibleMemberIds.has(memberId))
      .map((memberId) => memberNameById.get(memberId))
      .filter((name): name is string => Boolean(name));

    if (input.event === 'started' && visibleFrontNames.length === 0) return;

    const title = input.event === 'ended'
      ? `${ownerName} ended their front`
      : `${ownerName} updated their front`;
    const body = input.event === 'ended'
      ? 'They are not listing anyone in front right now.'
      : `${visibleFrontNames.join(', ')} ${visibleFrontNames.length === 1 ? 'is' : 'are'} in front.`;

    await createNotification({
      recipientSystemId: friendSystemId,
      actorSystemId: input.systemId,
      type: 'friend_front_changed',
      title,
      body,
      data: {
        ownerSystemId: input.systemId,
        event: input.event,
        visibleFrontCount: visibleFrontNames.length,
      },
      push: {
        title,
        body: input.event === 'ended' ? body : 'Open Solara to see the shared front update.',
        url: '/notifications',
      },
    });
  }));
}

