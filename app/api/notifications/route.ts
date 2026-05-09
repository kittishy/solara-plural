import { and, eq, isNull } from 'drizzle-orm';
import { db } from '@/lib/db';
import { notifications } from '@/lib/db/schema';
import { ok, requireAuth } from '@/lib/api/helpers';

function parseLimit(value: string | null): number {
  const parsed = Number.parseInt(value ?? '', 10);
  if (!Number.isFinite(parsed)) return 30;
  return Math.min(Math.max(parsed, 1), 80);
}

function parseData(value: string | null): Record<string, unknown> | null {
  if (!value) return null;
  try {
    const parsed = JSON.parse(value);
    return typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)
      ? parsed as Record<string, unknown>
      : null;
  } catch {
    return null;
  }
}

export async function GET(request: Request) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  const url = new URL(request.url);
  const limit = parseLimit(url.searchParams.get('limit'));
  const unreadOnly = url.searchParams.get('unreadOnly') === '1';

  const rows = await db.query.notifications.findMany({
    where: unreadOnly
      ? and(eq(notifications.recipientSystemId, auth.systemId), isNull(notifications.readAt))
      : eq(notifications.recipientSystemId, auth.systemId),
    orderBy: (notification, { desc }) => [desc(notification.createdAt)],
    limit,
  });

  const unreadCountRows = await db.select({ id: notifications.id })
    .from(notifications)
    .where(and(
      eq(notifications.recipientSystemId, auth.systemId),
      isNull(notifications.readAt),
    ));

  return ok({
    notifications: rows.map((row) => ({
      ...row,
      data: parseData(row.data),
    })),
    unreadCount: unreadCountRows.length,
  }, 200, {
    headers: {
      'Cache-Control': 'private, max-age=0, s-maxage=10, stale-while-revalidate=20',
    },
  });
}
