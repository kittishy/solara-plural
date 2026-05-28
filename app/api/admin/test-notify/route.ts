import { and, eq, isNull } from 'drizzle-orm';
import { db } from '@/lib/db';
import { systems, notificationPushTokens } from '@/lib/db/schema';
import { decryptPushSubscription } from '@/lib/notifications/tokens';
import { sendPushMessages } from '@/lib/notifications/web-push';
import { createNotification } from '@/lib/notifications/create-notification';
import { err, ok } from '@/lib/api/helpers';

// TEMP test endpoint — hardcoded to project owner. Remove after verification.

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const ALLOWED_EMAIL = 'solara.julia.a@gmail.com';

const globalForRateLimit = globalThis as unknown as { __solaraTestNotifyLast?: number };
const MIN_INTERVAL_MS = 3_000;

// Sends push DIRECTLY to all of Julia's active push tokens, awaiting the
// result so we can see exactly what's happening. Bypasses the fire-and-forget
// in createNotification to isolate the bug.
async function directPush(systemId: string, title: string, body: string, notificationId: string) {
  const tokens = await db.query.notificationPushTokens.findMany({
    where: and(eq(notificationPushTokens.systemId, systemId), isNull(notificationPushTokens.revokedAt)),
  });

  const perToken: Array<{
    id: string;
    platform: string;
    userAgent: string | null;
    decryptOk: boolean;
    decryptError: string | null;
    pushResult: { success: boolean; errorCode: string | null } | null;
  }> = [];

  const messages: Array<{ subscription: unknown; tokenIndex: number }> = [];

  for (const t of tokens) {
    try {
      const decrypted = decryptPushSubscription(t.encryptedToken);
      const parsed = JSON.parse(decrypted);
      perToken.push({
        id: t.id,
        platform: t.platform,
        userAgent: t.userAgent?.slice(0, 60) ?? null,
        decryptOk: true,
        decryptError: null,
        pushResult: null,
      });
      messages.push({ subscription: parsed, tokenIndex: perToken.length - 1 });
    } catch (e) {
      perToken.push({
        id: t.id,
        platform: t.platform,
        userAgent: t.userAgent?.slice(0, 60) ?? null,
        decryptOk: false,
        decryptError: e instanceof Error ? e.message : 'unknown',
        pushResult: null,
      });
    }
  }

  const results = await sendPushMessages(messages.map((m) => ({
    subscription: m.subscription as Parameters<typeof sendPushMessages>[0][0]['subscription'],
    title,
    body,
    notificationId,
    url: '/notifications',
  })));

  for (let i = 0; i < results.length; i++) {
    const idx = messages[i].tokenIndex;
    perToken[idx].pushResult = results[i];
  }

  return perToken;
}

export async function GET() {
  const recipient = await db.query.systems.findFirst({
    columns: { id: true, name: true, email: true },
    where: eq(systems.email, ALLOWED_EMAIL),
  });
  if (!recipient) return err(`No system found.`, 404);

  const tokens = await db.query.notificationPushTokens.findMany({
    where: and(eq(notificationPushTokens.systemId, recipient.id), isNull(notificationPushTokens.revokedAt)),
  });

  return ok({
    recipient,
    activePushTokenCount: tokens.length,
    vapidConfigured: Boolean(
      process.env.NEXT_PUBLIC_WEB_PUSH_VAPID_PUBLIC_KEY
      && process.env.WEB_PUSH_VAPID_PRIVATE_KEY
      && process.env.WEB_PUSH_VAPID_SUBJECT,
    ),
    secretsChain: {
      hasPushSubscriptionSecret: Boolean(process.env.PUSH_SUBSCRIPTION_SECRET),
      hasIntegrationsTokenSecret: Boolean(process.env.INTEGRATIONS_TOKEN_SECRET),
      hasNextAuthSecret: Boolean(process.env.NEXTAUTH_SECRET),
    },
  });
}

export async function POST(request: Request) {
  const now = Date.now();
  const last = globalForRateLimit.__solaraTestNotifyLast ?? 0;
  if (now - last < MIN_INTERVAL_MS) {
    return err('Too frequent. Wait a few seconds.', 429);
  }
  globalForRateLimit.__solaraTestNotifyLast = now;

  let body: { title?: string; body?: string; direct?: boolean } = {};
  try { body = await request.json(); } catch { /* empty body ok */ }

  const recipient = await db.query.systems.findFirst({
    columns: { id: true, name: true, email: true },
    where: eq(systems.email, ALLOWED_EMAIL),
  });
  if (!recipient) return err(`No system found.`, 404);

  const title = body.title?.trim() || 'Solara test notification';
  const messageBody = body.body?.trim() || 'If you see this, push + in-app delivery are working.';

  // DIRECT path: skip createNotification's fire-and-forget. Push to all
  // tokens inline and return the raw result.
  if (body.direct) {
    const tokenResults = await directPush(recipient.id, title, messageBody, 'direct-test-' + Date.now());
    return ok({ mode: 'direct', recipient, tokenResults });
  }

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
    mode: 'createNotification',
    sent: true,
    notificationId: notification.id,
    recipient,
  });
}
