import { createId } from '@paralleldrive/cuid2';
import { and, eq, or } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { db } from '@/lib/db';
import { systemBlocks, systemFriendMemberShares, systemFriendRequests, systemFriendships, systems } from '@/lib/db/schema';
import { err, ok, requireAuth } from '@/lib/api/helpers';
import { canonicalFriendPair } from '@/lib/friends';

function parseBlockedSystemId(body: unknown): string {
  const value = (body as { blockedSystemId?: unknown })?.blockedSystemId;
  return typeof value === 'string' ? value.trim() : '';
}

// POST /api/friends/blocks
// Body: { blockedSystemId: string }
export async function POST(request: Request) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return err('Invalid request payload.', 400);
  }

  const blockedSystemId = parseBlockedSystemId(body);
  if (!blockedSystemId) return err('Blocked account is required.', 400);
  if (blockedSystemId === auth.systemId) return err('You cannot block your own account.', 400);

  const blockedAccount = await db.query.systems.findFirst({
    columns: { id: true, name: true, accountType: true },
    where: eq(systems.id, blockedSystemId),
  });

  if (!blockedAccount) {
    return err('Account not found.', 404);
  }

  const pair = canonicalFriendPair(auth.systemId, blockedSystemId);

  const result = await db.transaction(async (tx) => {
    const created = await tx
      .insert(systemBlocks)
      .values({
        id: createId(),
        blockerSystemId: auth.systemId,
        blockedSystemId,
        createdAt: new Date(),
      })
      .onConflictDoNothing()
      .returning({
        id: systemBlocks.id,
        createdAt: systemBlocks.createdAt,
      });

    await tx
      .delete(systemFriendships)
      .where(and(
        eq(systemFriendships.systemAId, pair.systemAId),
        eq(systemFriendships.systemBId, pair.systemBId),
      ));

    await tx
      .delete(systemFriendRequests)
      .where(and(
        eq(systemFriendRequests.status, 'pending'),
        or(
          and(
            eq(systemFriendRequests.senderSystemId, auth.systemId),
            eq(systemFriendRequests.receiverSystemId, blockedSystemId),
          ),
          and(
            eq(systemFriendRequests.senderSystemId, blockedSystemId),
            eq(systemFriendRequests.receiverSystemId, auth.systemId),
          ),
        ),
      ));

    await tx
      .delete(systemFriendMemberShares)
      .where(or(
        and(
          eq(systemFriendMemberShares.ownerSystemId, auth.systemId),
          eq(systemFriendMemberShares.friendSystemId, blockedSystemId),
        ),
        and(
          eq(systemFriendMemberShares.ownerSystemId, blockedSystemId),
          eq(systemFriendMemberShares.friendSystemId, auth.systemId),
        ),
      ));

    return {
      created: created[0] ?? null,
    };
  });

  revalidatePath('/friends');
  revalidatePath('/');

  return ok({
    blocked: true,
    alreadyBlocked: !result.created,
    blockId: result.created?.id ?? null,
    createdAt: result.created?.createdAt ?? null,
    account: blockedAccount,
  }, result.created ? 201 : 200);
}