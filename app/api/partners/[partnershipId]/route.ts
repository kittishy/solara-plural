import { eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { db } from '@/lib/db';
import { systemPartnerships, systems } from '@/lib/db/schema';
import { err, ok, parseJsonRecord, requireAuth } from '@/lib/api/helpers';
import { getPartnershipForSystem } from '@/lib/partnerships';

type Params = { params: Promise<{ partnershipId: string }> };

// GET /api/partners/[partnershipId]
export async function GET(_request: Request, { params }: Params) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  const { partnershipId } = await params;
  if (!partnershipId) return err('Partnership ID is required.', 400);

  const access = await getPartnershipForSystem(partnershipId, auth.systemId);
  if (!access) return err('Partnership not found.', 404);

  const { partnership, partnerSystemId } = access;

  const partnerSystem = await db.query.systems.findFirst({
    columns: { id: true, name: true, description: true, accountType: true, avatarMode: true, avatarEmoji: true, avatarUrl: true },
    where: eq(systems.id, partnerSystemId),
  });

  if (!partnerSystem) return err('Partner system not found.', 404);

  const isSystemA = partnership.systemAId === auth.systemId;

  return ok({
    partnershipId: partnership.id,
    relationshipLabel: partnership.relationshipLabel,
    partneredSince: partnership.partneredSince,
    anniversaryDate: partnership.anniversaryDate,
    howWeMet: partnership.howWeMet,
    nicknameForPartner: isSystemA ? partnership.nicknameForB : partnership.nicknameForA,
    checkinIntervalDays: partnership.checkinIntervalDays,
    lastCheckinAt: partnership.lastCheckinAt,
    createdAt: partnership.createdAt,
    other: {
      id: partnerSystem.id,
      name: partnerSystem.name,
      description: partnerSystem.description,
      accountType: partnerSystem.accountType,
      avatarMode: partnerSystem.avatarMode,
      avatarEmoji: partnerSystem.avatarEmoji,
      avatarUrl: partnerSystem.avatarUrl,
    },
  });
}

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
