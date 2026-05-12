import { eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { db } from '@/lib/db';
import { systemPartnerships } from '@/lib/db/schema';
import { err, ok, parseJsonRecord, requireAuth } from '@/lib/api/helpers';
import { getPartnershipForSystem } from '@/lib/partnerships';

type Params = { params: Promise<{ partnershipId: string }> };

// DELETE /api/partners/[partnershipId]
// Ends a partnership. The underlying friendship is preserved.
export async function DELETE(_request: Request, { params }: Params) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  const { partnershipId } = await params;
  if (!partnershipId) return err('Partnership ID is required.', 400);

  const access = await getPartnershipForSystem(partnershipId, auth.systemId);
  if (!access) return err('Partnership not found.', 404);

  const deleted = await db
    .delete(systemPartnerships)
    .where(eq(systemPartnerships.id, partnershipId))
    .returning({ id: systemPartnerships.id });

  if (!deleted.length) return err('Partnership not found.', 404);

  revalidatePath('/partners');

  return ok({ ended: true, partnerSystemId: access.partnerSystemId });
}

// PATCH /api/partners/[partnershipId]
// Body: { relationshipLabel?: string | null, partneredSince?: string | null }
export async function PATCH(request: Request, { params }: Params) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  const { partnershipId } = await params;
  if (!partnershipId) return err('Partnership ID is required.', 400);

  const parsed = await parseJsonRecord(request);
  if (parsed.error) return parsed.error;

  const payload = parsed.data;

  const access = await getPartnershipForSystem(partnershipId, auth.systemId);
  if (!access) return err('Partnership not found.', 404);

  const updates: Partial<{ relationshipLabel: string | null; partneredSince: Date | null }> = {};

  if ('relationshipLabel' in payload) {
    const label = payload.relationshipLabel;
    updates.relationshipLabel = typeof label === 'string' ? label.trim().slice(0, 60) || null : null;
  }

  if ('partneredSince' in payload) {
    const raw = payload.partneredSince;
    if (raw === null || raw === '') {
      updates.partneredSince = null;
    } else if (typeof raw === 'string') {
      const date = new Date(raw);
      updates.partneredSince = isNaN(date.getTime()) ? null : date;
    }
  }

  if (Object.keys(updates).length === 0) return err('No valid fields to update.', 400);

  await db.update(systemPartnerships)
    .set(updates)
    .where(eq(systemPartnerships.id, partnershipId));

  revalidatePath('/partners');

  return ok({ updated: true, ...updates });
}
