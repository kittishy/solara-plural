import { NextResponse } from 'next/server';
import { and, eq, isNull } from 'drizzle-orm';
import { createId } from '@paralleldrive/cuid2';
import { db } from '@/lib/db';
import { passwordResetTokens, systems } from '@/lib/db/schema';
import { parseJsonRecord } from '@/lib/api/helpers';
import { isPasswordResetEmailConfigured, sendPasswordResetEmail } from '@/lib/auth/password-reset-email';
import {
  generatePasswordResetToken,
  getPasswordResetExpiry,
  hashPasswordResetToken,
  normalizeEmail,
} from '@/lib/auth/password-reset';
import { consumeDurableRateLimit, getClientIp } from '@/lib/rate-limit';

function buildResetUrl(request: Request, token: string): string {
  const url = new URL('/reset-password', process.env.NEXTAUTH_URL ?? request.url);
  url.searchParams.set('token', token);
  return url.toString();
}

export async function POST(request: Request) {
  const ipLimit = await consumeDurableRateLimit(
    `password-reset-request:ip:${getClientIp(request)}`,
    { limit: 10, windowMs: 15 * 60 * 1000 },
  );
  if (!ipLimit.allowed) {
    return NextResponse.json(
      { success: false, code: 'RATE_LIMITED' },
      { status: 429, headers: { 'Retry-After': String(ipLimit.retryAfterSeconds) } },
    );
  }

  const parsed = await parseJsonRecord(request);
  if (parsed.error) return parsed.error;

  const email = normalizeEmail(parsed.data.email);

  if (!email) {
    return NextResponse.json({ success: true });
  }

  const emailLimit = await consumeDurableRateLimit(
    `password-reset-request:email:${email}`,
    { limit: 3, windowMs: 60 * 60 * 1000 },
  );
  if (!emailLimit.allowed) {
    return NextResponse.json(
      { success: false, code: 'RATE_LIMITED' },
      { status: 429, headers: { 'Retry-After': String(emailLimit.retryAfterSeconds) } },
    );
  }

  if (!isPasswordResetEmailConfigured()) {
    return NextResponse.json(
      { success: false, code: 'EMAIL_NOT_CONFIGURED' },
      { status: 503 }
    );
  }

  const system = await db.query.systems.findFirst({
    where: eq(systems.email, email),
    columns: { id: true },
  });

  if (system) {
    const rawToken = generatePasswordResetToken();
    const now = new Date();
    const resetTokenId = createId();
    const resetUrl = buildResetUrl(request, rawToken);

    await db.transaction(async (tx) => {
      await tx.update(passwordResetTokens)
        .set({ usedAt: now })
        .where(and(
          eq(passwordResetTokens.systemId, system.id),
          isNull(passwordResetTokens.usedAt)
        ));

      await tx.insert(passwordResetTokens).values({
        id: resetTokenId,
        systemId: system.id,
        tokenHash: hashPasswordResetToken(rawToken),
        expiresAt: getPasswordResetExpiry(now),
        createdAt: now,
      });
    });

    const delivery = await sendPasswordResetEmail({
      to: email,
      resetUrl,
    });

    if (!delivery.sent) {
      console.warn('Password reset email was not delivered.', {
        provider: delivery.provider,
        reason: delivery.reason.slice(0, 160),
        systemId: system.id,
      });

      return NextResponse.json({ success: true });
    }
  }

  return NextResponse.json({ success: true });
}
