import { eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { systems } from '@/lib/db/schema';
import { createNotification } from '@/lib/notifications/create-notification';
import { err, ok } from '@/lib/api/helpers';

// TEMP test endpoint — sends a test notification to a user by email.
// Gated by Bearer NEXTAUTH_SECRET. Remove after verifying notifications work.

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(request: Request) {
  const secret = process.env.NEXTAUTH_SECRET;
  if (!secret) return err('Server not configured.', 500);

  const auth = request.headers.get('authorization') ?? '';
  const expected = `Bearer ${secret}`;
  if (auth !== expected) return err('Forbidden.', 403);

  let body: { email?: string; title?: string; body?: string } = {};
  try { body = await request.json(); } catch { return err('Invalid JSON.', 400); }

  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
  if (!email) return err('email is required.', 400);

  const recipient = await db.query.systems.findFirst({
    columns: { id: true, name: true, email: true },
    where: eq(systems.email, email),
  });
  if (!recipient) return err(`No system found for ${email}.`, 404);

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
