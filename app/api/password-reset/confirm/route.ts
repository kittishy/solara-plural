import { NextResponse } from 'next/server';
import { and, eq, gt, isNull } from 'drizzle-orm';
import bcrypt from 'bcryptjs';
import { db } from '@/lib/db';
import { passwordResetTokens, systems } from '@/lib/db/schema';
import { parseJsonRecord } from '@/lib/api/helpers';
import {
  hashPasswordResetToken,
  isPasswordStrongEnough,
} from '@/lib/auth/password-reset';
import { consumeDurableRateLimit, getClientIp } from '@/lib/rate-limit';

export async function POST(request: Request) {
  const ipLimit = await consumeDurableRateLimit(
    `password-reset-confirm:ip:${getClientIp(request)}`,
    { limit: 20, windowMs: 15 * 60 * 1000 },
  );
  if (!ipLimit.allowed) {
    return NextResponse.json(
      { success: false, code: 'RATE_LIMITED' },
      { status: 429, headers: { 'Retry-After': String(ipLimit.retryAfterSeconds) } },
    );
  }

  const parsed = await parseJsonRecord(request);
  if (parsed.error) return parsed.error;

  const token = parsed.data.token;
  const password = parsed.data.password;

  if (typeof token !== 'string' || token.length < 32) {
    return NextResponse.json({ success: false, code: 'INVALID_TOKEN' }, { status: 400 });
  }

  if (!isPasswordStrongEnough(password)) {
    return NextResponse.json({ success: false, code: 'WEAK_PASSWORD' }, { status: 400 });
  }

  const now = new Date();
  const tokenHash = hashPasswordResetToken(token);
  const tokenLimit = await consumeDurableRateLimit(
    `password-reset-confirm:token:${tokenHash}`,
    { limit: 5, windowMs: 15 * 60 * 1000 },
  );
  if (!tokenLimit.allowed) {
    return NextResponse.json(
      { success: false, code: 'RATE_LIMITED' },
      { status: 429, headers: { 'Retry-After': String(tokenLimit.retryAfterSeconds) } },
    );
  }

  const [resetToken] = await db.update(passwordResetTokens)
    .set({ usedAt: now })
    .where(and(
      eq(passwordResetTokens.tokenHash, tokenHash),
      isNull(passwordResetTokens.usedAt),
      gt(passwordResetTokens.expiresAt, now)
    ))
    .returning();

  if (!resetToken) {
    return NextResponse.json({ success: false, code: 'INVALID_TOKEN' }, { status: 400 });
  }

  const passwordHash = await bcrypt.hash(password, 12);

  await db.transaction(async (tx) => {
    await tx.update(systems)
      .set({ passwordHash, updatedAt: now })
      .where(eq(systems.id, resetToken.systemId));

    await tx.update(passwordResetTokens)
      .set({ usedAt: now })
      .where(and(
        eq(passwordResetTokens.systemId, resetToken.systemId),
        isNull(passwordResetTokens.usedAt)
      ));
  });

  return NextResponse.json({ success: true });
}
