import { and, eq } from 'drizzle-orm';
import { createId } from '@paralleldrive/cuid2';
import { db } from '@/lib/db';
import { notificationPushTokens } from '@/lib/db/schema';
import { err, ok, parseJsonRecord, requireAuth } from '@/lib/api/helpers';
import { encryptPushSubscription, hashPushEndpoint } from '@/lib/notifications/tokens';

const NATIVE_FCM_PLATFORM = 'android-fcm';

function readFcmToken(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const token = value.trim();
  if (token.length < 20 || token.length > 4096) return null;
  return token;
}

export async function POST(request: Request) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  const parsed = await parseJsonRecord(request);
  if (parsed.error) return parsed.error;

  const token = readFcmToken(parsed.data.token);
  if (!token) return err('Missing native FCM token.');

  // Only one native platform exists today; the field is accepted for forward
  // compatibility but always normalized to android-fcm.
  const platform = NATIVE_FCM_PLATFORM;

  const now = new Date();
  const tokenHash = hashPushEndpoint(`fcm:${token}`);
  const userAgent = request.headers.get('user-agent')?.slice(0, 500) ?? null;
  const encryptedToken = encryptPushSubscription(JSON.stringify({
    provider: 'fcm',
    token,
  }));

  const existing = await db.query.notificationPushTokens.findFirst({
    where: and(
      eq(notificationPushTokens.systemId, auth.systemId),
      eq(notificationPushTokens.tokenHash, tokenHash),
    ),
  });

  if (existing) {
    const [updated] = await db.update(notificationPushTokens)
      .set({
        encryptedToken,
        platform,
        userAgent,
        lastSeenAt: now,
        revokedAt: null,
        updatedAt: now,
      })
      .where(eq(notificationPushTokens.id, existing.id))
      .returning();

    return ok({ id: updated.id, platform: updated.platform, lastSeenAt: updated.lastSeenAt });
  }

  const [created] = await db.insert(notificationPushTokens).values({
    id: createId(),
    systemId: auth.systemId,
    tokenHash,
    encryptedToken,
    platform,
    userAgent,
    lastSeenAt: now,
    revokedAt: null,
    createdAt: now,
    updatedAt: now,
  }).returning();

  return ok({ id: created.id, platform: created.platform, lastSeenAt: created.lastSeenAt }, 201);
}

export async function DELETE(request: Request) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  const parsed = await parseJsonRecord(request);
  if (parsed.error) return parsed.error;

  const token = readFcmToken(parsed.data.token);
  if (!token) return err('Missing native FCM token.');

  const now = new Date();
  const tokenHash = hashPushEndpoint(`fcm:${token}`);

  await db.update(notificationPushTokens)
    .set({ revokedAt: now, updatedAt: now })
    .where(and(
      eq(notificationPushTokens.systemId, auth.systemId),
      eq(notificationPushTokens.tokenHash, tokenHash),
    ));

  return ok({ revoked: true });
}
