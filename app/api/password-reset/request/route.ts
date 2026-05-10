import { NextResponse } from 'next/server';
import { and, eq, isNull } from 'drizzle-orm';
import { createId } from '@paralleldrive/cuid2';
import { db } from '@/lib/db';
import { passwordResetTokens, systems } from '@/lib/db/schema';
import { isPasswordResetEmailConfigured, sendPasswordResetEmail } from '@/lib/auth/password-reset-email';
import {
  generatePasswordResetToken,
  getPasswordResetExpiry,
  hashPasswordResetToken,
  normalizeEmail,
} from '@/lib/auth/password-reset';

function buildResetUrl(request: Request, token: string): string {
  const url = new URL('/reset-password', process.env.NEXTAUTH_URL ?? request.url);
  url.searchParams.set('token', token);
  return url.toString();
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const email = normalizeEmail(body && typeof body === 'object' ? (body as { email?: unknown }).email : null);

  if (!email) {
    return NextResponse.json({ success: true });
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
        reason: delivery.reason,
        systemId: system.id,
      });

      return NextResponse.json(
        { success: false, code: 'EMAIL_SEND_FAILED' },
        { status: 502 }
      );
    }
  }

  return NextResponse.json({ success: true });
}
