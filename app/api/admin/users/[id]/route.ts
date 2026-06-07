import { db } from '@/lib/db';
import {
  systems,
  members,
  systemNotes,
  systemJournal,
  frontEntries,
} from '@/lib/db/schema';
import { count, eq } from 'drizzle-orm';
import { ok, err, parseJsonRecord } from '@/lib/api/helpers';
import { requireAdminApi, isAdminEmail } from '@/lib/auth/admin';
import { recordAudit } from '@/lib/admin/audit';

// GET /api/admin/users/[id] — full account detail with content counts.
export async function GET(
  _request: Request,
  { params }: { params: { id: string } },
) {
  const gate = await requireAdminApi();
  if (gate.error) return gate.error;

  const account = await db.query.systems.findFirst({
    where: eq(systems.id, params.id),
    columns: {
      id: true,
      name: true,
      email: true,
      description: true,
      accountType: true,
      isAdmin: true,
      suspendedAt: true,
      suspendedReason: true,
      deletionRequestedAt: true,
      deletionScheduledFor: true,
      createdAt: true,
      updatedAt: true,
    },
  });
  if (!account) return err('Account not found', 404);

  const [memberCount, noteCount, journalCount, frontCount] = await Promise.all([
    db.select({ value: count() }).from(members).where(eq(members.systemId, params.id)),
    db.select({ value: count() }).from(systemNotes).where(eq(systemNotes.systemId, params.id)),
    db.select({ value: count() }).from(systemJournal).where(eq(systemJournal.systemId, params.id)),
    db.select({ value: count() }).from(frontEntries).where(eq(frontEntries.systemId, params.id)),
  ]);

  return ok({
    ...account,
    counts: {
      members: memberCount[0]?.value ?? 0,
      notes: noteCount[0]?.value ?? 0,
      journal: journalCount[0]?.value ?? 0,
      fronts: frontCount[0]?.value ?? 0,
    },
  });
}

// PATCH /api/admin/users/[id] — suspend/unsuspend or toggle admin.
export async function PATCH(
  request: Request,
  { params }: { params: { id: string } },
) {
  const gate = await requireAdminApi();
  if (gate.error) return gate.error;

  const parsed = await parseJsonRecord(request);
  if (parsed.error) return parsed.error;
  const body = parsed.data;

  const account = await db.query.systems.findFirst({
    where: eq(systems.id, params.id),
    columns: { id: true, email: true, isAdmin: true, suspendedAt: true },
  });
  if (!account) return err('Account not found', 404);

  const updates: Partial<typeof systems.$inferInsert> = { updatedAt: new Date() };
  const audited: Record<string, unknown> = {};

  if (typeof body.suspended === 'boolean') {
    if (body.suspended) {
      if (account.id === gate.admin.systemId) return err('You cannot suspend your own account', 400);
      updates.suspendedAt = new Date();
      updates.suspendedReason =
        typeof body.reason === 'string' && body.reason.trim() ? body.reason.trim() : 'Suspenso pelo administrador';
      audited.suspended = true;
      audited.reason = updates.suspendedReason;
    } else {
      updates.suspendedAt = null;
      updates.suspendedReason = null;
      audited.suspended = false;
    }
  }

  if (typeof body.isAdmin === 'boolean') {
    // The env allowlist always wins; refuse to demote a bootstrap admin so the
    // owner can never lock themselves out of their own panel.
    if (!body.isAdmin && isAdminEmail(account.email)) {
      return err('This account is in the ADMIN_EMAILS allowlist and cannot be demoted here', 400);
    }
    if (!body.isAdmin && account.id === gate.admin.systemId) {
      return err('You cannot remove your own admin access', 400);
    }
    updates.isAdmin = body.isAdmin ? 1 : 0;
    audited.isAdmin = body.isAdmin;
  }

  if (Object.keys(audited).length === 0) return err('No supported fields to update', 400);

  await db.update(systems).set(updates).where(eq(systems.id, params.id));

  await recordAudit({
    actorSystemId: gate.admin.systemId,
    actorEmail: gate.admin.email,
    action: 'user.update',
    targetType: 'system',
    targetId: params.id,
    metadata: audited,
  });

  return ok({ id: params.id, ...audited });
}

// DELETE /api/admin/users/[id] — hard-delete an account (cascades via FKs).
export async function DELETE(
  _request: Request,
  { params }: { params: { id: string } },
) {
  const gate = await requireAdminApi();
  if (gate.error) return gate.error;

  if (params.id === gate.admin.systemId) {
    return err('You cannot delete your own account from the admin panel', 400);
  }

  const account = await db.query.systems.findFirst({
    where: eq(systems.id, params.id),
    columns: { id: true, email: true, name: true },
  });
  if (!account) return err('Account not found', 404);

  if (isAdminEmail(account.email)) {
    return err('This account is in the ADMIN_EMAILS allowlist and cannot be deleted here', 400);
  }

  await db.delete(systems).where(eq(systems.id, params.id));

  await recordAudit({
    actorSystemId: gate.admin.systemId,
    actorEmail: gate.admin.email,
    action: 'user.delete',
    targetType: 'system',
    targetId: params.id,
    metadata: { email: account.email, name: account.name },
  });

  return ok({ id: params.id, deleted: true });
}
