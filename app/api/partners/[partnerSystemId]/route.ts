import { and, eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { db } from '@/lib/db';
import { systemPartnerships } from '@/lib/db/schema';
import { err, ok, requireAuth } from '@/lib/api/helpers';
import { canonicalFriendPair } from '@/lib/friends';

type Params = { params: Promise<{ partnerSystemId: string }> };

// DELETE /api/partners/[partnerSystemId]
// Ends a partnership. The underlying friendship is preserved.
export async function DELETE(_request: Request, { params }: Params) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  const { partnerSystemId } = await params;
  if (!partnerSystemId) return err('Partner system ID is required.', 400);
  if (partnerSystemId === auth.systemId) return err('Invalid request.', 400);

  const pair = canonicalFriendPair(auth.systemId, partnerSystemId);

  const deleted = await db
    .delete(systemPartnerships)
    .where(and(
      eq(systemPartnerships.systemAId, pair.systemAId),
      eq(systemPartnerships.systemBId, pair.systemBId),
    ))
    .returning({ id: systemPartnerships.id });

  if (!deleted.length) return err('Partnership not found.', 404);

  revalidatePath('/partners');

  return ok({ ended: true, partnerSystemId });
}

// PATCH /api/partners/[partnerSystemId]
// Body: { relationshipLabel?: string | null, partneredSince?: string | null }
export async function PATCH(request: Request, { params }: Params) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  const { partnerSystemId } = await params;

  let body: unknown;
  try { body = await request.json(); } catch { return err('Invalid request payload.', 400); }

  const payload = body as { relationshipLabel?: unknown; partneredSince?: unknown };

  const pair = canonicalFriendPair(auth.systemId, partnerSystemId);

  const partnership = await db.query.systemPartnerships.findFirst({
    where: and(
      eq(systemPartnerships.systemAId, pair.systemAId),
      eq(systemPartnerships.systemBId, pair.systemBId),
    ),
  });

  if (!partnership) return err('Partnership not found.', 404);

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
    .where(and(
      eq(systemPartnerships.systemAId, pair.systemAId),
      eq(systemPartnerships.systemBId, pair.systemBId),
    ));

  revalidatePath('/partners');

  return ok({ updated: true, ...updates });
}
