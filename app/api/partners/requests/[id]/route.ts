import { createId } from '@paralleldrive/cuid2';
import { and, eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { db } from '@/lib/db';
import { systemPartnerRequests, systemPartnerships } from '@/lib/db/schema';
import { err, ok, requireAuth } from '@/lib/api/helpers';
import { canonicalFriendPair } from '@/lib/friends';

type Params = { params: Promise<{ id: string }> };
type RequestAction = 'accept' | 'decline' | 'cancel';

function parseAction(value: unknown): RequestAction | null {
  if (value === 'accept' || value === 'decline' || value === 'cancel') return value;
  return null;
}

// POST /api/partners/requests/[id]
// Body: { action: "accept" | "decline" | "cancel" }
export async function POST(request: Request, { params }: Params) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  const { id } = await params;

  let body: unknown;
  try { body = await request.json(); } catch { return err('Invalid request payload.', 400); }

  const action = parseAction((body as { action?: unknown })?.action);
  if (!action) return err('Invalid action.', 400);

  const partnerRequest = await db.query.systemPartnerRequests.findFirst({
    where: eq(systemPartnerRequests.id, id),
  });

  if (!partnerRequest) return err('Partner request not found.', 404);
  if (partnerRequest.status !== 'pending') return err('This request is already closed.', 409);

  const isReceiver = partnerRequest.receiverSystemId === auth.systemId;
  const isSender = partnerRequest.senderSystemId === auth.systemId;

  if (action === 'cancel' && !isSender) return err('Only the sender can cancel this request.', 403);
  if ((action === 'accept' || action === 'decline') && !isReceiver) {
    return err('Only the receiver can respond to this request.', 403);
  }

  const now = new Date();
  const nextStatus = action === 'accept' ? 'accepted' : action === 'decline' ? 'declined' : 'canceled';

  await db.update(systemPartnerRequests)
    .set({ status: nextStatus, respondedAt: now })
    .where(and(
      eq(systemPartnerRequests.id, id),
      eq(systemPartnerRequests.status, 'pending'),
    ));

  if (action === 'accept') {
    const pair = canonicalFriendPair(partnerRequest.senderSystemId, partnerRequest.receiverSystemId);
    await db.insert(systemPartnerships).values({
      id: createId(),
      systemAId: pair.systemAId,
      systemBId: pair.systemBId,
      createdAt: now,
    }).onConflictDoNothing();
  }

  revalidatePath('/partners');

  return ok({ requestId: id, action, status: nextStatus });
}
