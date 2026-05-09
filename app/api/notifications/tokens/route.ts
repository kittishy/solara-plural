import { and, eq } from 'drizzle-orm';
import { createId } from '@paralleldrive/cuid2';
import { db } from '@/lib/db';
import { notificationPushTokens } from '@/lib/db/schema';
import { err, ok, requireAuth } from '@/lib/api/helpers';
import { encryptPushToken, hashPushToken } from '@/lib/notifications/tokens';

function readToken(value: unknown): string {
  if (typeof value !== 'string') return '';
  return value.trim();
}

export async function POST(request: Request) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  const body = await request.json().catch(() => null);
  const token = readToken((body as { token?: unknown } | null)?.token);
  if (!token) return err('Missing push token.');

  const now = new Date();
  const tokenHash = hashPushToken(token);
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
        encryptedToken: encryptPushToken(token),
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
    encryptedToken: encryptPushToken(token),
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

  const body = await request.json().catch(() => null);
  const token = readToken((body as { token?: unknown } | null)?.token);
  if (!token) return err('Missing push token.');

  const now = new Date();
  const tokenHash = hashPushToken(token);
  await db.update(notificationPushTokens)
    .set({ revokedAt: now, updatedAt: now })
    .where(and(
      eq(notificationPushTokens.systemId, auth.systemId),
      eq(notificationPushTokens.tokenHash, tokenHash),
    ));

  return ok({ revoked: true });
}

