import { db } from '@/lib/db';
import { systems, passwordResetTokens } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { createId } from '@paralleldrive/cuid2';
import { ok, err } from '@/lib/api/helpers';
import { requireAdminApi } from '@/lib/auth/admin';
import { recordAudit } from '@/lib/admin/audit';
import {
  generatePasswordResetToken,
  hashPasswordResetToken,
  getPasswordResetExpiry,
} from '@/lib/auth/password-reset';

// POST /api/admin/users/[id]/reset-password
// Issues a one-time password reset token the admin can hand to the user. The
// raw token is returned exactly once and only its hash is persisted.
export async function POST(
  _request: Request,
  { params }: { params: { id: string } },
) {
  const gate = await requireAdminApi();
  if (gate.error) return gate.error;

  const account = await db.query.systems.findFirst({
    where: eq(systems.id, params.id),
    columns: { id: true, email: true },
  });
  if (!account) return err('Account not found', 404);

  const rawToken = generatePasswordResetToken();
  const now = new Date();

  await db.insert(passwordResetTokens).values({
    id: createId(),
    systemId: account.id,
    tokenHash: hashPasswordResetToken(rawToken),
    expiresAt: getPasswordResetExpiry(now),
    createdAt: now,
  });

  await recordAudit({
    actorSystemId: gate.admin.systemId,
    actorEmail: gate.admin.email,
    action: 'user.reset_password',
    targetType: 'system',
    targetId: account.id,
    metadata: { email: account.email },
  });

  return ok({
    token: rawToken,
    resetPath: `/reset-password?token=${encodeURIComponent(rawToken)}`,
    expiresAt: getPasswordResetExpiry(now).toISOString(),
  });
}
