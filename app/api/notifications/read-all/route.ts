import { and, eq, isNull } from 'drizzle-orm';
import { db } from '@/lib/db';
import { notifications } from '@/lib/db/schema';
import { ok, requireAuth } from '@/lib/api/helpers';

export async function POST() {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  const updated = await db.update(notifications)
    .set({ readAt: new Date() })
    .where(and(
      eq(notifications.recipientSystemId, auth.systemId),
      isNull(notifications.readAt),
    ))
    .returning({ id: notifications.id });

  return ok({ markedRead: updated.length });
}

