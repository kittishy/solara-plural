import { db } from '@/lib/db';
import { notifications } from '@/lib/db/schema';
import { and, eq, isNull, desc } from 'drizzle-orm';
import { requireSystemId } from '@/lib/auth/session';
import NotificationsClient from './NotificationsClient';

// Pre-fetch notifications server-side so the client never shows a loading
// skeleton — data is ready on first render. SWR in the client still handles
// mutations (mark read / mark all read) after the initial paint.
export default async function NotificationsPage() {
  const systemId = await requireSystemId();

  const [rows, unreadRows] = await Promise.all([
    db.query.notifications.findMany({
      where: eq(notifications.recipientSystemId, systemId),
      orderBy: [desc(notifications.createdAt)],
      limit: 30,
    }),
    db.select({ id: notifications.id })
      .from(notifications)
      .where(and(
        eq(notifications.recipientSystemId, systemId),
        isNull(notifications.readAt),
      )),
  ]);

  const initialData = {
    notifications: rows.map((r) => ({
      id:        r.id,
      type:      r.type,
      title:     r.title,
      body:      r.body,
      readAt:    r.readAt,
      createdAt: r.createdAt,
    })),
    unreadCount: unreadRows.length,
  };

  return (
    <div className="max-w-3xl space-y-6">
      <NotificationsClient initialData={initialData} />
    </div>
  );
}
