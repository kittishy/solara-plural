import { and, eq, inArray, or } from 'drizzle-orm';
import { db } from '@/lib/db';
import {
  members,
  systemFriendMemberShares,
  systemFriendships,
  systems,
} from '@/lib/db/schema';
import { createNotification } from '@/lib/notifications/create-notification';

// Notifies every friend of `input.systemId` about a front change.
//
// All friends are notified by default — this is the core social signal of the
// app. Member-level visibility (systemFriendMemberShares) only controls how
// much detail the notification body includes:
//
//   - Friend can see one or more of the fronting members:
//       body mentions those names ("Alex, Sam are in front")
//   - Friend has no shared members or none in front:
//       body uses a generic message ("Their front changed.")
//
// This restores notifications for the common case where two systems become
// friends but haven't manually configured per-member sharing yet.
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

  const friendIds = friendships.map((friendship) => (
    friendship.systemAId === input.systemId ? friendship.systemBId : friendship.systemAId
  ));

  const [owner, visibleShares, frontMemberRows] = await Promise.all([
    db.query.systems.findFirst({
      columns: { name: true },
      where: eq(systems.id, input.systemId),
    }),
    db.query.systemFriendMemberShares.findMany({
      where: and(
        eq(systemFriendMemberShares.ownerSystemId, input.systemId),
        inArray(systemFriendMemberShares.friendSystemId, friendIds),
      ),
    }),
    input.memberIds.length > 0
      ? db.query.members.findMany({
          columns: { id: true, name: true },
          where: and(
            eq(members.systemId, input.systemId),
            inArray(members.id, input.memberIds),
          ),
        })
      : Promise.resolve([] as Array<{ id: string; name: string }>),
  ]);

  const ownerName = owner?.name ?? 'A friend';
  const memberNameById = new Map(frontMemberRows.map((member) => [member.id, member.name]));

  const visibleByFriend = new Map<string, Set<string>>();
  for (const share of visibleShares) {
    if (share.visibility === 'hidden') continue;
    const set = visibleByFriend.get(share.friendSystemId) ?? new Set<string>();
    set.add(share.memberId);
    visibleByFriend.set(share.friendSystemId, set);
  }

  await Promise.all(friendIds.map(async (friendSystemId) => {
    const visibleMemberIds = visibleByFriend.get(friendSystemId) ?? new Set<string>();

    const visibleFrontNames = input.memberIds
      .filter((memberId) => visibleMemberIds.has(memberId))
      .map((memberId) => memberNameById.get(memberId))
      .filter((name): name is string => Boolean(name));

    let title: string;
    let body: string;
    let pushBody: string;

    if (input.event === 'ended') {
      title = `${ownerName} ended their front`;
      body = 'They are not listing anyone in front right now.';
      pushBody = body;
    } else {
      title = `${ownerName} updated their front`;
      if (visibleFrontNames.length > 0) {
        body = `${visibleFrontNames.join(', ')} ${visibleFrontNames.length === 1 ? 'is' : 'are'} in front.`;
        pushBody = body;
      } else {
        body = 'Their front changed.';
        pushBody = 'Open Solara to see the update.';
      }
    }

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
        body: pushBody,
        url: '/friends',
      },
    });
  }));
}
