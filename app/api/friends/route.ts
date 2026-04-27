import { createId } from '@paralleldrive/cuid2';
import { and, eq, inArray, or } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { db } from '@/lib/db';
import { systemBlocks, systemFriendRequests, systemFriendships, systems } from '@/lib/db/schema';
import { err, ok, requireAuth } from '@/lib/api/helpers';
import { canonicalFriendPair, normalizeEmail } from '@/lib/friends';

function mapRequestPayload(body: unknown): { email: string; message: string | null } {
  const payload = body as { email?: unknown; message?: unknown };
  const email = typeof payload?.email === 'string' ? normalizeEmail(payload.email) : '';
  const message = typeof payload?.message === 'string' ? payload.message.trim().slice(0, 280) : '';

  return {
    email,
    message: message.length > 0 ? message : null,
  };
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
        columns: { id: true, name: true, description: true, accountType: true },
        where: inArray(systems.id, Array.from(relatedSystemIds)),
      })
    : [];

  const relatedById = new Map(relatedProfiles.map((profile) => [profile.id, profile]));

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
        connectedAt: friendship.createdAt,
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

  return ok({
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
  });
}

// POST /api/friends
// Body: { email: string, message?: string }
export async function POST(request: Request) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return err('Invalid request payload.', 400);
  }

  const { email, message } = mapRequestPayload(body);
  if (!email) return err('Friend email is required.', 400);

  const receiver = await db.query.systems.findFirst({
    columns: { id: true, name: true, accountType: true, email: true },
    where: eq(systems.email, email),
  });

  if (!receiver) {
    return err('No account found with that email yet.', 404);
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