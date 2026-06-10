import { and, eq, isNull } from 'drizzle-orm';
import { createId } from '@paralleldrive/cuid2';
import { db } from '@/lib/db';
import { notificationDeliveries, notificationPushTokens, notifications } from '@/lib/db/schema';
import { requireAuth } from '@/lib/api/helpers';
import { NextResponse } from 'next/server';
import { decryptPushSubscription } from '@/lib/notifications/tokens';
import { sendFcmMessages, shouldRevokeFcmToken } from '@/lib/notifications/fcm';
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
function readStoredFcmToken(json: string): string | null {
  try {
    const parsed = JSON.parse(json) as { provider?: unknown; token?: unknown };
    if (parsed.provider !== 'fcm') return null;
    return typeof parsed.token === 'string' && parsed.token.trim()
      ? parsed.token.trim()
      : null;
  } catch {
    return null;
  }
}

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

  const webSendable = tokens.flatMap((tokenRow) => {
    if (tokenRow.platform === 'android-fcm') return [];
    try {
      const parsed = JSON.parse(decryptPushSubscription(tokenRow.encryptedToken));
      return [{ tokenRow, subscription: parsed }];
    } catch {
      return [];
    }
  });

  const fcmSendable = tokens.flatMap((tokenRow) => {
    if (tokenRow.platform !== 'android-fcm') return [];
    try {
      const token = readStoredFcmToken(decryptPushSubscription(tokenRow.encryptedToken));
      return token ? [{ tokenRow, token }] : [];
    } catch {
      return [];
    }
  });

  if (webSendable.length === 0 && fcmSendable.length === 0) {
    // Tokens exist but none could be decrypted — a crypto/secret problem, not a
    // delivery one. Surface it distinctly instead of a generic failure.
    return NextResponse.json(
      { success: false, error: 'decrypt_failed', data: { tokens: tokens.length, decryptable: 0 } },
      { status: 500 },
    );
  }

  const now = new Date();
  const notificationId = 'selftest-' + createId();

  // The notification row MUST exist before delivery rows — notification_deliveries
  // has a FK to notifications.id. (Skipping this was the bug that made every
  // self-test return a 500 / "Couldn't deliver" even when the push was sent.)
  // Best-effort: if logging fails we still report the real send outcome below.
  let loggable = true;
  try {
    await db.insert(notifications).values({
      id: notificationId,
      recipientSystemId: auth.systemId,
      actorSystemId: null,
      type: 'system_test',
      title: 'Solara',
      body: 'Tudo certo! Suas notificações estão ativas. 🌟',
      data: null,
      readAt: now, // self-test: don't leave an unread badge behind
      createdAt: now,
    });
  } catch {
    loggable = false;
  }

  const title = 'Solara';
  const body = 'Tudo certo! Suas notificações estão ativas. 🌟';

  const webResults = await sendPushMessages(webSendable.map((item) => ({
    subscription: item.subscription,
    title,
    body,
    notificationId,
    url: '/notifications',
  })));

  const fcmResults = await sendFcmMessages(fcmSendable.map((item) => ({
    token: item.token,
    title,
    body,
    notificationId,
    url: '/notifications',
  })));

  const deviceDeliveries = [
    ...webResults.map((result, index) => ({
      item: webSendable[index],
      result,
      revoke: shouldRevokePushSubscription(result.errorCode),
      target: 'web' as const,
    })),
    ...fcmResults.map((result, index) => ({
      item: fcmSendable[index],
      result,
      revoke: shouldRevokeFcmToken(result.errorCode),
      target: 'fcm' as const,
    })),
  ];

  const devices = await Promise.all(deviceDeliveries.map(async (delivery) => {
    const item = delivery.item;
    if (!item) return null;

    if (loggable) {
      try {
        await db.insert(notificationDeliveries).values({
          id: createId(),
          notificationId,
          pushTokenId: item.tokenRow.id,
          status: delivery.result.success ? 'sent' : 'failed',
          errorCode: delivery.result.errorCode,
          attempts: 1,
          sentAt: delivery.result.success ? now : null,
          createdAt: now,
          updatedAt: now,
        });
      } catch { /* logging is best-effort — never mask the real send result */ }
    }

    if (!delivery.result.success && delivery.revoke) {
      try {
        await db.update(notificationPushTokens)
          .set({ revokedAt: now, updatedAt: now })
          .where(eq(notificationPushTokens.id, item.tokenRow.id));
      } catch { /* ignore */ }
    }

    let endpointHost = 'unknown';
    if (delivery.target === 'fcm') {
      endpointHost = 'fcm.googleapis.com';
    } else if ('subscription' in item) {
      try { endpointHost = new URL(item.subscription.endpoint).host; } catch { /* ignore */ }
    }

    return {
      endpointHost,
      platform: item.tokenRow.platform,
      success: delivery.result.success,
      errorCode: delivery.result.errorCode,
    };
  }));

  const cleanDevices = devices.filter((device): device is NonNullable<typeof device> => Boolean(device));
  const sent = cleanDevices.filter((d) => d.success).length;

  return NextResponse.json({
    success: sent > 0,
    data: {
      tokens: tokens.length,
      sent,
      failed: cleanDevices.length - sent,
      devices: cleanDevices,
    },
  });
}
