import { createId } from '@paralleldrive/cuid2';
import { and, eq, inArray, isNull, or } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { db } from '@/lib/db';
import {
  frontEntries,
  members,
  systemBlocks,
  systemFriendMemberShares,
  systemFriendRequests,
  systemFriendships,
  systems,
} from '@/lib/db/schema';
import { err, ok, requireAuth, parseJsonRecord } from '@/lib/api/helpers';
import { consumeDurableRateLimit } from '@/lib/rate-limit';
import {
  canonicalFriendPair,
  normalizeEmail,
  parseStoredFieldVisibilityJson,
  type FriendMemberFieldVisibility,
  type FriendMemberVisibility,
} from '@/lib/friends';
import { createNotification } from '@/lib/notifications/create-notification';

function mapRequestPayload(body: Record<string, unknown>): { email: string; message: string | null } {
  const email = typeof body.email === 'string' ? normalizeEmail(body.email) : '';
  const message = typeof body.message === 'string' ? body.message.trim().slice(0, 280) : '';

  return {
    email,
    message: message.length > 0 ? message : null,
  };
}

function parseMemberTags(value: string | null): string[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter((tag): tag is string => typeof tag === 'string') : [];
  } catch {
    return [];
  }
}

function parseMemberIds(value: string): string[] {
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === 'string') : [];
  } catch {
    return [];
  }
}

function visibleField<T>(
  value: T,
  fieldVisibility: FriendMemberFieldVisibility,
  key: keyof FriendMemberFieldVisibility,
): T | null {
  return fieldVisibility[key] ? value : null;
}

// GET /api/friends
// Lists friendships, pending requests, and block status for the signed-in account.
export async function GET() {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  const account = await db.query.systems.findFirst({
    columns: {
      id: true,
      name: true,
      accountType: true,
      email: true,
    },
    where: eq(systems.id, auth.systemId),
  });

  if (!account) return err('Account not found.', 404);

  const [friendships, incomingRequests, outgoingRequests, blocks] = await Promise.all([
    db.query.systemFriendships.findMany({
      where: or(
        eq(systemFriendships.systemAId, auth.systemId),
        eq(systemFriendships.systemBId, auth.systemId),
      ),
      orderBy: (friendship, { desc }) => [desc(friendship.createdAt)],
    }),
    db.query.systemFriendRequests.findMany({
      where: and(
        eq(systemFriendRequests.receiverSystemId, auth.systemId),
        eq(systemFriendRequests.status, 'pending'),
      ),
      orderBy: (friendRequest, { desc }) => [desc(friendRequest.createdAt)],
    }),
    db.query.systemFriendRequests.findMany({
      where: and(
        eq(systemFriendRequests.senderSystemId, auth.systemId),
        eq(systemFriendRequests.status, 'pending'),
      ),
      orderBy: (friendRequest, { desc }) => [desc(friendRequest.createdAt)],
    }),
    db.query.systemBlocks.findMany({
      where: or(
        eq(systemBlocks.blockerSystemId, auth.systemId),
        eq(systemBlocks.blockedSystemId, auth.systemId),
      ),
      orderBy: (block, { desc }) => [desc(block.createdAt)],
    }),
  ]);

  const relatedSystemIds = new Set<string>();

  for (const friendship of friendships) {
    relatedSystemIds.add(friendship.systemAId === auth.systemId ? friendship.systemBId : friendship.systemAId);
  }

  for (const incoming of incomingRequests) {
    relatedSystemIds.add(incoming.senderSystemId);
  }

  for (const outgoing of outgoingRequests) {
    relatedSystemIds.add(outgoing.receiverSystemId);
  }

  for (const block of blocks) {
    relatedSystemIds.add(block.blockerSystemId === auth.systemId ? block.blockedSystemId : block.blockerSystemId);
  }

  const relatedProfiles = relatedSystemIds.size > 0
    ? await db.query.systems.findMany({
        columns: { id: true, name: true, description: true, accountType: true, avatarMode: true, avatarEmoji: true, avatarUrl: true },
        where: inArray(systems.id, Array.from(relatedSystemIds)),
      })
    : [];

  const relatedById = new Map(relatedProfiles.map((profile) => [profile.id, profile]));
  const friendIds = friendships.map((friendship) => (
    friendship.systemAId === auth.systemId ? friendship.systemBId : friendship.systemAId
  ));

  const [incomingShareRows, sharedMemberRows, activeFrontRows] = friendIds.length > 0
    ? await Promise.all([
        db.query.systemFriendMemberShares.findMany({
          columns: {
            ownerSystemId: true,
            memberId: true,
            visibility: true,
            fieldVisibility: true,
          },
          where: and(
            inArray(systemFriendMemberShares.ownerSystemId, friendIds),
            eq(systemFriendMemberShares.friendSystemId, auth.systemId),
          ),
        }),
        db.query.members.findMany({
          columns: {
            id: true,
            systemId: true,
            name: true,
            pronouns: true,
            avatarUrl: true,
            description: true,
            color: true,
            role: true,
            tags: true,
            isArchived: true,
          },
          where: inArray(members.systemId, friendIds),
          orderBy: (member, { asc }) => [asc(member.name)],
        }),
        db.query.frontEntries.findMany({
          columns: {
            id: true,
            systemId: true,
            memberIds: true,
            startedAt: true,
          },
          where: and(
            inArray(frontEntries.systemId, friendIds),
            isNull(frontEntries.endedAt),
          ),
        }),
      ])
    : [[], [], []];

  const shareByMemberId = new Map(incomingShareRows.map((row) => [row.memberId, row]));
  const sharedMembersByFriendId = new Map<string, Array<{
    id: string;
    name: string;
    pronouns: string | null;
    avatarUrl: string | null;
    description: string | null;
    color: string | null;
    role: string | null;
    tags: string[];
    visibility: FriendMemberVisibility;
  }>>();
  const visibleMemberIdsByFriendId = new Map<string, Set<string>>();

  for (const member of sharedMemberRows) {
    if (member.isArchived === 1) continue;
    const share = shareByMemberId.get(member.id);
    if (!share || share.visibility === 'hidden') continue;

    const visibility = share.visibility as FriendMemberVisibility;
    const fieldVisibility = parseStoredFieldVisibilityJson(share.fieldVisibility, visibility);
    const visibleMember = {
      id: member.id,
      name: member.name,
      pronouns: visibleField(member.pronouns, fieldVisibility, 'pronouns'),
      avatarUrl: visibleField(member.avatarUrl, fieldVisibility, 'avatarUrl'),
      description: visibleField(member.description, fieldVisibility, 'description'),
      color: visibleField(member.color, fieldVisibility, 'color'),
      role: visibleField(member.role, fieldVisibility, 'role'),
      tags: fieldVisibility.tags ? parseMemberTags(member.tags) : [],
      visibility,
    };

    const existing = sharedMembersByFriendId.get(member.systemId) ?? [];
    existing.push(visibleMember);
    sharedMembersByFriendId.set(member.systemId, existing);

    const visibleIds = visibleMemberIdsByFriendId.get(member.systemId) ?? new Set<string>();
    visibleIds.add(member.id);
    visibleMemberIdsByFriendId.set(member.systemId, visibleIds);
  }

  const activeFrontByFriendId = new Map(activeFrontRows.map((row) => [row.systemId, row]));

  const friends = friendships
    .map((friendship) => {
      const friendId = friendship.systemAId === auth.systemId ? friendship.systemBId : friendship.systemAId;
      const profile = relatedById.get(friendId);
      if (!profile) return null;

      return {
        friendshipId: friendship.id,
        id: profile.id,
        name: profile.name,
        description: profile.description,
        accountType: profile.accountType,
        avatarMode: profile.avatarMode,
        avatarEmoji: profile.avatarEmoji,
        avatarUrl: profile.avatarUrl,
        connectedAt: friendship.createdAt,
        sharedMembers: sharedMembersByFriendId.get(profile.id) ?? [],
        currentFront: (() => {
          const activeFront = activeFrontByFriendId.get(profile.id);
          if (!activeFront) return null;

          const visibleIds = visibleMemberIdsByFriendId.get(profile.id) ?? new Set<string>();
          const parsedFrontMemberIds = parseMemberIds(activeFront.memberIds);
          const frontMemberIds = parsedFrontMemberIds.filter((id) => visibleIds.has(id));
          const visibleFrontMembers = (sharedMembersByFriendId.get(profile.id) ?? [])
            .filter((member) => frontMemberIds.includes(member.id));

          if (visibleFrontMembers.length === 0) return null;

          return {
            startedAt: activeFront.startedAt,
            members: visibleFrontMembers,
          };
        })(),
      };
    })
    .filter((entry): entry is NonNullable<typeof entry> => Boolean(entry));

  const incoming = incomingRequests
    .map((request) => {
      const from = relatedById.get(request.senderSystemId);
      if (!from) return null;

      return {
        requestId: request.id,
        from: {
          id: from.id,
          name: from.name,
          accountType: from.accountType,
        },
        message: request.message,
        createdAt: request.createdAt,
      };
    })
    .filter((entry): entry is NonNullable<typeof entry> => Boolean(entry));

  const outgoing = outgoingRequests
    .map((request) => {
      const to = relatedById.get(request.receiverSystemId);
      if (!to) return null;

      return {
        requestId: request.id,
        to: {
          id: to.id,
          name: to.name,
          accountType: to.accountType,
        },
        message: request.message,
        createdAt: request.createdAt,
      };
    })
    .filter((entry): entry is NonNullable<typeof entry> => Boolean(entry));

  const blockedByMe = blocks
    .filter((block) => block.blockerSystemId === auth.systemId)
    .map((block) => {
      const profile = relatedById.get(block.blockedSystemId);
      if (!profile) return null;

      return {
        blockId: block.id,
        system: {
          id: profile.id,
          name: profile.name,
          accountType: profile.accountType,
        },
        createdAt: block.createdAt,
      };
    })
    .filter((entry): entry is NonNullable<typeof entry> => Boolean(entry));

  const blockedMe = blocks
    .filter((block) => block.blockedSystemId === auth.systemId)
    .map((block) => {
      const profile = relatedById.get(block.blockerSystemId);
      if (!profile) return null;

      return {
        blockId: block.id,
        system: {
          id: profile.id,
          name: profile.name,
          accountType: profile.accountType,
        },
        createdAt: block.createdAt,
      };
    })
    .filter((entry): entry is NonNullable<typeof entry> => Boolean(entry));

  return ok(
    {
      account: {
        id: account.id,
        name: account.name,
        accountType: account.accountType,
        email: account.email,
      },
      friends,
      incomingRequests: incoming,
      outgoingRequests: outgoing,
      blocks: {
        blockedByMe,
        blockedMe,
      },
    },
    200,
    {
      headers: {
        // Short edge cache so a returning user (or the polling installed app)
        // reuses the recent payload while we revalidate in the background.
        // Friends listings are not persisted client-side (see
        // `NEVER_PERSIST_PREFIXES` in lib/swr-cache-provider.ts) because they
        // carry shared real-time state, so the edge cache is the only "warm"
        // layer — kept short to stay correct when a friend updates.
        'Cache-Control': 'private, max-age=0, s-maxage=20, stale-while-revalidate=60',
      },
    },
  );
}

// POST /api/friends
// Body: { email: string, message?: string }
export async function POST(request: Request) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  // Bounded per system: invites probe account existence by email, so the
  // rate limit is what keeps this from being an enumeration oracle at scale.
  const rate = await consumeDurableRateLimit(`friend-req:${auth.systemId}`, {
    limit: 20,
    windowMs: 60 * 60_000,
  });
  if (!rate.allowed) {
    return err(`Too many invites. Try again in ${rate.retryAfterSeconds}s.`, 429);
  }

  const parsed = await parseJsonRecord(request);
  if (parsed.error) return parsed.error;

  const { email, message } = mapRequestPayload(parsed.data);
  if (!email) return err('Friend email is required.', 400);

  const receiver = await db.query.systems.findFirst({
    columns: { id: true, name: true, accountType: true, email: true },
    where: eq(systems.email, email),
  });

  if (!receiver) {
    // Deliberately non-confirming: don't reveal whether the address has an
    // account (docs/SYSTEM_DESIGN.md §4).
    return err("We couldn't send an invite to that email right now.", 404);
  }

  if (receiver.id === auth.systemId) {
    return err('You cannot send a friend request to your own account.', 400);
  }

  const blockRecord = await db.query.systemBlocks.findFirst({
    where: or(
      and(
        eq(systemBlocks.blockerSystemId, auth.systemId),
        eq(systemBlocks.blockedSystemId, receiver.id),
      ),
      and(
        eq(systemBlocks.blockerSystemId, receiver.id),
        eq(systemBlocks.blockedSystemId, auth.systemId),
      ),
    ),
  });

  if (blockRecord) {
    if (blockRecord.blockerSystemId === auth.systemId) {
      return err('You blocked this account. Unblock to send an invite.', 403);
    }
    return err('This account is not available for invites right now.', 403);
  }

  const pair = canonicalFriendPair(auth.systemId, receiver.id);
  const friendship = await db.query.systemFriendships.findFirst({
    where: and(
      eq(systemFriendships.systemAId, pair.systemAId),
      eq(systemFriendships.systemBId, pair.systemBId),
    ),
  });

  if (friendship) {
    return err('You are already connected as friends.', 409);
  }

  const inversePending = await db.query.systemFriendRequests.findFirst({
    where: and(
      eq(systemFriendRequests.senderSystemId, receiver.id),
      eq(systemFriendRequests.receiverSystemId, auth.systemId),
      eq(systemFriendRequests.status, 'pending'),
    ),
  });

  if (inversePending) {
    const now = new Date();

    await db
      .update(systemFriendRequests)
      .set({
        status: 'accepted',
        respondedAt: now,
      })
      .where(eq(systemFriendRequests.id, inversePending.id));

    await db
      .insert(systemFriendships)
      .values({
        id: createId(),
        systemAId: pair.systemAId,
        systemBId: pair.systemBId,
        createdAt: now,
      })
      .onConflictDoNothing();

    // Notify both parties that they are now connected
    const sender = await db.query.systems.findFirst({
      columns: { name: true },
      where: eq(systems.id, auth.systemId),
    });
    await Promise.all([
      createNotification({
        recipientSystemId: receiver.id,
        actorSystemId: auth.systemId,
        type: 'friend_request_accepted',
        title: 'New friend connection',
        body: `${sender?.name ?? 'Someone'} accepted your friend request.`,
        data: { friendSystemId: auth.systemId },
        push: { url: '/friends' },
      }),
      createNotification({
        recipientSystemId: auth.systemId,
        actorSystemId: receiver.id,
        type: 'friend_request_accepted',
        title: 'New friend connection',
        body: `You and ${receiver.name} are now connected as friends.`,
        data: { friendSystemId: receiver.id },
        push: { url: '/friends' },
      }),
    ]);

    revalidatePath('/friends');
    revalidatePath('/');

    return ok({
      autoAccepted: true,
      requestId: inversePending.id,
      friend: {
        id: receiver.id,
        name: receiver.name,
        accountType: receiver.accountType,
      },
    });
  }

  const existingPending = await db.query.systemFriendRequests.findFirst({
    where: and(
      eq(systemFriendRequests.senderSystemId, auth.systemId),
      eq(systemFriendRequests.receiverSystemId, receiver.id),
      eq(systemFriendRequests.status, 'pending'),
    ),
  });

  if (existingPending) {
    return err('A request is already pending with this account.', 409);
  }

  const created = await db
    .insert(systemFriendRequests)
    .values({
      id: createId(),
      senderSystemId: auth.systemId,
      receiverSystemId: receiver.id,
      status: 'pending',
      message,
      createdAt: new Date(),
      respondedAt: null,
    })
    .returning({
      id: systemFriendRequests.id,
      createdAt: systemFriendRequests.createdAt,
    });

  const senderProfile = await db.query.systems.findFirst({
    columns: { name: true },
    where: eq(systems.id, auth.systemId),
  });

  await createNotification({
    recipientSystemId: receiver.id,
    actorSystemId: auth.systemId,
    type: 'friend_request_received',
    title: 'New friend request',
    body: message
      ? `${senderProfile?.name ?? 'Someone'} wants to connect: "${message}"`
      : `${senderProfile?.name ?? 'Someone'} sent you a friend request.`,
    data: { requestId: created[0]?.id ?? '' },
    push: { url: '/friends' },
  });

  revalidatePath('/friends');

  return ok({
    requestId: created[0]?.id,
    createdAt: created[0]?.createdAt ?? new Date(),
    to: {
      id: receiver.id,
      name: receiver.name,
      accountType: receiver.accountType,
    },
  }, 201);
}
