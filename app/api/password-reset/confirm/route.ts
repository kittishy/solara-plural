import { NextResponse } from 'next/server';
import { and, eq, gt, isNull } from 'drizzle-orm';
import bcrypt from 'bcryptjs';
import { db } from '@/lib/db';
import { passwordResetTokens, systems } from '@/lib/db/schema';
import {
  hashPasswordResetToken,
  isPasswordStrongEnough,
} from '@/lib/auth/password-reset';

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const token = body && typeof body === 'object' ? (body as { token?: unknown }).token : null;
  const password = body && typeof body === 'object' ? (body as { password?: unknown }).password : null;

  if (typeof token !== 'string' || token.length < 32) {
    return NextResponse.json({ success: false, code: 'INVALID_TOKEN' }, { status: 400 });
  }

  if (!isPasswordStrongEnough(password)) {
    return NextResponse.json({ success: false, code: 'WEAK_PASSWORD' }, { status: 400 });
  }

  const now = new Date();
  const tokenHash = hashPasswordResetToken(token);
  const resetToken = await db.query.passwordResetTokens.findFirst({
    where: and(
      eq(passwordResetTokens.tokenHash, tokenHash),
      isNull(passwordResetTokens.usedAt),
      gt(passwordResetTokens.expiresAt, now)
    ),
  });

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
