import { and, eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { notifications } from '@/lib/db/schema';
import { err, ok, requireAuth } from '@/lib/api/helpers';

type Params = { params: { id: string } };

export async function PATCH(request: Request, { params }: Params) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  const body = await request.json().catch(() => null);
  const read = (body as { read?: unknown } | null)?.read !== false;

  const updated = await db.update(notifications)
    .set({ readAt: read ? new Date() : null })
    .where(and(
      eq(notifications.id, params.id),
      eq(notifications.recipientSystemId, auth.systemId),
    ))
    .returning();

  if (!updated.length) return err('Notification not found.', 404);
  return ok(updated[0]);
}

