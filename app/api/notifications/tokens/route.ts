import { and, eq } from 'drizzle-orm';
import { createId } from '@paralleldrive/cuid2';
import { db } from '@/lib/db';
import { notificationPushTokens } from '@/lib/db/schema';
import { err, ok, requireAuth, parseJsonRecord, parseJsonBody } from '@/lib/api/helpers';
import { encryptPushSubscription, hashPushEndpoint } from '@/lib/notifications/tokens';

type PushSubscriptionPayload = {
  endpoint?: unknown;
  keys?: {
    p256dh?: unknown;
    auth?: unknown;
  };
};

function readSubscription(value: unknown): { endpoint: string; json: string } | null {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return null;
  const payload = value as PushSubscriptionPayload;
  const endpoint = typeof payload.endpoint === 'string' ? payload.endpoint.trim() : '';
  const p256dh = typeof payload.keys?.p256dh === 'string' ? payload.keys.p256dh.trim() : '';
  const auth = typeof payload.keys?.auth === 'string' ? payload.keys.auth.trim() : '';
  if (!endpoint || !p256dh || !auth) return null;

  return {
    endpoint,
    json: JSON.stringify({
      endpoint,
      keys: { p256dh, auth },
    }),
  };
}

export async function POST(request: Request) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  const parsed = await parseJsonRecord(request);
  if (parsed.error) return parsed.error;
  const subscription = readSubscription(parsed.data.subscription);
  if (!subscription) return err('Missing push subscription.');

  const now = new Date();
  const tokenHash = hashPushEndpoint(subscription.endpoint);
  const userAgent = request.headers.get('user-agent')?.slice(0, 500) ?? null;

  const existing = await db.query.notificationPushTokens.findFirst({
    where: and(
      eq(notificationPushTokens.systemId, auth.systemId),
      eq(notificationPushTokens.tokenHash, tokenHash),
    ),
  });

  if (existing) {
    const [updated] = await db.update(notificationPushTokens)
      .set({
        encryptedToken: encryptPushSubscription(subscription.json),
        platform: 'web',
        userAgent,
        lastSeenAt: now,
        revokedAt: null,
        updatedAt: now,
      })
      .where(eq(notificationPushTokens.id, existing.id))
      .returning();

    return ok({ id: updated.id, lastSeenAt: updated.lastSeenAt });
  }

  const [created] = await db.insert(notificationPushTokens).values({
    id: createId(),
    systemId: auth.systemId,
    tokenHash,
    encryptedToken: encryptPushSubscription(subscription.json),
    platform: 'web',
    userAgent,
    lastSeenAt: now,
    revokedAt: null,
    createdAt: now,
    updatedAt: now,
  }).returning();

  return ok({ id: created.id, lastSeenAt: created.lastSeenAt }, 201);
}

export async function DELETE(request: Request) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  const parsedDel = await parseJsonBody<{ endpoint?: unknown }>(request);
  const endpoint = !parsedDel.error && typeof parsedDel.data.endpoint === 'string'
    ? parsedDel.data.endpoint.trim()
    : '';
  if (!endpoint) return err('Missing push endpoint.');

  const now = new Date();
  const tokenHash = hashPushEndpoint(endpoint);
  await db.update(notificationPushTokens)
    .set({ revokedAt: now, updatedAt: now })
    .where(and(
      eq(notificationPushTokens.systemId, auth.systemId),
      eq(notificationPushTokens.tokenHash, tokenHash),
    ));

  return ok({ revoked: true });
}
