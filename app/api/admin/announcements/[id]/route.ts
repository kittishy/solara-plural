import { db } from '@/lib/db';
import { adminAnnouncements } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { ok, err, parseJsonRecord } from '@/lib/api/helpers';
import { requireAdminApi } from '@/lib/auth/admin';
import { recordAudit } from '@/lib/admin/audit';

// PATCH /api/admin/announcements/[id] — toggle active state.
export async function PATCH(
  request: Request,
  { params }: { params: { id: string } },
) {
  const gate = await requireAdminApi();
  if (gate.error) return gate.error;

  const parsed = await parseJsonRecord(request);
  if (parsed.error) return parsed.error;
  const body = parsed.data;

  if (typeof body.active !== 'boolean') return err('active (boolean) is required');

  const existing = await db.query.adminAnnouncements.findFirst({
    where: eq(adminAnnouncements.id, params.id),
    columns: { id: true },
  });
  if (!existing) return err('Announcement not found', 404);

  await db
    .update(adminAnnouncements)
    .set({ active: body.active ? 1 : 0, updatedAt: new Date() })
    .where(eq(adminAnnouncements.id, params.id));

  await recordAudit({
    actorSystemId: gate.admin.systemId,
    actorEmail: gate.admin.email,
    action: 'announcement.update',
    targetType: 'announcement',
    targetId: params.id,
    metadata: { active: body.active },
  });

  return ok({ id: params.id, active: body.active });
}

// DELETE /api/admin/announcements/[id]
export async function DELETE(
  _request: Request,
  { params }: { params: { id: string } },
) {
  const gate = await requireAdminApi();
  if (gate.error) return gate.error;

  await db.delete(adminAnnouncements).where(eq(adminAnnouncements.id, params.id));

  await recordAudit({
    actorSystemId: gate.admin.systemId,
    actorEmail: gate.admin.email,
    action: 'announcement.delete',
    targetType: 'announcement',
    targetId: params.id,
  });

  return ok({ id: params.id, deleted: true });
}
