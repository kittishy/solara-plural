import { and, eq, isNull } from 'drizzle-orm';
import { createId } from '@paralleldrive/cuid2';
import { db } from '@/lib/db';
import { notificationDeliveries, notificationPushTokens } from '@/lib/db/schema';
import { requireAuth } from '@/lib/api/helpers';
import { NextResponse } from 'next/server';
import { decryptPushSubscription } from '@/lib/notifications/tokens';
import { sendPushMessages, shouldRevokePushSubscription } from '@/lib/notifications/web-push';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// Self-test push. Sends a notification ONLY to the caller's own active
// subscriptions and AWAITS the push-service round-trip so the response carries
// a real per-device result (HTTP status from FCM/Mozilla). This is the button
// a user taps on their own phone to confirm notifications work — and the only
// supported way to send a test (never targets other users).
//
// Copy is intentionally neutral and brand-voiced.
export async function POST() {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  const tokens = await db.query.notificationPushTokens.findMany({
    where: and(
      eq(notificationPushTokens.systemId, auth.systemId),
      isNull(notificationPushTokens.revokedAt),
    ),
  });

  if (tokens.length === 0) {
    return NextResponse.json(
      { success: false, error: 'no_active_subscriptions', data: { tokens: 0 } },
      { status: 409 },
    );
  }

  const sendable = tokens.flatMap((tokenRow) => {
    try {
      const parsed = JSON.parse(decryptPushSubscription(tokenRow.encryptedToken));
      return [{ tokenRow, subscription: parsed }];
    } catch {
      return [];
    }
  });

  const notificationId = 'selftest-' + createId();
  const results = await sendPushMessages(sendable.map((item) => ({
    subscription: item.subscription,
    title: 'Solara',
    body: 'Tudo certo! Suas notificações estão ativas. 🌟',
    notificationId,
    url: '/notifications',
  })));

  const now = new Date();
  const perDevice = await Promise.all(results.map(async (result, index) => {
    const item = sendable[index];
    if (!item) return null;

    await db.insert(notificationDeliveries).values({
      id: createId(),
      notificationId,
      pushTokenId: item.tokenRow.id,
      status: result.success ? 'sent' : 'failed',
      errorCode: result.errorCode,
      attempts: 1,
      sentAt: result.success ? now : null,
      createdAt: now,
      updatedAt: now,
    });

    if (!result.success && shouldRevokePushSubscription(result.errorCode)) {
      await db.update(notificationPushTokens)
        .set({ revokedAt: now, updatedAt: now })
        .where(eq(notificationPushTokens.id, item.tokenRow.id));
    }

    let endpointHost = 'unknown';
    try { endpointHost = new URL(item.subscription.endpoint).host; } catch { /* ignore */ }

    return {
      endpointHost,
      platform: item.tokenRow.platform,
      success: result.success,
      errorCode: result.errorCode,
    };
  }));

  const devices = perDevice.filter(Boolean);
  const sent = devices.filter((d) => d?.success).length;

  return NextResponse.json({
    success: sent > 0,
    data: {
      tokens: tokens.length,
      sent,
      failed: devices.length - sent,
      devices,
    },
  });
}
