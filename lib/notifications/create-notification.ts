import { and, eq, isNull } from 'drizzle-orm';
import { createId } from '@paralleldrive/cuid2';
import { waitUntil } from '@vercel/functions';
import { db } from '@/lib/db';
import {
  notificationDeliveries,
  notificationPushTokens,
  notifications,
} from '@/lib/db/schema';
import { decryptPushSubscription } from '@/lib/notifications/tokens';
import { sendFcmMessages, shouldRevokeFcmToken } from '@/lib/notifications/fcm';
import { sendPushMessages, shouldRevokePushSubscription } from '@/lib/notifications/web-push';
import { publishNotification } from '@/lib/notifications/realtime-broker';

export type CreateNotificationInput = {
  recipientSystemId: string;
  actorSystemId?: string | null;
  type: string;
  title: string;
  body: string;
  data?: Record<string, string | number | boolean | null>;
  push?: {
    title?: string;
    body?: string;
    url?: string;
  };
};

export async function createNotification(input: CreateNotificationInput) {
  const now = new Date();
  const [notification] = await db.insert(notifications).values({
    id: createId(),
    recipientSystemId: input.recipientSystemId,
    actorSystemId: input.actorSystemId ?? null,
    type: input.type,
    title: input.title,
    body: input.body,
    data: input.data ? JSON.stringify(input.data) : null,
    readAt: null,
    createdAt: now,
  }).returning();

  // 1. Wake any in-app listeners for this recipient immediately. Same process
  //    only, but for the most common case (a single Vercel function handles
  //    both writer and reader) this is instant.
  publishNotification(input.recipientSystemId, {
    id: notification.id,
    type: notification.type,
    title: notification.title,
    body: notification.body,
    createdAt: notification.createdAt instanceof Date
      ? notification.createdAt.toISOString()
      : new Date(notification.createdAt as unknown as number).toISOString(),
  });

  // 2. Push delivery must not delay the API response (200-2000ms of external
  //    round-trips), but a bare floating promise dies when Vercel freezes the
  //    function right after the response — pushes then silently never leave.
  //    waitUntil keeps the instance alive until delivery settles while the
  //    response still returns immediately. Outside Vercel it degrades to the
  //    old fire-and-forget, which is fine because dev servers don't freeze.
  waitUntil(deliverPushForNotification({
    notificationId: notification.id,
    recipientSystemId: input.recipientSystemId,
    title: input.push?.title ?? input.title,
    body: input.push?.body ?? input.body,
    url: input.push?.url ?? '/notifications',
  }).catch((error) => {
    console.error('[notifications] push delivery failed', {
      event: 'push_delivery_failed',
      notificationId: notification.id,
      error: error instanceof Error ? error.message : 'unknown_error',
    });
  }));

  return notification;
}

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

async function deliverPushForNotification(input: {
  notificationId: string;
  recipientSystemId: string;
  title: string;
  body: string;
  url: string;
}) {
  const tokens = await db.query.notificationPushTokens.findMany({
    where: and(
      eq(notificationPushTokens.systemId, input.recipientSystemId),
      isNull(notificationPushTokens.revokedAt),
    ),
  });

  if (tokens.length === 0) return;

  const webSendable = tokens.flatMap((tokenRow) => {
    if (tokenRow.platform === 'android-fcm') return [];
    try {
      const parsed = JSON.parse(decryptPushSubscription(tokenRow.encryptedToken));
      return [{
        tokenRow,
        subscription: parsed,
      }];
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

  const [webResults, fcmResults] = await Promise.all([
    sendPushMessages(webSendable.map((item) => ({
      subscription: item.subscription,
      title: input.title,
      body: input.body,
      notificationId: input.notificationId,
      url: input.url,
    }))),
    sendFcmMessages(fcmSendable.map((item) => ({
      token: item.token,
      title: input.title,
      body: input.body,
      notificationId: input.notificationId,
      url: input.url,
    }))),
  ]);

  const now = new Date();
  const deliveries = [
    ...webResults.map((result, index) => ({
      tokenRow: webSendable[index]?.tokenRow,
      result,
      revoke: shouldRevokePushSubscription(result.errorCode),
    })),
    ...fcmResults.map((result, index) => ({
      tokenRow: fcmSendable[index]?.tokenRow,
      result,
      revoke: shouldRevokeFcmToken(result.errorCode),
    })),
  ];

  await Promise.all(deliveries.map(async (delivery) => {
    const tokenRow = delivery.tokenRow;
    if (!tokenRow) return;

    await db.insert(notificationDeliveries).values({
      id: createId(),
      notificationId: input.notificationId,
      pushTokenId: tokenRow.id,
      status: delivery.result.success ? 'sent' : 'failed',
      errorCode: delivery.result.errorCode,
      attempts: 1,
      sentAt: delivery.result.success ? now : null,
      createdAt: now,
      updatedAt: now,
    });

    if (!delivery.result.success && delivery.revoke) {
      await db.update(notificationPushTokens)
        .set({ revokedAt: now, updatedAt: now })
        .where(eq(notificationPushTokens.id, tokenRow.id));
    }
  }));
}
