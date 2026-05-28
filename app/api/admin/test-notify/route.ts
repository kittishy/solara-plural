import { eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { systems } from '@/lib/db/schema';
import { createNotification } from '@/lib/notifications/create-notification';
import { err, ok } from '@/lib/api/helpers';

// TEMP test endpoint — sends a test notification to the project owner only.
// No auth needed (hardcoded recipient + simple rate limit). Remove after
// notifications are verified working.

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const ALLOWED_EMAIL = 'solara.julia.a@gmail.com';

const globalForRateLimit = globalThis as unknown as { __solaraTestNotifyLast?: number };
const MIN_INTERVAL_MS = 5_000;

export async function POST(request: Request) {
  const now = Date.now();
  const last = globalForRateLimit.__solaraTestNotifyLast ?? 0;
  if (now - last < MIN_INTERVAL_MS) {
    return err('Too frequent. Wait a few seconds.', 429);
  }
  globalForRateLimit.__solaraTestNotifyLast = now;

  let body: { title?: string; body?: string } = {};
  try { body = await request.json(); } catch { /* empty body ok */ }

  const recipient = await db.query.systems.findFirst({
    columns: { id: true, name: true, email: true },
    where: eq(systems.email, ALLOWED_EMAIL),
  });
  if (!recipient) return err(`No system found for ${ALLOWED_EMAIL}.`, 404);

  const title = body.title?.trim() || 'Solara test notification';
  const messageBody = body.body?.trim() || 'If you see this, push + in-app delivery are working.';

  const notification = await createNotification({
    recipientSystemId: recipient.id,
    actorSystemId: null,
    type: 'test_notification',
    title,
    body: messageBody,
    data: { test: true },
    push: { title, body: messageBody, url: '/notifications' },
  });

  return ok({
    sent: true,
    recipientSystemId: recipient.id,
    recipientName: recipient.name,
    notificationId: notification.id,
  });
}
