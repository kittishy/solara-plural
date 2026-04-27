import { and, eq, or } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { db } from '@/lib/db';
import { systemFriendMemberShares, systemFriendships } from '@/lib/db/schema';
import { err, ok, requireAuth } from '@/lib/api/helpers';
import { canonicalFriendPair } from '@/lib/friends';

type Params = { params: Promise<{ friendSystemId: string }> };

// DELETE /api/friends/[friendSystemId]
// Removes an active friendship and any sharing configuration tied to it.
export async function DELETE(_request: Request, { params }: Params) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  const { friendSystemId } = await params;
  if (!friendSystemId) return err('Friend account is required.', 400);
  if (friendSystemId === auth.systemId) return err('You cannot unfriend your own account.', 400);

  const pair = canonicalFriendPair(auth.systemId, friendSystemId);

  const removedFriendship = await db.transaction(async (tx) => {
    const deleted = await tx
      .delete(systemFriendships)
      .where(and(
        eq(systemFriendships.systemAId, pair.systemAId),
        eq(systemFriendships.systemBId, pair.systemBId),
      ))
      .returning({ id: systemFriendships.id });

    if (!deleted.length) {
      return false;
    }

    await tx
      .delete(systemFriendMemberShares)
      .where(or(
        and(
          eq(systemFriendMemberShares.ownerSystemId, auth.systemId),
          eq(systemFriendMemberShares.friendSystemId, friendSystemId),
        ),
        and(
          eq(systemFriendMemberShares.ownerSystemId, friendSystemId),
          eq(systemFriendMemberShares.friendSystemId, auth.systemId),
        ),
      ));

    return true;
  });

  if (!removedFriendship) {
    return err('Friendship not found.', 404);
  }

  revalidatePath('/friends');
  revalidatePath('/');

  return ok({
    unfriended: true,
    friendSystemId,
  });
}