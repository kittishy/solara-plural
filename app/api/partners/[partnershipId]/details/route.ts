import { eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { db } from '@/lib/db';
import { systemPartnerships } from '@/lib/db/schema';
import { err, ok, requireAuth } from '@/lib/api/helpers';
import { getPartnershipForSystem, parseOptionalDate } from '@/lib/partnerships';

type Params = { params: Promise<{ partnershipId: string }> };

export async function PATCH(request: Request, { params }: Params) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  const { partnershipId } = await params;
  const access = await getPartnershipForSystem(partnershipId, auth.systemId);
  if (!access) return err('Partnership not found.', 404);

  let body: any;
  try {
    body = await request.json();
  } catch {
    return err('Invalid JSON payload', 400);
  }

  const anniversaryDate = parseOptionalDate(body?.anniversaryDate);
  const partneredSince = parseOptionalDate(body?.partneredSince);

  const isSystemA = access.partnership.systemAId === auth.systemId;
  const ownNicknameField = isSystemA ? 'nicknameForB' : 'nicknameForA';

  const updates: Record<string, unknown> = {};
  if (typeof body?.relationshipLabel === 'string' || body?.relationshipLabel === null) {
    updates.relationshipLabel = body.relationshipLabel?.trim() || null;
  }
  if (anniversaryDate !== undefined) updates.anniversaryDate = anniversaryDate;
  if (partneredSince !== undefined) updates.partneredSince = partneredSince;
  if (typeof body?.howWeMet === 'string' || body?.howWeMet === null) {
    updates.howWeMet = body.howWeMet?.trim() || null;
  }
  if (typeof body?.nicknameForPartner === 'string' || body?.nicknameForPartner === null) {
    updates[ownNicknameField] = body.nicknameForPartner?.trim() || null;
  }
  if (typeof body?.checkinIntervalDays === 'number') {
    const days = Math.max(0, Math.floor(body.checkinIntervalDays));
    updates.checkinIntervalDays = days === 0 ? null : days;
  } else if (body?.checkinIntervalDays === null) {
    updates.checkinIntervalDays = null;
  }
  if (body?.recordCheckin === true) {
    updates.lastCheckinAt = new Date();
  }

  if (Object.keys(updates).length === 0) {
    return err('No valid fields to update.', 400);
  }

  const [updated] = await db
    .update(systemPartnerships)
    .set(updates)
    .where(eq(systemPartnerships.id, partnershipId))
    .returning();

  revalidatePath('/partners');
  revalidatePath(`/partners/${partnershipId}`);

  return ok(updated);
}
