import { and, eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { db } from '@/lib/db';
import { partnershipBucketItems } from '@/lib/db/schema';
import { err, ok, requireAuth } from '@/lib/api/helpers';
import { getPartnershipForSystem } from '@/lib/partnerships';

type Params = { params: Promise<{ partnershipId: string; itemId: string }> };

export async function PATCH(request: Request, { params }: Params) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;
  const { partnershipId, itemId } = await params;
  const access = await getPartnershipForSystem(partnershipId, auth.systemId);
  if (!access) return err('Partnership not found.', 404);

  let body: any;
  try { body = await request.json(); } catch { return err('Invalid JSON payload', 400); }

  const updates: Record<string, unknown> = { updatedAt: new Date() };
  if (typeof body?.title === 'string') updates.title = body.title.trim();
  if (typeof body?.note === 'string' || body?.note === null) updates.note = body.note?.trim() || null;
  if (typeof body?.category === 'string' || body?.category === null) updates.category = body.category?.trim() || null;
  if (typeof body?.completed === 'boolean') {
    updates.completedAt = body.completed ? new Date() : null;
  }

  const [updated] = await db.update(partnershipBucketItems)
    .set(updates)
    .where(and(
      eq(partnershipBucketItems.id, itemId),
      eq(partnershipBucketItems.partnershipId, partnershipId),
    ))
    .returning();

  if (!updated) return err('Item not found.', 404);
  revalidatePath(`/partners/${partnershipId}`);
  return ok(updated);
}

export async function DELETE(_req: Request, { params }: Params) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;
  const { partnershipId, itemId } = await params;
  const access = await getPartnershipForSystem(partnershipId, auth.systemId);
  if (!access) return err('Partnership not found.', 404);

  const deleted = await db.delete(partnershipBucketItems)
    .where(and(
      eq(partnershipBucketItems.id, itemId),
      eq(partnershipBucketItems.partnershipId, partnershipId),
    ))
    .returning();

  if (!deleted.length) return err('Item not found.', 404);
  revalidatePath(`/partners/${partnershipId}`);
  return ok({ deleted: true });
}
