import { db } from '@/lib/db';
import { systemChatMessages } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { requireSystemAuth, ok, err } from '@/lib/api/helpers';

// DELETE /api/chat/[id] — delete a message owned by the authenticated system
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireSystemAuth();
  if (auth.error) return auth.error;

  const { id } = await params;

  const deleted = await db
    .delete(systemChatMessages)
    .where(
      and(
        eq(systemChatMessages.id, id),
        eq(systemChatMessages.systemId, auth.systemId),
      ),
    )
    .returning();

  if (!deleted.length) return err('Message not found', 404);

  return ok({ deleted: true });
}
