import { db } from '@/lib/db';
import { systems } from '@/lib/db/schema';
import { requireAuth, err, ok } from '@/lib/api/helpers';
import { createDeletionWindow } from '@/lib/account-deletion';
import { eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';

type DeletionBody = {
  confirmEmail?: unknown;
  acknowledgeRecoveryWindow?: unknown;
};

function normalizeEmail(value: unknown): string {
  return typeof value === 'string' ? value.trim().toLowerCase() : '';
}

// DELETE /api/account/deletion
// Schedules deletion with a 72-hour recovery window. It does not immediately remove data.
export async function DELETE(request: Request) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  let body: DeletionBody;
  try {
    body = await request.json();
  } catch {
    return err('Invalid JSON payload.', 400);
  }

  const system = await db.query.systems.findFirst({
    columns: {
      id: true,
      email: true,
      deletionRequestedAt: true,
      deletionScheduledFor: true,
    },
    where: eq(systems.id, auth.systemId),
  });

  if (!system) return err('Account not found.', 404);

  if (system.deletionRequestedAt && system.deletionScheduledFor) {
    return ok({
      deletionRequestedAt: system.deletionRequestedAt,
      deletionScheduledFor: system.deletionScheduledFor,
      alreadyScheduled: true,
    });
  }

  if (normalizeEmail(body.confirmEmail) !== system.email.toLowerCase()) {
    return err('Type your account email to confirm deletion scheduling.', 400);
  }

  if (body.acknowledgeRecoveryWindow !== true) {
    return err('Please acknowledge the 72-hour recovery window before scheduling deletion.', 400);
  }

  const window = createDeletionWindow();
  const updated = await db
    .update(systems)
    .set({
      deletionRequestedAt: window.requestedAt,
      deletionScheduledFor: window.scheduledFor,
      updatedAt: new Date(),
    })
    .where(eq(systems.id, auth.systemId))
    .returning({
      deletionRequestedAt: systems.deletionRequestedAt,
      deletionScheduledFor: systems.deletionScheduledFor,
    });

  revalidatePath('/settings');

  return ok(updated[0]);
}

// POST /api/account/deletion
// Cancels a scheduled deletion inside the recovery window.
export async function POST() {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  const updated = await db
    .update(systems)
    .set({
      deletionRequestedAt: null,
      deletionScheduledFor: null,
      updatedAt: new Date(),
    })
    .where(eq(systems.id, auth.systemId))
    .returning({
      id: systems.id,
      deletionRequestedAt: systems.deletionRequestedAt,
      deletionScheduledFor: systems.deletionScheduledFor,
    });

  if (!updated.length) return err('Account not found.', 404);

  revalidatePath('/settings');
  return ok(updated[0]);
}