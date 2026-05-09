import { and, eq, isNull } from 'drizzle-orm';
import { createId } from '@paralleldrive/cuid2';
import { db } from '@/lib/db';
import {
  notificationDeliveries,
  notificationPushTokens,
  notifications,
} from '@/lib/db/schema';
import { decryptPushSubscription } from '@/lib/notifications/tokens';
import { sendPushMessages, shouldRevokePushSubscription } from '@/lib/notifications/web-push';

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

  await deliverPushForNotification({
    notificationId: notification.id,
    recipientSystemId: input.recipientSystemId,
    title: input.push?.title ?? input.title,
    body: input.push?.body ?? input.body,
    url: input.push?.url ?? '/notifications',
  });

  return notification;
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

  const sendable = tokens.flatMap((tokenRow) => {
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

  const results = await sendPushMessages(sendable.map((item) => ({
    subscription: item.subscription,
    title: input.title,
    body: input.body,
    notificationId: input.notificationId,
    url: input.url,
  })));

  const now = new Date();
  await Promise.all(results.map(async (result, index) => {
    const tokenRow = sendable[index]?.tokenRow;
    if (!tokenRow) return;

    await db.insert(notificationDeliveries).values({
      id: createId(),
      notificationId: input.notificationId,
      pushTokenId: tokenRow.id,
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
        .where(eq(notificationPushTokens.id, tokenRow.id));
    }
  }));
}
