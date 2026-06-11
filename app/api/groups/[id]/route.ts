import { db } from '@/lib/db';
import { memberGroups } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { requireAuth, ok, err, parseJsonRecord } from '@/lib/api/helpers';
import { revalidatePath } from 'next/cache';

type Params = { params: Promise<{ id: string }> };

// PUT /api/groups/[id] — update group name, color, description
export async function PUT(request: Request, { params }: Params) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  const { id } = await params;
  const parsed = await parseJsonRecord(request);
  if (parsed.error) return parsed.error;
  const body = parsed.data;

  const name = typeof body.name === 'string' ? body.name.trim() : '';
  if (!name) return err('name is required');

  const updated = await db.update(memberGroups)
    .set({
      name,
      color:       typeof body.color === 'string' ? body.color.trim() || null : null,
      description: typeof body.description === 'string' ? body.description.trim() || null : null,
    })
    .where(and(eq(memberGroups.id, id), eq(memberGroups.systemId, auth.systemId)))
    .returning();

  if (!updated.length) return err('Group not found', 404);
  revalidatePath('/members');
  revalidatePath('/settings/groups');
  return ok(updated[0]);
}

// DELETE /api/groups/[id] — delete a group (members stay, only the group is removed)
export async function DELETE(_req: Request, { params }: Params) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  const { id } = await params;
  const deleted = await db.delete(memberGroups)
    .where(and(eq(memberGroups.id, id), eq(memberGroups.systemId, auth.systemId)))
    .returning();

  if (!deleted.length) return err('Group not found', 404);
  revalidatePath('/members');
  revalidatePath('/settings/groups');
  return ok({ deleted: true });
}
