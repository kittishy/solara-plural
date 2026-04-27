import { createId } from '@paralleldrive/cuid2';
import { and, eq, or } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { db } from '@/lib/db';
import { systemBlocks, systemFriendRequests, systemFriendships } from '@/lib/db/schema';
import { err, ok, requireAuth } from '@/lib/api/helpers';
import { canonicalFriendPair } from '@/lib/friends';

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

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return err('Invalid request payload.', 400);
  }

  const action = parseAction((body as { action?: unknown })?.action);
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

  revalidatePath('/friends');
  revalidatePath('/');

  return ok({
    requestId: id,
    action,
    status: nextStatus,
  });
}
