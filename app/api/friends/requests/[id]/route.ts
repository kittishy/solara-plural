import { createId } from '@paralleldrive/cuid2';
import { and, eq, or } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { db } from '@/lib/db';
import { systemBlocks, systemFriendRequests, systemFriendships, systems } from '@/lib/db/schema';
import { err, ok, requireAuth, parseJsonRecord } from '@/lib/api/helpers';
import { canonicalFriendPair } from '@/lib/friends';
import { createNotification } from '@/lib/notifications/create-notification';

type Params = { params: Promise<{ id: string }> };
type RequestAction = 'accept' | 'decline' | 'cancel';

function parseAction(value: unknown): RequestAction | null {
  if (value === 'accept' || value === 'decline' || value === 'cancel') return value;
  return null;
}

// POST /api/friends/requests/[id]
// Body: { action: "accept" | "decline" | "cancel" }
export async function POST(request: Request, { params }: Params) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  const { id } = await params;

  const parsed = await parseJsonRecord(request);
  if (parsed.error) return parsed.error;

  const action = parseAction(parsed.data.action);
  if (!action) return err('Invalid action.', 400);

  const friendRequest = await db.query.systemFriendRequests.findFirst({
    where: eq(systemFriendRequests.id, id),
  });

  if (!friendRequest) return err('Friend request not found.', 404);
  if (friendRequest.status !== 'pending') return err('This request is already closed.', 409);

  const isReceiver = friendRequest.receiverSystemId === auth.systemId;
  const isSender = friendRequest.senderSystemId === auth.systemId;

  if (action === 'cancel' && !isSender) {
    return err('Only the sender can cancel this request.', 403);
  }

  if ((action === 'accept' || action === 'decline') && !isReceiver) {
    return err('Only the receiver can respond to this request.', 403);
  }

  if (action === 'accept') {
    const block = await db.query.systemBlocks.findFirst({
      where: or(
        and(
          eq(systemBlocks.blockerSystemId, friendRequest.senderSystemId),
          eq(systemBlocks.blockedSystemId, friendRequest.receiverSystemId),
        ),
        and(
          eq(systemBlocks.blockerSystemId, friendRequest.receiverSystemId),
          eq(systemBlocks.blockedSystemId, friendRequest.senderSystemId),
        ),
      ),
    });

    if (block) {
      return err('Cannot accept this request while either account is blocked.', 403);
    }
  }

  const now = new Date();
  const nextStatus = action === 'accept'
    ? 'accepted'
    : action === 'decline'
      ? 'declined'
      : 'canceled';

  await db
    .update(systemFriendRequests)
    .set({
      status: nextStatus,
      respondedAt: now,
    })
    .where(and(
      eq(systemFriendRequests.id, id),
      eq(systemFriendRequests.status, 'pending'),
    ));

  if (action === 'accept') {
    const pair = canonicalFriendPair(friendRequest.senderSystemId, friendRequest.receiverSystemId);
    await db.insert(systemFriendships).values({
      id: createId(),
      systemAId: pair.systemAId,
      systemBId: pair.systemBId,
      createdAt: now,
    }).onConflictDoNothing();
  }

  // Notify relevant parties about the outcome
  const responderProfile = await db.query.systems.findFirst({
    columns: { name: true },
    where: eq(systems.id, auth.systemId),
  });

  if (action === 'accept') {
    // Notify the original sender that their request was accepted
    await createNotification({
      recipientSystemId: friendRequest.senderSystemId,
      actorSystemId: auth.systemId,
      type: 'friend_request_accepted',
      title: 'Friend request accepted',
      body: `${responderProfile?.name ?? 'Someone'} accepted your friend request. You are now connected!`,
      data: { friendSystemId: auth.systemId },
      push: { url: '/friends' },
    });
  } else if (action === 'decline') {
    // Notify the original sender that their request was declined (silent, no push)
    await createNotification({
      recipientSystemId: friendRequest.senderSystemId,
      actorSystemId: auth.systemId,
      type: 'friend_request_declined',
      title: 'Friend request declined',
      body: `${responderProfile?.name ?? 'Someone'} declined your friend request.`,
      data: { },
    });
  }

  revalidatePath('/friends');
  revalidatePath('/');

  return ok({
    requestId: id,
    action,
    status: nextStatus,
  });
}
