import { and, eq, isNull, desc } from 'drizzle-orm';
import { db } from '@/lib/db';
import { systems, notificationPushTokens, notificationDeliveries } from '@/lib/db/schema';
import { createNotification } from '@/lib/notifications/create-notification';
import { err, ok } from '@/lib/api/helpers';

// TEMP test endpoint — hardcoded to project owner. Remove after verification.

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const ALLOWED_EMAIL = 'solara.julia.a@gmail.com';

const globalForRateLimit = globalThis as unknown as { __solaraTestNotifyLast?: number };
const MIN_INTERVAL_MS = 3_000;

async function diag(systemId: string) {
  const [activeTokens, allTokens, recentDeliveries] = await Promise.all([
    db.query.notificationPushTokens.findMany({
      columns: { id: true, platform: true, userAgent: true, lastSeenAt: true, createdAt: true },
      where: and(eq(notificationPushTokens.systemId, systemId), isNull(notificationPushTokens.revokedAt)),
    }),
    db.select({ id: notificationPushTokens.id, revokedAt: notificationPushTokens.revokedAt })
      .from(notificationPushTokens)
      .where(eq(notificationPushTokens.systemId, systemId)),
    db.select({
      id: notificationDeliveries.id,
      status: notificationDeliveries.status,
      errorCode: notificationDeliveries.errorCode,
      attempts: notificationDeliveries.attempts,
      sentAt: notificationDeliveries.sentAt,
      createdAt: notificationDeliveries.createdAt,
      pushTokenId: notificationDeliveries.pushTokenId,
    })
      .from(notificationDeliveries)
      .orderBy(desc(notificationDeliveries.createdAt))
      .limit(10),
  ]);

  return {
    activePushTokenCount: activeTokens.length,
    revokedPushTokenCount: allTokens.length - activeTokens.length,
    activeTokens: activeTokens.map((t) => ({
      id: t.id,
      platform: t.platform,
      userAgent: t.userAgent?.slice(0, 80) ?? null,
      lastSeenAt: t.lastSeenAt,
      createdAt: t.createdAt,
    })),
    vapidConfigured: Boolean(
      process.env.NEXT_PUBLIC_WEB_PUSH_VAPID_PUBLIC_KEY
      && process.env.WEB_PUSH_VAPID_PRIVATE_KEY
      && process.env.WEB_PUSH_VAPID_SUBJECT,
    ),
    recentDeliveries: recentDeliveries.map((d) => ({
      status: d.status,
      errorCode: d.errorCode,
      attempts: d.attempts,
      sentAt: d.sentAt,
      createdAt: d.createdAt,
    })),
  };
}

// GET — diagnostic only
export async function GET() {
  const recipient = await db.query.systems.findFirst({
    columns: { id: true, name: true, email: true },
    where: eq(systems.email, ALLOWED_EMAIL),
  });
  if (!recipient) return err(`No system found for ${ALLOWED_EMAIL}.`, 404);
  const d = await diag(recipient.id);
  return ok({ recipient, ...d });
}

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

  // Wait briefly for the fire-and-forget push fanout to write delivery rows,
  // then return diagnostics so we can tell what happened.
  await new Promise((resolve) => setTimeout(resolve, 2_000));
  const d = await diag(recipient.id);

  return ok({
    sent: true,
    notificationId: notification.id,
    recipientName: recipient.name,
    ...d,
  });
}
