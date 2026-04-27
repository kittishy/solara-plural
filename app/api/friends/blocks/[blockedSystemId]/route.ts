import { and, eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { db } from '@/lib/db';
import { systemBlocks } from '@/lib/db/schema';
import { err, ok, requireAuth } from '@/lib/api/helpers';

type Params = { params: Promise<{ blockedSystemId: string }> };

// DELETE /api/friends/blocks/[blockedSystemId]
// Removes a directional block created by the signed-in account.
export async function DELETE(_request: Request, { params }: Params) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  const { blockedSystemId } = await params;
  if (!blockedSystemId) return err('Blocked account is required.', 400);

  const deleted = await db
    .delete(systemBlocks)
    .where(and(
      eq(systemBlocks.blockerSystemId, auth.systemId),
      eq(systemBlocks.blockedSystemId, blockedSystemId),
    ))
    .returning({ id: systemBlocks.id });

  if (!deleted.length) {
    return err('Block not found.', 404);
  }

  revalidatePath('/friends');
  revalidatePath('/');

  return ok({
    unblocked: true,
    blockedSystemId,
  });
}